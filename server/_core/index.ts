import "./crypto-polyfill";
import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { emailAuthRouter } from "./auth-email";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { expireTimedOutBatches } from "../credits";
import { retryPendingPayments } from "../paymentProcessor";
import { storagePut } from "../storage";
import { registerStripeRoutes } from "../stripe";
import { sdk } from "./sdk";

// In-memory rate limit for anonymous uploads (10 per IP per hour)
const anonUploadLimit = new Map<string, { count: number; resetAt: number }>();

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function runStartupMigrations() {
  try {
    const { getDb } = await import("../db");
    const db = await getDb();
    if (!db) return;

    // Ensure blockedDays table exists (migration 0007)
    const createBlockedDaysSQL = [
      "CREATE TABLE IF NOT EXISTS `blockedDays` (",
      "  `id` int AUTO_INCREMENT NOT NULL,",
      "  `professionalId` int NOT NULL,",
      "  `blockedDate` varchar(10) NOT NULL,",
      "  `reason` varchar(255),",
      "  `createdAt` timestamp NOT NULL DEFAULT (now()),",
      "  CONSTRAINT `blockedDays_id` PRIMARY KEY(`id`)",
      ")",
    ].join(" ");
    await db.execute(createBlockedDaysSQL);
    console.log("[Migration] blockedDays table ready");

    // Ensure users table has all required columns
    // Use INFORMATION_SCHEMA to check before adding (MySQL 5.x doesn't support IF NOT EXISTS)
    const columnsToAdd: Array<{ name: string; definition: string }> = [
      { name: "loginMethod", definition: "varchar(64) NULL" },
      { name: "phone",       definition: "varchar(20) NULL" },
      { name: "profileImage",definition: "text NULL" },
      { name: "bio",         definition: "longtext NULL" },
    ];

    // Get database name from connection
    const [dbNameRows] = await db.execute("SELECT DATABASE() as dbName") as any;
    const dbName = Array.isArray(dbNameRows) ? dbNameRows[0]?.dbName : dbNameRows?.dbName;

    for (const col of columnsToAdd) {
      try {
        const checkSQL = `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '${dbName}' AND TABLE_NAME = 'users' AND COLUMN_NAME = '${col.name}'`;
        const [rows] = await db.execute(checkSQL) as any;
        const count = Array.isArray(rows) ? rows[0]?.cnt : rows?.cnt;
        if (!count || Number(count) === 0) {
          await db.execute(`ALTER TABLE \`users\` ADD COLUMN \`${col.name}\` ${col.definition}`);
          console.log(`[Migration] Added column users.${col.name}`);
        }
      } catch (colErr: any) {
        console.warn(`[Migration] Could not add column ${col.name}:`, colErr?.message);
      }
    }

    // Ensure role column exists with correct enum
    try {
      const checkRoleSQL = `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '${dbName}' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'`;
      const [roleRows] = await db.execute(checkRoleSQL) as any;
      const roleCount = Array.isArray(roleRows) ? roleRows[0]?.cnt : roleRows?.cnt;
      if (!roleCount || Number(roleCount) === 0) {
        await db.execute("ALTER TABLE `users` ADD COLUMN `role` enum('user','professional','admin') NOT NULL DEFAULT 'user'");
        console.log("[Migration] Added column users.role");
      }
    } catch (roleErr: any) {
      console.warn("[Migration] Could not add role column:", roleErr?.message);
    }

    console.log("[Migration] users table columns ready");

    // Ensure payments table exists
    await db.execute([
      "CREATE TABLE IF NOT EXISTS `payments` (",
      "  `id` int AUTO_INCREMENT NOT NULL,",
      "  `userId` int NOT NULL,",
      "  `stripePaymentId` varchar(255) NOT NULL,",
      "  `amount` decimal(10,2) NOT NULL,",
      "  `currency` varchar(3) DEFAULT 'MXN',",
      "  `status` enum('pending','succeeded','failed','canceled') DEFAULT 'pending',",
      "  `paymentType` enum('subscription','appointment') NOT NULL,",
      "  `appointmentId` int,",
      "  `subscriptionId` int,",
      "  `createdAt` timestamp NOT NULL DEFAULT (now()),",
      "  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,",
      "  CONSTRAINT `payments_id` PRIMARY KEY(`id`),",
      "  UNIQUE KEY `payments_stripePaymentId_unique` (`stripePaymentId`)",
      ")",
    ].join(" "));
    console.log("[Migration] payments table ready");

    // FIX 1: Ensure subscriptionId column exists (tables created before this column was added)
    try {
      const [cols] = await db.execute(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'payments' AND COLUMN_NAME = 'subscriptionId'"
      ) as any;
      const exists = Array.isArray(cols) ? cols.length > 0 : false;
      if (!exists) {
        await db.execute("ALTER TABLE `payments` ADD COLUMN `subscriptionId` int");
        console.log("[Migration] payments.subscriptionId column added");
      } else {
        console.log("[Migration] payments.subscriptionId column already exists");
      }
    } catch (colErr: any) {
      console.warn("[Migration] Could not add subscriptionId column:", colErr?.message);
    }

    // Ensure creditBatches table exists
    await db.execute([
      "CREATE TABLE IF NOT EXISTS `creditBatches` (",
      "  `id` int AUTO_INCREMENT NOT NULL,",
      "  `userId` int NOT NULL,",
      "  `amount` int NOT NULL,",
      "  `remaining` int NOT NULL,",
      "  `source` enum('plan_basic','plan_pro','individual_basic','individual_premium') NOT NULL,",
      "  `expiresAt` timestamp NOT NULL,",
      "  `expiredEarly` tinyint(1) DEFAULT 0,",
      "  `createdAt` timestamp NOT NULL DEFAULT (now()),",
      "  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,",
      "  CONSTRAINT `creditBatches_id` PRIMARY KEY(`id`)",
      ")",
    ].join(" "));
    console.log("[Migration] creditBatches table ready");

    // Ensure creditTransactions table exists
    await db.execute([
      "CREATE TABLE IF NOT EXISTS `creditTransactions` (",
      "  `id` int AUTO_INCREMENT NOT NULL,",
      "  `userId` int NOT NULL,",
      "  `batchId` int,",
      "  `delta` int NOT NULL,",
      "  `reason` enum('purchase','consume','expire','refund') NOT NULL,",
      "  `appointmentId` int,",
      "  `description` varchar(255),",
      "  `createdAt` timestamp NOT NULL DEFAULT (now()),",
      "  CONSTRAINT `creditTransactions_id` PRIMARY KEY(`id`)",
      ")",
    ].join(" "));
    console.log("[Migration] creditTransactions table ready");

    // Ensure paymentQueue table exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`paymentQueue\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`stripeSessionId\` varchar(255) NOT NULL,
        \`userId\` int NOT NULL,
        \`productType\` varchar(64) NOT NULL,
        \`credits\` int NOT NULL,
        \`amount\` decimal(10,2) NOT NULL,
        \`currency\` varchar(3) DEFAULT 'MXN',
        \`status\` enum('pending','processing','completed','failed') DEFAULT 'pending',
        \`attempts\` int DEFAULT 0,
        \`lastError\` text,
        \`processedAt\` timestamp NULL,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`paymentQueue_stripeSessionId_unique\` (\`stripeSessionId\`)
      )
    `);
    console.log("[Migration] paymentQueue table ready");

    // Ensure professionals.tier column exists
    try {
      const [tierCols] = await db.execute(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'professionals' AND COLUMN_NAME = 'tier'"
      ) as any;
      const tierExists = Array.isArray(tierCols) ? tierCols.length > 0 : false;
      if (!tierExists) {
        await db.execute("ALTER TABLE `professionals` ADD COLUMN `tier` ENUM('basic','pro') NOT NULL DEFAULT 'basic'");
        console.log("[Migration] professionals.tier column added");
      } else {
        console.log("[Migration] professionals.tier column already exists");
      }
    } catch (colErr: any) {
      console.warn("[Migration] Could not add tier column:", colErr?.message);
    }

    // Ensure professionals.identityDocUrl and documentNationality columns exist
    for (const col of [
      { name: "identityDocUrl",      definition: "TEXT NULL" },
      { name: "documentNationality", definition: "VARCHAR(100) NULL" },
    ]) {
      try {
        const [cols] = await db.execute(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'professionals' AND COLUMN_NAME = '${col.name}'`
        ) as any;
        const exists = Array.isArray(cols) ? cols.length > 0 : false;
        if (!exists) {
          await db.execute(`ALTER TABLE \`professionals\` ADD COLUMN \`${col.name}\` ${col.definition}`);
          console.log(`[Migration] professionals.${col.name} column added`);
        } else {
          console.log(`[Migration] professionals.${col.name} column already exists`);
        }
      } catch (colErr: any) {
        console.warn(`[Migration] Could not add professionals.${col.name}:`, colErr?.message);
      }
    }

    // Ensure appointments.penaltyAmount and penaltyType columns exist
    await db.execute("ALTER TABLE `appointments` ADD COLUMN IF NOT EXISTS `penaltyAmount` int DEFAULT 0").catch(() => {});
    await db.execute("ALTER TABLE `appointments` ADD COLUMN IF NOT EXISTS `penaltyType` ENUM('none','partial','full','credits_lost')").catch(() => {});
    console.log("[Migration] appointments penalty columns ready");

    // Ensure professionalPenalties table exists
    await db.execute([
      "CREATE TABLE IF NOT EXISTS `professionalPenalties` (",
      "  `id` int AUTO_INCREMENT NOT NULL,",
      "  `professionalId` int NOT NULL,",
      "  `appointmentId` int,",
      "  `amount` int NOT NULL,",
      "  `penaltyType` enum('partial','full') NOT NULL,",
      "  `reason` varchar(255),",
      "  `status` enum('pending','collected','waived') NOT NULL DEFAULT 'pending',",
      "  `createdAt` timestamp NOT NULL DEFAULT (now()),",
      "  CONSTRAINT `professionalPenalties_id` PRIMARY KEY(`id`)",
      ")",
    ].join(" ")).catch(() => {});
    console.log("[Migration] professionalPenalties table ready");

    // Ensure professionalWallet table exists
    await db.execute([
      "CREATE TABLE IF NOT EXISTS `professionalWallet` (",
      "  `id` int AUTO_INCREMENT NOT NULL,",
      "  `professionalId` int NOT NULL,",
      "  `balance` decimal(10,2) NOT NULL DEFAULT 0,",
      "  `pendingWithdrawal` decimal(10,2) NOT NULL DEFAULT 0,",
      "  `totalEarned` decimal(10,2) NOT NULL DEFAULT 0,",
      "  `totalWithdrawn` decimal(10,2) NOT NULL DEFAULT 0,",
      "  `createdAt` timestamp NOT NULL DEFAULT (now()),",
      "  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,",
      "  CONSTRAINT `professionalWallet_id` PRIMARY KEY(`id`),",
      "  UNIQUE KEY `professionalWallet_professionalId_unique` (`professionalId`)",
      ")",
    ].join(" ")).catch(() => {});
    console.log("[Migration] professionalWallet table ready");

    // Ensure professionalEarnings table exists
    await db.execute([
      "CREATE TABLE IF NOT EXISTS `professionalEarnings` (",
      "  `id` int AUTO_INCREMENT NOT NULL,",
      "  `professionalId` int NOT NULL,",
      "  `appointmentId` int NOT NULL,",
      "  `grossAmount` decimal(10,2) NOT NULL,",
      "  `commissionRate` decimal(5,4) NOT NULL,",
      "  `commissionAmount` decimal(10,2) NOT NULL,",
      "  `netAmount` decimal(10,2) NOT NULL,",
      "  `status` enum('pending','credited','reversed') NOT NULL DEFAULT 'credited',",
      "  `createdAt` timestamp NOT NULL DEFAULT (now()),",
      "  CONSTRAINT `professionalEarnings_id` PRIMARY KEY(`id`),",
      "  UNIQUE KEY `professionalEarnings_appointmentId_unique` (`appointmentId`)",
      ")",
    ].join(" ")).catch(() => {});
    console.log("[Migration] professionalEarnings table ready");

    // Ensure withdrawalRequests table exists
    await db.execute([
      "CREATE TABLE IF NOT EXISTS `withdrawalRequests` (",
      "  `id` int AUTO_INCREMENT NOT NULL,",
      "  `professionalId` int NOT NULL,",
      "  `amount` decimal(10,2) NOT NULL,",
      "  `clabe` varchar(18) NOT NULL,",
      "  `status` enum('pending','approved','rejected','paid') NOT NULL DEFAULT 'pending',",
      "  `adminNotes` longtext,",
      "  `requestedAt` timestamp NOT NULL DEFAULT (now()),",
      "  `processedAt` timestamp NULL,",
      "  `createdAt` timestamp NOT NULL DEFAULT (now()),",
      "  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,",
      "  CONSTRAINT `withdrawalRequests_id` PRIMARY KEY(`id`)",
      ")",
    ].join(" ")).catch(() => {});
    console.log("[Migration] withdrawalRequests table ready");

    // Ensure withdrawalRequests has paymentMethod, paymentDetails, notes, paymentProof columns
    const wrExtraCols = [
      { name: "paymentMethod",  definition: "VARCHAR(50) NULL" },
      { name: "paymentDetails", definition: "TEXT NULL" },
      { name: "notes",          definition: "TEXT NULL" },
      { name: "paymentProof",   definition: "VARCHAR(1000) NULL DEFAULT NULL" },
    ];
    for (const col of wrExtraCols) {
      try {
        const [wrRows] = await db.execute(
          `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'withdrawalRequests' AND COLUMN_NAME = '${col.name}'`
        ) as any;
        const wrCnt = Array.isArray(wrRows) ? wrRows[0]?.cnt : wrRows?.cnt;
        if (!wrCnt || Number(wrCnt) === 0) {
          await db.execute(`ALTER TABLE \`withdrawalRequests\` ADD COLUMN \`${col.name}\` ${col.definition}`);
          console.log(`[Migration] withdrawalRequests.${col.name} added`);
        }
      } catch (e: any) {
        console.warn(`[Migration] Could not add withdrawalRequests.${col.name}:`, e?.message);
      }
    }

    // Make clabe nullable — originally created NOT NULL but only used for CLABE transfers
    try {
      await db.execute(
        `ALTER TABLE \`withdrawalRequests\` MODIFY COLUMN \`clabe\` VARCHAR(255) NULL DEFAULT NULL`
      );
      console.log("[Migration] withdrawalRequests.clabe now nullable");
    } catch (e: any) {
      console.log("[Migration] withdrawalRequests.clabe modify failed:", e.message);
    }

    // Ensure pending_review in appointments status enum
    await db.execute(
      "ALTER TABLE `appointments` MODIFY COLUMN `status` ENUM('scheduled','completed','canceled','no-show','pending_review') DEFAULT 'scheduled'"
    ).catch(() => {});
    console.log("[Migration] appointments pending_review status ready");

    // Ensure in_progress in appointments status enum
    await db.execute(
      "ALTER TABLE `appointments` MODIFY COLUMN `status` ENUM('scheduled','in_progress','completed','canceled','no-show','pending_review') DEFAULT 'scheduled'"
    ).catch(() => {});
    console.log("[Migration] appointments in_progress status ready");

    // Ensure 'late' in penaltyType enums
    await db.execute(
      "ALTER TABLE `appointments` MODIFY COLUMN `penaltyType` ENUM('none','partial','full','credits_lost','late')"
    ).catch(() => {});
    await db.execute(
      "ALTER TABLE `professionalPenalties` MODIFY COLUMN `penaltyType` ENUM('partial','full','late') NOT NULL"
    ).catch(() => {});
    console.log("[Migration] penaltyType enums updated with 'late'");

    // Ensure daily in appointments videoCallType enum
    await db.execute(
      "ALTER TABLE `appointments` MODIFY COLUMN `videoCallType` ENUM('zoom','google_meet','daily') NOT NULL DEFAULT 'daily'"
    ).catch(() => {});
    console.log("[Migration] appointments videoCallType daily ready");

    // Ensure notifications table exists
    await db.execute(`CREATE TABLE IF NOT EXISTS \`notifications\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`userId\` int NOT NULL,
      \`type\` varchar(64) NOT NULL DEFAULT 'info',
      \`title\` varchar(255) NOT NULL,
      \`message\` text NOT NULL,
      \`link\` varchar(512),
      \`isRead\` tinyint(1) NOT NULL DEFAULT 0,
      \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`notifications_userId_idx\` (\`userId\`)
    )`).catch(() => {});
    console.log("[Migration] notifications table ready");

    // Ensure notifications.link column exists
    try {
      await db.execute(
        `ALTER TABLE \`notifications\` ADD COLUMN \`link\` VARCHAR(500) NULL DEFAULT NULL`
      );
      console.log("[Migration] notifications.link column ready");
    } catch (e: any) {
      console.log("[Migration] notifications.link already exists:", e.message);
    }

    // Ensure notifications.audience column exists
    try {
      const [audCols] = await db.execute(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'audience'"
      ) as any;
      const audExists = Array.isArray(audCols) ? audCols.length > 0 : false;
      if (!audExists) {
        await db.execute(
          "ALTER TABLE `notifications` ADD COLUMN `audience` ENUM('user','professional','all') NOT NULL DEFAULT 'user'"
        );
        console.log("[Migration] notifications.audience column added");
      } else {
        console.log("[Migration] notifications.audience column already exists");
      }
    } catch (audErr: any) {
      console.warn("[Migration] Could not add notifications.audience column:", audErr?.message);
    }

    // ── Eliminar FK constraint incorrecto en professionalAvailability ──────────
    const client = (db as any).$client;
    await new Promise<void>((resolve) => {
      client.execute(
        "ALTER TABLE professionalAvailability DROP FOREIGN KEY professionalAvailability_professionalId_fk",
        [],
        (err: any) => {
          if (err) console.log("[Migration] professionalAvailability FK already removed or not exists:", err?.message);
          else console.log("[Migration] professionalAvailability FK constraint removed");
          resolve();
        }
      );
    });

    await new Promise<void>((resolve) => {
      client.execute(
        "ALTER TABLE appointments DROP FOREIGN KEY appointments_professionalId_fk",
        [],
        (err: any) => {
          if (err) console.log("[Migration] appointments FK already removed:", err?.message);
          else console.log("[Migration] appointments professionalId FK removed");
          resolve();
        }
      );
    });

    // ── Seed: ensure admin roles ──────────────────────────────────────────────
    try {
      await db.execute(
        "UPDATE `users` SET `role` = 'admin' WHERE `email` = 'marketingdedsm@gmail.com' AND `role` != 'admin'"
      );
      console.log("[Migration] Admin role ensured for marketingdedsm@gmail.com");
    } catch (adminErr: any) {
      console.warn("[Migration] Could not set admin role:", adminErr?.message);
    }
    try {
      await db.execute(
        "UPDATE `users` SET `role` = 'admin' WHERE `email` = 'Adm@inteira.mx' AND `role` != 'admin'"
      );
      console.log("[Migration] Admin role ensured for Adm@inteira.mx");
    } catch (adminErr: any) {
      console.warn("[Migration] Could not set admin role for Adm@inteira.mx:", adminErr?.message);
    }

    // Ensure specialties.icon column exists
    try {
      const [sIconCols] = await db.execute(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'specialties' AND COLUMN_NAME = 'icon'"
      ) as any;
      const sIconExists = Array.isArray(sIconCols) ? sIconCols.length > 0 : false;
      if (!sIconExists) {
        await db.execute("ALTER TABLE `specialties` ADD COLUMN `icon` VARCHAR(50) NULL DEFAULT NULL");
        console.log("[Migration] specialties.icon column added");
      }
    } catch (e: any) {
      console.warn("[Migration] Could not add specialties.icon column:", e?.message);
    }

    // Ensure specialties.imageUrl column exists
    try {
      const [sImgCols] = await db.execute(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'specialties' AND COLUMN_NAME = 'imageUrl'"
      ) as any;
      const sImgExists = Array.isArray(sImgCols) ? sImgCols.length > 0 : false;
      if (!sImgExists) {
        await db.execute("ALTER TABLE `specialties` ADD COLUMN `imageUrl` VARCHAR(500) NULL DEFAULT NULL");
        console.log("[Migration] specialties.imageUrl column added");
      } else {
        console.log("[Migration] specialties.imageUrl column already exists");
      }
    } catch (e: any) {
      console.warn("[Migration] Could not add specialties.imageUrl column:", e?.message);
    }

    // Ensure professionals.slug column exists and backfill existing rows
    try {
      const [pSlugCols] = await db.execute(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'professionals' AND COLUMN_NAME = 'slug'"
      ) as any;
      const pSlugExists = Array.isArray(pSlugCols) ? pSlugCols.length > 0 : false;
      if (!pSlugExists) {
        await db.execute("ALTER TABLE `professionals` ADD COLUMN `slug` VARCHAR(255) NULL UNIQUE");
        console.log("[Migration] professionals.slug column added");
      }
      const { slugifyName } = await import("../db");
      const noSlugRows = await new Promise<any[]>((resolve) => {
        client.execute(
          `SELECT p.id, u.name
           FROM professionals p
           LEFT JOIN users u ON p.userId = u.id
           WHERE p.slug IS NULL OR p.slug = ''`,
          [],
          (err: any, results: any) => {
            if (err) { console.error("[Migration] professionals slug select:", err?.message); resolve([]); }
            else resolve(Array.isArray(results) ? results : []);
          }
        );
      });
      if (noSlugRows.length > 0) {
        const usedSlugs = await new Promise<Set<string>>((resolve) => {
          client.execute(
            "SELECT slug FROM professionals WHERE slug IS NOT NULL AND slug != ''",
            [],
            (err: any, results: any) => {
              const rows = Array.isArray(results) ? results : [];
              resolve(new Set(rows.map((r: any) => r.slug as string).filter(Boolean)));
            }
          );
        });
        for (const row of noSlugRows) {
          const name = (row.name as string) || `profesional-${row.id}`;
          const base = slugifyName(name);
          let slug = base;
          let suffix = 1;
          while (usedSlugs.has(slug)) slug = `${base}-${++suffix}`;
          usedSlugs.add(slug);
          await new Promise<void>((resolve) => {
            client.execute(
              "UPDATE `professionals` SET `slug` = ? WHERE `id` = ?",
              [slug, row.id],
              (err: any) => {
                if (err) console.warn(`[Migration] professionals slug id=${row.id}:`, err?.message);
                else console.log(`[Migration] professionals.slug="${slug}" id=${row.id}`);
                resolve();
              }
            );
          });
        }
      } else {
        console.log("[Migration] professionals.slug: all rows already have slugs");
      }
    } catch (e: any) {
      console.warn("[Migration] Could not add/backfill professionals.slug:", e?.message);
    }

    // Ensure specialties.slug column exists and backfill existing rows
    try {
      const [sSlugCols] = await db.execute(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'specialties' AND COLUMN_NAME = 'slug'"
      ) as any;
      const sSlugExists = Array.isArray(sSlugCols) ? sSlugCols.length > 0 : false;
      if (!sSlugExists) {
        await db.execute("ALTER TABLE `specialties` ADD COLUMN `slug` VARCHAR(255) NULL UNIQUE");
        console.log("[Migration] specialties.slug column added");
      }
      // Backfill slugs for rows where slug IS NULL
      const { slugifyName } = await import("../db");
      const [noSlugRows] = await db.execute(
        "SELECT id, name FROM `specialties` WHERE `slug` IS NULL OR `slug` = ''"
      ) as any;
      const rows = Array.isArray(noSlugRows) ? noSlugRows : [];
      for (const row of rows) {
        const slug = slugifyName(row.name as string);
        await new Promise<void>((resolve) => {
          client.execute(
            "UPDATE `specialties` SET `slug` = ? WHERE `id` = ?",
            [slug, row.id],
            (err: any) => {
              if (err) console.warn(`[Migration] Could not set slug for specialty ${row.id}:`, err?.message);
              else console.log(`[Migration] specialties.slug set: "${slug}" for id=${row.id}`);
              resolve();
            }
          );
        });
      }
      if (rows.length === 0) console.log("[Migration] specialties.slug all rows already have slugs");
    } catch (e: any) {
      console.warn("[Migration] Could not add/backfill specialties.slug column:", e?.message);
    }

    // ── Seed: créditos de prueba a marketingdedsm — solo si NUNCA ha tenido un batch admin_grant ──
    try {
      const client = (db as any).$client;
      await new Promise<void>((resolve) => {
        client.execute(
          `INSERT INTO creditBatches (userId, amount, remaining, reservedAmount, source, expiresAt, createdAt, updatedAt)
           SELECT u.id, 2000, 2000, 0, 'admin_grant', DATE_ADD(NOW(), INTERVAL 60 DAY), NOW(), NOW()
           FROM users u
           WHERE u.email = 'marketingdedsm@gmail.com'
             AND NOT EXISTS (
               SELECT 1 FROM creditBatches cb WHERE cb.userId = u.id AND cb.source = 'admin_grant'
             )`,
          [],
          (err: any, result: any) => {
            if (err) console.warn("[Migration] seed credits marketingdedsm:", err?.message);
            else if (result?.affectedRows > 0) console.log("[Migration] 2000 créditos de prueba agregados a marketingdedsm");
            else console.log("[Migration] marketingdedsm ya tiene admin_grant, skipping");
            resolve();
          }
        );
      });
    } catch (e: any) {
      console.error("[Migration] Could not seed test credits:", e?.message);
    }

    // One-time backfill: credit professionals for no-show appointments that have no earning record
    try {
      const noShowUnpaid = await new Promise<any[]>((resolve) => {
        client.execute(
          `SELECT a.id, a.professionalId, a.durationMinutes, p.tier
           FROM appointments a
           JOIN professionals p ON p.id = a.professionalId
           WHERE a.status = 'no-show'
             AND NOT EXISTS (
               SELECT 1 FROM professionalEarnings pe WHERE pe.appointmentId = a.id
             )`,
          [],
          (err: any, results: any) => {
            if (err) { console.error("[Migration] noshow-backfill select:", err?.message); resolve([]); }
            else resolve(Array.isArray(results) ? results : []);
          }
        );
      });

      if (noShowUnpaid.length > 0) {
        console.log(`[Migration] Backfilling ${noShowUnpaid.length} unpaid no-show appointment(s)`);
        const { creditProfessionalEarning } = await import("../professionalWallet");
        for (const row of noShowUnpaid) {
          await creditProfessionalEarning(row.professionalId, row.id, (row.tier ?? "basic") as "basic" | "pro", row.durationMinutes > 60 ? "premium" : "basic")
            .catch((e: any) => console.error(`[Migration] backfill credit apt ${row.id}:`, e?.message));
          console.log(`[Migration] Backfilled earning for professional ${row.professionalId}, appointment ${row.id}`);
        }
      }
    } catch (e: any) {
      console.error("[Migration] noshow-backfill failed:", e?.message);
    }

    // Idempotent: ensure every professional has a professionalWallet row
    try {
      await new Promise<void>((resolve) => {
        client.execute(
          `INSERT IGNORE INTO professionalWallet (professionalId, balance, pendingWithdrawal, totalEarned, totalWithdrawn)
           SELECT id, 0, 0, 0, 0 FROM professionals
           WHERE id NOT IN (SELECT professionalId FROM professionalWallet)`,
          [],
          (err: any) => {
            if (err) console.error("[Migration] professionalWallet seed failed:", err?.message);
            resolve();
          }
        );
      });
    } catch (e: any) {
      console.error("[Migration] professionalWallet seed error:", e?.message);
    }

    // Drop FK reviews_professionalId_fk if it points to a non-existent table
    try {
      await new Promise<void>((resolve) => {
        client.execute(
          `ALTER TABLE reviews DROP FOREIGN KEY reviews_professionalId_fk`,
          [],
          (err: any) => {
            if (err) console.log("[Migration] reviews FK already removed or not exists:", err.message);
            else console.log("[Migration] reviews_professionalId_fk removed");
            resolve();
          }
        );
      });
    } catch (e) {}

    // Ensure reviews.appointmentId allows NULL and drop unique constraint (idempotent)
    await new Promise<void>((resolve) => {
      client.execute(
        "ALTER TABLE reviews MODIFY COLUMN appointmentId INT NULL",
        [],
        (err: any) => { if (err) console.error("[Migration] reviews appointmentId nullable:", err?.message); resolve(); }
      );
    });
    await new Promise<void>((resolve) => {
      client.execute(
        "ALTER TABLE reviews DROP INDEX reviews_appointmentId_unique",
        [],
        (err: any) => { if (err && !String(err).includes("check that column/key exists")) console.error("[Migration] reviews drop unique:", err?.message); resolve(); }
      );
    });

    // ── Credit reservation system ─────────────────────────────────────────────
    // Add reservedAmount column to creditBatches — use INFORMATION_SCHEMA (IF NOT EXISTS not supported on all TiDB versions)
    try {
      const [raRows] = await db.execute(
        `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'creditBatches' AND COLUMN_NAME = 'reservedAmount'`
      ) as any;
      const raExists = Array.isArray(raRows) ? Number(raRows[0]?.cnt) > 0 : Number(raRows?.cnt) > 0;
      if (!raExists) {
        await db.execute("ALTER TABLE `creditBatches` ADD COLUMN `reservedAmount` INT NOT NULL DEFAULT 0");
        console.log("[Migration] creditBatches.reservedAmount column added");
      } else {
        console.log("[Migration] creditBatches.reservedAmount column already exists");
      }
    } catch (e: any) {
      console.warn("[Migration] Could not add reservedAmount column:", e?.message);
    }

    // Expand creditTransactions reason enum to include reservation states
    await db.execute(
      "ALTER TABLE `creditTransactions` MODIFY COLUMN `reason` ENUM('purchase','consume','consumed','expire','refund','refunded','reserved') NOT NULL"
    ).catch(() => {});
    console.log("[Migration] creditTransactions reason enum expanded");

    // Sanitize any source values not in the new enum before modifying the column
    await db.execute(
      "UPDATE `creditBatches` SET `source` = 'purchase' WHERE `source` NOT IN ('purchase','plan','plan_basic','plan_pro','individual_basic','individual_premium','admin_grant','test_20','bonus','referral')"
    ).catch(() => {});

    // Expand creditBatches source enum to include admin_grant
    await db.execute(
      "ALTER TABLE `creditBatches` MODIFY COLUMN `source` ENUM('purchase','plan','plan_basic','plan_pro','individual_basic','individual_premium','admin_grant','test_20','bonus','referral') NOT NULL DEFAULT 'purchase'"
    ).catch(() => {});
    console.log("[Migration] creditBatches source enum expanded");

    // Add userId indexes for wallet query performance
    await db.execute(
      "CREATE INDEX IF NOT EXISTS `creditBatches_userId_idx` ON `creditBatches` (`userId`)"
    ).catch(() => {});
    await db.execute(
      "CREATE INDEX IF NOT EXISTS `creditTransactions_userId_idx` ON `creditTransactions` (`userId`)"
    ).catch(() => {});
    console.log("[Migration] creditBatches + creditTransactions userId indexes ready");

    // ── One-time fix: reset reservedAmount where it exceeds remaining (invalid state)
    await new Promise<void>((resolve) => {
      client.execute(
        "UPDATE creditBatches SET reservedAmount = 0 WHERE userId = 1 AND reservedAmount > remaining",
        [],
        (err: any) => {
          if (err) console.error("[Migration] reset invalid reservedAmount userId=1:", err?.message);
          else console.log("[Migration] invalid reservedAmount fixed for userId=1");
          resolve();
        }
      );
    });

    // ── One-time grant: add 2000 credits (60 days) to userId=1 if no active admin_grant exists ──
    await new Promise<void>((resolve) => {
      client.execute(
        `INSERT INTO creditBatches (userId, amount, remaining, reservedAmount, source, expiresAt, createdAt, updatedAt)
         SELECT 1, 2000, 2000, 0, 'admin_grant', DATE_ADD(NOW(), INTERVAL 60 DAY), NOW(), NOW()
         WHERE NOT EXISTS (
           SELECT 1 FROM creditBatches WHERE userId = 1 AND source = 'admin_grant'
         )`,
        [],
        (err: any, result: any) => {
          if (err) console.error("[Migration] admin grant insert:", err?.message);
          else if (result?.affectedRows > 0) console.log("[Migration] 2000 admin credits (60d) granted to userId=1");
          else console.log("[Migration] userId=1 already has an active admin_grant batch, skipping");
          resolve();
        }
      );
    });

    // Ensure discountCodes table exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`discountCodes\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`code\` VARCHAR(50) NOT NULL UNIQUE,
        \`type\` ENUM('percentage', 'fixed') NOT NULL,
        \`value\` DECIMAL(10,2) NOT NULL,
        \`maxUses\` INT NULL DEFAULT NULL,
        \`usedCount\` INT NOT NULL DEFAULT 0,
        \`expiresAt\` TIMESTAMP NULL DEFAULT NULL,
        \`isActive\` TINYINT(1) NOT NULL DEFAULT 1,
        \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});
    console.log("[Migration] discountCodes table ready");

    // Ensure appointments.pricingType column exists
    await new Promise<void>((resolve) => {
      client.execute(
        `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'pricingType'`,
        [],
        (err: any, results: any) => {
          const cnt = Number(Array.isArray(results) ? results[0]?.cnt : results?.cnt);
          if (cnt > 0) { resolve(); return; }
          client.execute(
            `ALTER TABLE appointments ADD COLUMN \`pricingType\` ENUM('individual', 'member') NOT NULL DEFAULT 'individual'`,
            [],
            (err2: any) => {
              if (err2) console.warn("[Migration] appointments.pricingType:", err2?.message);
              else console.log("[Migration] appointments.pricingType column added");
              resolve();
            }
          );
        }
      );
    });

    // ── One-time fix: release orphaned reserved credits for cancelled/no-show appointments ──
    // Fixes the BEGIN/COMMIT bug where refundCredits silently failed on TiDB
    await new Promise<void>((resolve) => {
      client.execute(
        `UPDATE creditBatches cb
         JOIN creditTransactions ct ON ct.batchId = cb.id
         JOIN appointments a ON a.id = ct.appointmentId
         SET cb.reservedAmount = 0
         WHERE ct.reason = 'reserved'
           AND a.status IN ('cancelled', 'canceled', 'no_show', 'no-show')
           AND cb.reservedAmount > 0`,
        [],
        (err: any, result: any) => {
          if (err) console.error("[Migration] orphaned reservedAmount fix:", err?.message);
          else if (result?.affectedRows > 0) console.log(`[Migration] Released orphaned reservedAmount on ${result.affectedRows} batch(es)`);
          else console.log("[Migration] No orphaned reservedAmount found");
          resolve();
        }
      );
    });

    // Ensure prepaidCards table exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`prepaidCards\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`code\` VARCHAR(20) NOT NULL UNIQUE,
        \`productType\` VARCHAR(64) NOT NULL,
        \`credits\` INT NOT NULL,
        \`amount\` DECIMAL(10,2) NOT NULL,
        \`isUsed\` TINYINT(1) DEFAULT 0,
        \`usedByUserId\` INT NULL,
        \`usedAt\` TIMESTAMP NULL,
        \`createdAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});
    console.log("[Migration] prepaidCards table ready");

    // Create emailOtps table for email-based OTP authentication
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`emailOtps\` (
        \`id\`        INT AUTO_INCREMENT PRIMARY KEY,
        \`email\`     VARCHAR(255) NOT NULL,
        \`code\`      VARCHAR(6)   NOT NULL,
        \`firstName\` VARCHAR(100),
        \`lastName\`  VARCHAR(100),
        \`expiresAt\` DATETIME     NOT NULL,
        \`used\`      BOOLEAN      DEFAULT FALSE,
        \`createdAt\` DATETIME     DEFAULT NOW(),
        INDEX \`idx_email_otp\` (\`email\`)
      )
    `).catch(() => {});
    console.log("[Migration] emailOtps table ready");

    // Add reminder15sent column to appointments (tracks 15-min reminder emails)
    try {
      const [r15Rows] = await db.execute(
        `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'reminder15sent'`
      ) as any;
      const r15Exists = Array.isArray(r15Rows) ? Number(r15Rows[0]?.cnt) > 0 : Number(r15Rows?.cnt) > 0;
      if (!r15Exists) {
        await db.execute("ALTER TABLE `appointments` ADD COLUMN `reminder15sent` BOOLEAN NOT NULL DEFAULT FALSE");
        console.log("[Migration] appointments.reminder15sent column added");
      } else {
        console.log("[Migration] appointments.reminder15sent column already exists");
      }
    } catch (e: any) {
      console.warn("[Migration] Could not add reminder15sent column:", e?.message);
    }

    // Cancellation columns — one by one to avoid multi-column IF NOT EXISTS issues
    const cancelCols = [
      { name: "canceledAt",          def: "DATETIME NULL" },
      { name: "canceledBy",          def: "VARCHAR(50) NULL" },
      { name: "cancellationReason",  def: "TEXT NULL" },
      { name: "penaltyAmount",       def: "DECIMAL(10,2) NULL DEFAULT 0" },
      { name: "penaltyType",         def: "VARCHAR(50) NULL DEFAULT 'none'" },
    ];
    for (const col of cancelCols) {
      await new Promise<void>((resolve) => {
        client.execute(
          `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = ?`,
          [col.name],
          (err: any, results: any) => {
            const cnt = Number(Array.isArray(results) ? results[0]?.cnt : results?.cnt);
            if (cnt > 0) { resolve(); return; }
            client.execute(
              `ALTER TABLE appointments ADD COLUMN \`${col.name}\` ${col.def}`,
              [],
              (err2: any) => {
                if (err2) console.warn(`[Migration] appointments.${col.name}:`, err2?.message);
                else console.log(`[Migration] appointments.${col.name} added`);
                resolve();
              }
            );
          }
        );
      });
    }

    // Reset subscription plans to correct values
    try {
      await new Promise<void>((resolve) => {
        client.execute("DELETE FROM subscriptionPlans", [], (err: any) => {
          if (err) console.warn("[Migration] delete plans:", err?.message);
          resolve();
        });
      });
      // Ensure billingPeriod enum supports 'once'
      await new Promise<void>((resolve) => {
        client.execute(
          "ALTER TABLE `subscriptionPlans` MODIFY COLUMN `billingPeriod` ENUM('monthly','yearly','once') NOT NULL",
          [],
          (err: any) => { if (err) console.warn("[Migration] billingPeriod enum:", err?.message); resolve(); }
        );
      });
      const plans = [
        { name: "Plan Básico",    price: 980,  billingPeriod: "monthly", maxAppointmentsPerMonth: 4, maxMinutesPerAppointment: 60, sortOrder: 1 },
        { name: "Plan Pro",       price: 2500, billingPeriod: "monthly", maxAppointmentsPerMonth: 6, maxMinutesPerAppointment: 60, sortOrder: 2 },
        { name: "Sesión Básica",  price: 350,  billingPeriod: "once",    maxAppointmentsPerMonth: 1, maxMinutesPerAppointment: 60, sortOrder: 3 },
        { name: "Sesión Premium", price: 1500, billingPeriod: "once",    maxAppointmentsPerMonth: 1, maxMinutesPerAppointment: 60, sortOrder: 4 },
      ];
      for (const plan of plans) {
        await new Promise<void>((resolve) => {
          client.execute(
            `INSERT INTO subscriptionPlans (name, price, billingPeriod, maxAppointmentsPerMonth, maxMinutesPerAppointment, sortOrder, stripePriceId, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, '', 1, NOW(), NOW())`,
            [plan.name, plan.price, plan.billingPeriod, plan.maxAppointmentsPerMonth, plan.maxMinutesPerAppointment, plan.sortOrder],
            (err: any) => { if (err) console.warn("[Migration] plan insert:", err?.message); resolve(); }
          );
        });
      }
      console.log("[Migration] subscription plans reset to correct values");
    } catch (e: any) {
      console.warn("[Migration] reset plans:", e?.message);
    }

    // One-time fix v3: recalculate balance from scratch for memoxgamer1993@gmail.com
    // Previous attempts failed because withdrawalRequests had no matching rows.
    // Source of truth: SUM(professionalEarnings.netAmount) - SUM(paid withdrawals)
    try {
      await new Promise<void>((resolve) => {
        client.execute(
          `UPDATE professionalWallet pw
           JOIN professionals p ON pw.professionalId = p.id
           JOIN users u ON p.userId = u.id
           JOIN (
             SELECT pe.professionalId, COALESCE(SUM(pe.netAmount), 0) AS totalEarned
             FROM professionalEarnings pe
             GROUP BY pe.professionalId
           ) earnings ON earnings.professionalId = p.id
           LEFT JOIN (
             SELECT wr.professionalId, COALESCE(SUM(wr.amount), 0) AS totalPaid
             FROM withdrawalRequests wr
             WHERE wr.status = 'paid'
             GROUP BY wr.professionalId
           ) paid ON paid.professionalId = p.id
           SET pw.balance      = earnings.totalEarned - COALESCE(paid.totalPaid, 0),
               pw.totalEarned  = earnings.totalEarned,
               pw.totalWithdrawn = COALESCE(paid.totalPaid, 0),
               pw.pendingWithdrawal = 0
           WHERE u.email = 'memoxgamer1993@gmail.com'`,
          [],
          (err: any, result: any) => {
            if (err) console.warn('[Migration] restore balance v3:', err?.message);
            else console.log('[Migration] balance restored v3 for memoxgamer1993@gmail.com', JSON.stringify(result));
            resolve();
          }
        );
      });
    } catch (e: any) {
      console.warn('[Migration] restore balance v3 error:', e?.message);
    }

    // Ensure siteConfig table exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`siteConfig\` (
        \`key\` VARCHAR(100) NOT NULL,
        \`value\` TEXT,
        \`updatedAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`key\`)
      )
    `).catch(() => {});
    console.log("[Migration] siteConfig table ready");

    // Ensure eventBanners table exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`eventBanners\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`imageUrl\` VARCHAR(500) NOT NULL,
        \`title\` VARCHAR(200) NULL,
        \`linkUrl\` VARCHAR(500) NULL,
        \`position\` INT DEFAULT 0,
        \`isActive\` TINYINT(1) DEFAULT 1,
        \`createdAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});
    console.log("[Migration] eventBanners table ready");

    // Prevent double-booking: clean duplicates first, then add UNIQUE constraint
    // Step 1: remove duplicate rows keeping the lowest id per (professionalId, appointmentDate, status)
    await new Promise<void>((resolve) => {
      client.execute(
        `DELETE a1 FROM appointments a1
         INNER JOIN appointments a2
         WHERE a1.id > a2.id
           AND a1.professionalId = a2.professionalId
           AND a1.appointmentDate = a2.appointmentDate
           AND a1.status = a2.status`,
        [],
        (err: any) => {
          if (err) console.log("[Migration] cleanup duplicates:", err?.message);
          else console.log("[Migration] duplicate appointments cleaned");
          resolve();
        }
      );
    });
    // Step 2: add UNIQUE KEY (idempotent — ignored if already exists)
    await new Promise<void>((resolve) => {
      client.execute(
        `ALTER TABLE appointments ADD UNIQUE KEY unique_professional_slot (professionalId, appointmentDate)`,
        [],
        (err: any) => {
          if (err) console.log("[Migration] unique_professional_slot:", err?.message);
          else console.log("[Migration] unique_professional_slot ready");
          resolve();
        }
      );
    });

    // Ensure users.password column exists (email+password auth for professionals)
    try {
      const [pwdCols] = await db.execute(
        "SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password'"
      ) as any;
      const pwdExists = Array.isArray(pwdCols) ? Number(pwdCols[0]?.cnt) > 0 : Number(pwdCols?.cnt) > 0;
      if (!pwdExists) {
        await db.execute("ALTER TABLE `users` ADD COLUMN `password` VARCHAR(255) NULL DEFAULT NULL");
        console.log("[Migration] users.password column added");
      } else {
        console.log("[Migration] users.password column already exists");
      }
    } catch (e: any) {
      console.warn("[Migration] Could not add users.password column:", e?.message);
    }

    // Seed initial event banners if table is empty
    await new Promise<void>((resolve) => {
      client.execute(
        `INSERT INTO eventBanners (imageUrl, title, position, isActive)
         SELECT * FROM (
           SELECT 'https://pub-cc4c932d49594db4a582c5a9a78363f7.r2.dev/imagenes%20carrusel/Eventos-1.webp' AS imageUrl,
                  'Eventos' AS title, 0 AS position, 1 AS isActive
           UNION ALL
           SELECT 'https://pub-cc4c932d49594db4a582c5a9a78363f7.r2.dev/imagenes%20carrusel/Interfaz-Inteira.webp',
                  'Interfaz Inteira', 1, 1
         ) AS tmp
         WHERE NOT EXISTS (SELECT 1 FROM eventBanners LIMIT 1)`,
        [],
        (err: any, result: any) => {
          if (err) console.warn("[Migration] eventBanners seed:", err?.message);
          else if (result?.affectedRows > 0) console.log("[Migration] eventBanners seeded with 2 initial banners");
          else console.log("[Migration] eventBanners already has data, skipping seed");
          resolve();
        }
      );
    });

  } catch (err) {
    console.error("[Migration] Startup migration failed:", err);
  }
}

async function startServer() {
   const app = express();
  const server = createServer(app);
  // ⚠️ Stripe webhook MUST be registered BEFORE express.json() so it receives the raw body
  // needed for signature verification. express.json() would parse it and break the HMAC check.
  registerStripeRoutes(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Trust Railway's proxy for correct IP in rate limiter
  app.set("trust proxy", 1);

  // Rate limiting
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: "Demasiados intentos" });
  const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 60 });
  app.use("/api/auth", authLimiter);
  app.use("/api/trpc", apiLimiter);
  // Run startup migrations
  await runStartupMigrations();
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Email OTP auth routes: /api/auth/email/request-otp, /api/auth/email/verify-otp
  app.use("/api/auth/email", emailAuthRouter);

  // ─── File upload: professional profile photo / documents ────────────────────
  app.post("/api/upload/professional-photo", async (req, res) => {
    try {
      let user = null;
      try { user = await sdk.authenticateRequest(req); } catch { user = null; }

      // Anonymous uploads (new specialist registration) — rate-limit strictly
      if (!user) {
        const ip = String(req.headers["x-forwarded-for"] ?? req.ip ?? "unknown");
        const now = Date.now();
        const limit = anonUploadLimit.get(ip);
        if (limit && now < limit.resetAt && limit.count >= 10) {
          return res.status(429).json({ error: "Demasiados intentos. Espera una hora." });
        }
        if (limit && now < limit.resetAt) limit.count++;
        else anonUploadLimit.set(ip, { count: 1, resetAt: now + 3_600_000 });
      }

      const { base64, mimeType, fileName } = req.body as {
        base64: string;
        mimeType: string;
        fileName: string;
      };

      if (!base64 || !mimeType || !fileName) {
        return res.status(400).json({ error: "base64, mimeType and fileName are required" });
      }

      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (!allowedTypes.includes(mimeType)) {
        return res.status(400).json({ error: "Only JPEG, PNG, WebP and PDF files are allowed" });
      }

      const buffer = Buffer.from(base64, "base64");
      if (buffer.length > 10 * 1024 * 1024) {
        return res.status(400).json({ error: "File must be under 10 MB" });
      }

      const ext = mimeType.split("/")[1] ?? "jpg";
      const folder = user ? "professional-photos" : "register-temp";
      const key = `${folder}/${user?.id ?? "anon"}-${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, mimeType);

      return res.json({ url });
    } catch (err) {
      console.error("[Upload] Error uploading professional photo:", err);
      return res.status(500).json({ error: "Upload failed" });
    }
  });
  // ─── File upload: site assets (admin only — video thumbnails, hero banners) ──
  app.post("/api/upload/site-asset", async (req, res) => {
    try {
      let user = null;
      try { user = await sdk.authenticateRequest(req); } catch { user = null; }
      if (!user || (user as any).role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { base64, mimeType, fileName } = req.body as {
        base64: string;
        mimeType: string;
        fileName: string;
      };

      if (!base64 || !mimeType || !fileName) {
        return res.status(400).json({ error: "base64, mimeType and fileName are required" });
      }

      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"];
      if (!allowedTypes.includes(mimeType)) {
        return res.status(400).json({ error: "Only JPEG, PNG, WebP, MP4 and WebM files are allowed" });
      }

      const buffer = Buffer.from(base64, "base64");
      if (buffer.length > 50 * 1024 * 1024) {
        return res.status(400).json({ error: "File must be under 50 MB" });
      }

      const ext = fileName.split(".").pop() ?? mimeType.split("/")[1] ?? "bin";
      const key = `site-assets/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { url } = await storagePut(key, buffer, mimeType);

      return res.json({ url });
    } catch (err) {
      console.error("[Upload] Error uploading site asset:", err);
      return res.status(500).json({ error: "Upload failed" });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);

// ─── Cron: reintentos de pagos pendientes cada 2 minutos ──────────────────────
setInterval(async () => {
  await retryPendingPayments().catch(err =>
    console.error("[Cron] Error en retryPendingPayments:", err?.message)
  );
}, 2 * 60 * 1000);
// Correr una vez al arrancar (30s para que las migraciones terminen)
setTimeout(() => retryPendingPayments().catch(console.error), 30000);

// ─── Cron: auto no-show + auto-complete pending_review cada 5 minutos ─────────
setInterval(async () => {
  try {
    const { getDb } = await import("../db");
    const db = await getDb();
    if (!db) return;
    const client = (db as any).$client;

    // Check 0: activar in_progress para citas que comenzaron hace menos de 55 min
    await new Promise<void>((resolve) => {
      client.execute(
        `UPDATE appointments SET status = 'in_progress', updatedAt = NOW()
         WHERE status = 'scheduled'
         AND appointmentDate <= NOW()
         AND DATE_ADD(appointmentDate, INTERVAL 55 MINUTE) > NOW()`,
        [],
        (err: any, result: any) => {
          if (err) console.error("[Cron] in_progress update error:", err?.message);
          else if (result?.affectedRows > 0) console.log(`[Cron] ${result.affectedRows} cita(s) → in_progress`);
          resolve();
        }
      );
    });

    // Check 1: auto no-show para citas scheduled/in_progress sin atender después de 3 horas
    // El no-show es del USUARIO — el profesional recibe su pago igual
    const noShowCandidates = await new Promise<any[]>((resolve) => {
      client.execute(
        `SELECT a.id, a.professionalId, a.userId, a.appointmentDate, a.durationMinutes, p.tier, u.email AS userEmail, u.name AS userName
         FROM appointments a
         JOIN professionals p ON p.id = a.professionalId
         JOIN \`users\` u ON u.id = a.userId
         WHERE a.status IN ('scheduled', 'in_progress')
         AND DATE_ADD(a.appointmentDate, INTERVAL 3 HOUR) < NOW()`,
        [],
        (err: any, results: any) => {
          if (err) { console.error("[Cron] noshow-select error:", err?.message); resolve([]); }
          else resolve(Array.isArray(results) ? results : []);
        }
      );
    });

    await new Promise<void>((resolve) => {
      client.execute(
        `UPDATE appointments SET status = 'no-show', updatedAt = NOW()
         WHERE status IN ('scheduled', 'in_progress')
         AND DATE_ADD(appointmentDate, INTERVAL 3 HOUR) < NOW()`,
        [],
        (err: any) => {
          if (err) console.error("[Cron] auto-noshow error:", err?.message);
          else console.log(`[Cron] auto-noshow check done (${noShowCandidates.length} rows)`);
          resolve();
        }
      );
    });

    // Profesional recibe su pago aunque el usuario no haya asistido
    if (noShowCandidates.length > 0) {
      const { creditProfessionalEarning } = await import("../professionalWallet");
      const { confirmCredits } = await import("../credits");
      const { sendCreditsDebitedEmail } = await import("../email");
      const { createNotification } = await import("../notifications");
      for (const row of noShowCandidates) {
        await confirmCredits(row.id).catch(() => {});
        await creditProfessionalEarning(row.professionalId, row.id, (row.tier ?? "basic") as "basic" | "pro", row.durationMinutes > 60 ? "premium" : "basic").catch(() => {});
        console.log(`[Cron] No-show: professional ${row.professionalId} credited for appointment ${row.id}`);
        // Notify user their credits were consumed for the no-show
        if (row.userEmail) {
          const sessionCost = row.durationMinutes > 60 ? 1500 : 350;
          sendCreditsDebitedEmail({
            userEmail: row.userEmail,
            userName: row.userName ?? "Usuario",
            credits: sessionCost,
            appointmentDate: new Date(row.appointmentDate),
          }).catch(() => {});
        }
        createNotification({
          userId: row.userId,
          type: "no_show",
          title: "⚠️ Cita no completada",
          message: "No asististe a tu cita. Los créditos han sido debitados.",
          link: "/citas",
          audience: "user",
        }).catch(() => {});
      }
    }

    // Check 2: auto-completar pending_review con más de 8 horas sin calificar
    const pendingRows = await new Promise<any[]>((resolve) => {
      client.execute(
        `SELECT a.id, a.professionalId, a.userId AS clientUserId, a.durationMinutes, p.tier, p.userId AS profUserId
         FROM appointments a
         JOIN professionals p ON p.id = a.professionalId
         WHERE a.status = 'pending_review'
         AND DATE_ADD(a.updatedAt, INTERVAL 8 HOUR) < NOW()`,
        [],
        (err: any, results: any) => {
          if (err) { console.error("[Cron] auto-complete select error:", err?.message); resolve([]); }
          else resolve(Array.isArray(results) ? results : []);
        }
      );
    });

    if (pendingRows.length > 0) {
      console.log(`[Cron] auto-complete: ${pendingRows.length} pending_review → completing`);
      const { creditProfessionalEarning } = await import("../professionalWallet");
      const { createNotification } = await import("../notifications");
      const { confirmCredits } = await import("../credits");

      for (const row of pendingRows) {
        try {
          await new Promise<void>((resolve) => {
            client.execute(
              `INSERT IGNORE INTO reviews (userId, professionalId, appointmentId, rating, comment, isVerified, createdAt, updatedAt)
               VALUES (?, ?, ?, 5, 'Completada automáticamente', 0, NOW(), NOW())`,
              [row.clientUserId, row.professionalId, row.id],
              (err: any) => { if (err) console.error("[Cron] auto-review insert:", err?.message); resolve(); }
            );
          });
          await confirmCredits(row.id).catch(() => {});
          await new Promise<void>((resolve) => {
            client.execute(
              "UPDATE appointments SET status = 'completed', updatedAt = NOW() WHERE id = ?",
              [row.id],
              (err: any) => { if (err) console.error("[Cron] auto-complete update:", err?.message); resolve(); }
            );
          });
          const { netAmount } = await creditProfessionalEarning(
            row.professionalId, row.id, (row.tier ?? "basic") as "basic" | "pro", row.durationMinutes > 60 ? "premium" : "basic"
          );
          createNotification({
            userId: row.profUserId,
            type: "new_earning",
            title: "Asesoría completada automáticamente",
            message: `Una asesoría fue completada automáticamente. Se acreditaron $${netAmount} MXN a tu wallet.`,
            link: "/profesional/wallet",
            audience: "professional",
          }).catch(() => {});
        } catch (rowErr: any) {
          console.error(`[Cron] auto-complete row ${row.id} error:`, rowErr?.message);
        }
      }
    }
  } catch(e: any) {
    console.error("[Cron] auto-noshow exception:", e?.message);
  }
}, 5 * 60 * 1000);

// ─── Cron: recordatorio 15 min antes — corre cada 5 minutos ──────────────────
setInterval(async () => {
  try {
    const { getDb } = await import("../db");
    const db = await getDb();
    if (!db) return;
    const client = (db as any).$client;

    const upcoming = await new Promise<any[]>((resolve) => {
      client.execute(
        `SELECT a.id, a.videoCallLink, a.appointmentDate,
                u.email AS userEmail, u.name AS userName,
                pu.name AS professionalName, pu.email AS professionalEmail
         FROM appointments a
         JOIN users u  ON u.id  = a.userId
         JOIN professionals p  ON p.id  = a.professionalId
         JOIN users pu ON pu.id = p.userId
         WHERE a.status = 'scheduled'
           AND a.reminder15sent = FALSE
           AND a.appointmentDate BETWEEN DATE_ADD(NOW(), INTERVAL 10 MINUTE)
                                     AND DATE_ADD(NOW(), INTERVAL 20 MINUTE)`,
        [],
        (err: any, results: any) => {
          if (err) { console.error("[Cron] reminder15 select error:", err?.message); resolve([]); }
          else resolve(Array.isArray(results) ? results : []);
        }
      );
    });

    if (upcoming.length > 0) {
      const { sendAppointmentReminder15min, sendProfessionalReminder15min } = await import("../email");
      for (const row of upcoming) {
        if (row.userEmail) {
          await sendAppointmentReminder15min({
            userEmail: row.userEmail,
            userName: row.userName ?? "Usuario",
            professionalName: row.professionalName ?? "Especialista",
            appointmentDate: new Date(row.appointmentDate),
            videoCallLink: row.videoCallLink ?? "",
          }).catch(() => {});
        }
        if (row.professionalEmail) {
          await sendProfessionalReminder15min({
            professionalEmail: row.professionalEmail,
            professionalName: row.professionalName ?? "Especialista",
            clientName: row.userName ?? "Usuario",
            appointmentDate: new Date(row.appointmentDate),
            videoCallLink: row.videoCallLink ?? "",
          }).catch(() => {});
        }
        await new Promise<void>((resolve) => {
          client.execute(
            "UPDATE appointments SET reminder15sent = TRUE WHERE id = ?",
            [row.id],
            (err: any) => { if (err) console.error("[Cron] reminder15 update error:", err?.message); resolve(); }
          );
        });
        console.log(`[Cron] 15-min reminder sent for appointment ${row.id}`);
      }
    }
  } catch (e: any) {
    console.error("[Cron] reminder15 exception:", e?.message);
  }
}, 5 * 60 * 1000);

// ─── Keepalive: ping TiDB every 4 minutes to keep connection warm ─────────────
setInterval(async () => {
  try {
    const { getDb } = await import("../db");
    const db = await getDb();
    if (!db) return;
    const client = (db as any).$client;
    client.execute("SELECT 1", [], (err: any) => {
      if (err) console.error("[keepalive] ping failed:", err?.message);
    });
  } catch (e) {}
}, 4 * 60 * 1000);

// ─── Cron: expire timed-out credit batches every hour ─────────────────────────
const ONE_HOUR_MS = 60 * 60 * 1000;
setInterval(async () => {
  try {
    const count = await expireTimedOutBatches();
    if (count > 0) console.log(`[Cron] Expired ${count} credit batch(es).`);
  } catch (err) {
    console.error("[Cron] Error expiring credit batches:", err);
  }
}, ONE_HOUR_MS);
// Run once on startup — delayed 15s so recovery (8s) finishes first
setTimeout(
  () => expireTimedOutBatches().catch((err) =>
    console.error("[Cron] Startup expiry check failed:", err)
  ),
  15000
);
