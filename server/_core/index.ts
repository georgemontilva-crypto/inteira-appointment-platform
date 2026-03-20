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
    await db.execute("ALTER TABLE `professionals` ADD COLUMN IF NOT EXISTS `tier` ENUM('basic','pro') NOT NULL DEFAULT 'basic'").catch(() => {});
    console.log("[Migration] professionals.tier column ready");

    // ── Seed: ensure marketingdedsm@gmail.com has role=admin ──────────────────
    try {
      await db.execute(
        "UPDATE `users` SET `role` = 'admin' WHERE `email` = 'marketingdedsm@gmail.com' AND `role` != 'admin'"
      );
      console.log("[Migration] Admin role ensured for marketingdedsm@gmail.com");
    } catch (adminErr: any) {
      console.warn("[Migration] Could not set admin role:", adminErr?.message);
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

  // ─── File upload: professional profile photo ─────────────────────────────────
  app.post("/api/upload/professional-photo", async (req, res) => {
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

      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(mimeType)) {
        return res.status(400).json({ error: "Only JPEG, PNG and WebP images are allowed" });
      }

      const buffer = Buffer.from(base64, "base64");
      if (buffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({ error: "Image must be under 5 MB" });
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
