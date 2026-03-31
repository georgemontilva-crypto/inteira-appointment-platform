import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { expireTimedOutBatches } from "../credits";
import { retryPendingPayments } from "../paymentProcessor";
import { storagePut } from "../storage";
import { registerStripeRoutes } from "../stripe";
import { sdk } from "./sdk";

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

    // Ensure pending_review in appointments status enum
    await db.execute(
      "ALTER TABLE `appointments` MODIFY COLUMN `status` ENUM('scheduled','completed','canceled','no-show','pending_review') DEFAULT 'scheduled'"
    ).catch(() => {});
    console.log("[Migration] appointments pending_review status ready");

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

    // ── Seed: ensure marketingdedsm@gmail.com has role=admin ──────────────────
    try {
      await db.execute(
        "UPDATE `users` SET `role` = 'admin' WHERE `email` = 'marketingdedsm@gmail.com' AND `role` != 'admin'"
      );
      console.log("[Migration] Admin role ensured for marketingdedsm@gmail.com");
    } catch (adminErr: any) {
      console.warn("[Migration] Could not set admin role:", adminErr?.message);
    }

    // ── Seed: 1000 créditos de prueba a marketingdedsm si tiene menos de 100 ──
    try {
      const client = (db as any).$client;
      const getUser = () => new Promise<any[]>((resolve, reject) => {
        client.execute("SELECT id FROM users WHERE email = ?", ["marketingdedsm@gmail.com"], (err: any, results: any) => {
          if (err) reject(err); else resolve(Array.isArray(results) ? results : []);
        });
      });
      const userRows = await getUser();
      const userId = userRows[0]?.id;
      if (userId) {
        const getBal = () => new Promise<any[]>((resolve, reject) => {
          client.execute("SELECT SUM(remaining) as bal FROM creditBatches WHERE userId = ?", [userId], (err: any, results: any) => {
            if (err) reject(err); else resolve(Array.isArray(results) ? results : []);
          });
        });
        const balRows = await getBal();
        if ((balRows[0]?.bal ?? 0) < 500) {
          const exp = new Date();
          exp.setDate(exp.getDate() + 60);
          const expStr = exp.toISOString().slice(0, 19).replace("T", " ");
          await new Promise<void>((resolve, reject) => {
            client.execute(
              "INSERT INTO creditBatches (userId, amount, remaining, source, expiresAt) VALUES (?, ?, ?, ?, ?)",
              [userId, 2000, 2000, "test_20", expStr],
              (err: any) => { if (err) reject(err); else resolve(); }
            );
          });
          console.log("[Migration] 1000 créditos de prueba agregados a marketingdedsm");
        }
      }
    } catch (e: any) {
      console.error("[Migration] Could not seed test credits:", e?.message);
    }

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
  // Run startup migrations
  await runStartupMigrations();
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // ─── File upload: professional profile photo / documents ────────────────────
  app.post("/api/upload/professional-file", async (req, res) => {
    try {
      let user = null;
      try { user = await sdk.authenticateRequest(req); } catch { user = null; }
      if (!user) return res.status(401).json({ error: "Unauthorized" });

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
      const key = `professional-photos/${user.id}-${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, mimeType);

      return res.json({ url });
    } catch (err) {
      console.error("[Upload] Error uploading professional photo:", err);
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

    // Check 1: auto no-show para citas scheduled que pasaron 55 min
    await new Promise<void>((resolve) => {
      client.execute(
        `UPDATE appointments SET status = 'no-show', updatedAt = NOW()
         WHERE status = 'scheduled'
         AND DATE_ADD(appointmentDate, INTERVAL 55 MINUTE) < NOW()`,
        [],
        (err: any) => {
          if (err) console.error("[Cron] auto-noshow error:", err?.message);
          else console.log("[Cron] auto-noshow check done");
          resolve();
        }
      );
    });

    // Check 2: auto-completar pending_review con más de 8 horas sin calificar
    const pendingRows = await new Promise<any[]>((resolve) => {
      client.execute(
        `SELECT a.id, a.professionalId, a.userId AS clientUserId, p.tier, p.userId AS profUserId
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
          await new Promise<void>((resolve) => {
            client.execute(
              "UPDATE appointments SET status = 'completed', updatedAt = NOW() WHERE id = ?",
              [row.id],
              (err: any) => { if (err) console.error("[Cron] auto-complete update:", err?.message); resolve(); }
            );
          });
          const { netAmount } = await creditProfessionalEarning(
            row.professionalId, row.id, (row.tier ?? "basic") as "basic" | "pro"
          );
          createNotification({
            userId: row.profUserId,
            type: "new_earning",
            title: "Asesoría completada automáticamente",
            message: `Una asesoría fue completada automáticamente. Se acreditaron $${netAmount} MXN a tu wallet.`,
            link: "/profesional/wallet",
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
