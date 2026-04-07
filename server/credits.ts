/**
 * credits.ts — Inteira Credit Wallet Engine
 *
 * Business rules:
 * - Each purchase (plan or individual session) creates a CreditBatch with expiresAt = now + 60 days.
 * - Consumption is FIFO: oldest non-expired batch first.
 * - Credits are RESERVED on booking, CONFIRMED on review/no-show, REFUNDED on cancellation.
 * - Credit value: 1 MXN = 1 credit.
 *   · Sesión Básica   = 350 credits
 *   · Sesión Premium  = 1,500 credits
 *   · Plan Básico     = 980 credits / month
 *   · Plan Pro        = 2,500 credits / month
 */

import { getDb } from "./db";

// ─── Constants ────────────────────────────────────────────────────────────────

export const CREDIT_COSTS = {
  individual_basic: 350,
  individual_premium: 1500,
  plan_basic: 980,
  plan_pro: 2500,
} as const;

export type CreditSource = keyof typeof CREDIT_COSTS;

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

function expiresAt60(): Date {
  return new Date(Date.now() + SIXTY_DAYS_MS);
}

function toMysqlDatetime(d: Date): string {
  return d.toISOString().slice(0, 19).replace("T", " ");
}

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Get the total available credit balance for a user.
 * Available = SUM(remaining - reservedAmount) for active non-expired batches.
 */
export async function getUserCreditBalance(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const client = (db as any).$client;

  const rows = await new Promise<any[]>((resolve, reject) => {
    client.execute(
      `SELECT COALESCE(SUM(GREATEST(0, remaining - reservedAmount)), 0) AS balance
       FROM creditBatches
       WHERE userId = ? AND remaining > 0 AND expiredEarly = 0 AND expiresAt > NOW()`,
      [userId],
      (err: any, results: any) => {
        if (err) reject(err);
        else resolve(Array.isArray(results) ? results : []);
      }
    );
  });

  return Number(rows[0]?.balance ?? 0);
}

/**
 * Get all active credit batches for a user, ordered oldest first (FIFO).
 */
export async function getActiveBatches(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const client = (db as any).$client;

  return new Promise<any[]>((resolve, reject) => {
    client.execute(
      `SELECT * FROM creditBatches
       WHERE userId = ? AND remaining > 0 AND expiredEarly = 0 AND expiresAt > NOW()
       ORDER BY expiresAt ASC`,
      [userId],
      (err: any, results: any) => {
        if (err) reject(err);
        else resolve(Array.isArray(results) ? results : []);
      }
    );
  });
}

/**
 * Get all batches for a user (including expired/consumed), for wallet history.
 */
export async function getAllBatches(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const client = (db as any).$client;

  return new Promise<any[]>((resolve, reject) => {
    client.execute(
      `SELECT * FROM creditBatches WHERE userId = ? ORDER BY createdAt ASC`,
      [userId],
      (err: any, results: any) => {
        if (err) reject(err);
        else resolve(Array.isArray(results) ? results : []);
      }
    );
  });
}

/**
 * Add a new credit batch for a user (called on plan purchase or individual session purchase).
 * Returns the created batch id.
 */
export async function addCreditBatch(
  userId: number,
  source: CreditSource,
  customAmount?: number
): Promise<number> {
  const amount = customAmount ?? CREDIT_COSTS[source];
  const expires = expiresAt60();
  const expiresStr = toMysqlDatetime(expires);

  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const client = (db as any).$client;

  const batchId = await new Promise<number>((resolve, reject) => {
    client.execute(
      `INSERT INTO creditBatches (userId, amount, remaining, reservedAmount, source, expiresAt, expiredEarly)
       VALUES (?, ?, ?, 0, ?, ?, 0)`,
      [userId, amount, amount, source, expiresStr],
      (err: any, result: any) => {
        if (err) reject(err);
        else resolve(Number(result?.insertId ?? 0));
      }
    );
  });

  await new Promise<void>((resolve, reject) => {
    client.execute(
      `INSERT INTO creditTransactions (userId, batchId, delta, reason, description)
       VALUES (?, ?, ?, 'purchase', ?)`,
      [userId, batchId, amount, `Compra: ${source} (${amount} créditos, vence ${expires.toLocaleDateString("es-MX")})`],
      (err: any) => { if (err) reject(err); else resolve(); }
    );
  });

  return batchId;
}

/**
 * Consume credits using FIFO policy (legacy — use reserveCredits for new bookings).
 * Returns true if successful, false if insufficient balance.
 */
export async function consumeCredits(
  userId: number,
  amount: number,
  reason: "consume" | "refund",
  appointmentId?: number,
  description?: string
): Promise<{ success: boolean; consumed: number; insufficient?: boolean }> {
  const db = await getDb();
  if (!db) return { success: false, consumed: 0, insufficient: false };
  const client = (db as any).$client;

  const balance = await getUserCreditBalance(userId);
  if (balance < amount) {
    return { success: false, consumed: 0, insufficient: true };
  }

  const batches = await getActiveBatches(userId);
  let remaining = amount;

  for (const batch of batches) {
    if (remaining <= 0) break;
    const available = batch.remaining - (batch.reservedAmount ?? 0);
    const toConsume = Math.min(available, remaining);
    if (toConsume <= 0) continue;

    await new Promise<void>((resolve, reject) => {
      client.execute(
        `UPDATE creditBatches SET remaining = remaining - ? WHERE id = ?`,
        [toConsume, batch.id],
        (err: any) => { if (err) reject(err); else resolve(); }
      );
    });

    await new Promise<void>((resolve, reject) => {
      client.execute(
        `INSERT INTO creditTransactions (userId, batchId, delta, reason, appointmentId, description)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, batch.id, -toConsume, reason, appointmentId ?? null, description ?? `Consumo de ${toConsume} créditos`],
        (err: any) => { if (err) reject(err); else resolve(); }
      );
    });

    remaining -= toConsume;
  }

  return { success: true, consumed: amount - remaining };
}

/**
 * Reserve credits (FIFO) — increments reservedAmount without decrementing remaining.
 * Call confirmCredits() to finalize or refundCredits() to undo.
 */
export async function reserveCredits(
  userId: number,
  amount: number,
  appointmentId: number,
  description?: string
): Promise<{ success: boolean; reserved: number; insufficient?: boolean }> {
  console.log("[reserveCredits] userId:", userId, "amount:", amount, "appointmentId:", appointmentId);
  const db = await getDb();
  if (!db) return { success: false, reserved: 0, insufficient: false };
  const client = (db as any).$client;

  const balance = await getUserCreditBalance(userId);
  console.log("[reserveCredits] balance:", balance, "needed:", amount);
  if (balance < amount) {
    console.log("[reserveCredits] insufficient balance, aborting");
    return { success: false, reserved: 0, insufficient: true };
  }

  const batches = await new Promise<any[]>((resolve, reject) => {
    client.execute(
      `SELECT * FROM creditBatches
       WHERE userId = ? AND (remaining - reservedAmount) > 0 AND expiredEarly = 0 AND expiresAt > NOW()
       ORDER BY expiresAt ASC`,
      [userId],
      (err: any, results: any) => {
        if (err) reject(err);
        else resolve(Array.isArray(results) ? results : []);
      }
    );
  });
  console.log("[reserveCredits] batches found:", batches.length);

  let toReserve = amount;

  for (const batch of batches) {
    if (toReserve <= 0) break;
    const available = batch.remaining - (batch.reservedAmount ?? 0);
    const reserveFromBatch = Math.min(available, toReserve);
    if (reserveFromBatch <= 0) continue;

    await new Promise<void>((resolve, reject) => {
      client.execute(
        `UPDATE creditBatches SET reservedAmount = reservedAmount + ? WHERE id = ?`,
        [reserveFromBatch, batch.id],
        (err: any) => {
          if (err) reject(err);
          else {
            console.log("[reserveCredits] batch updated:", batch.id, "reservedAmount +", reserveFromBatch);
            resolve();
          }
        }
      );
    });

    await new Promise<void>((resolve, reject) => {
      client.execute(
        `INSERT INTO creditTransactions (userId, batchId, delta, reason, appointmentId, description)
         VALUES (?, ?, ?, 'reserved', ?, ?)`,
        [userId, batch.id, -reserveFromBatch, appointmentId, description ?? `Reserva de ${reserveFromBatch} créditos`],
        (err: any) => { if (err) reject(err); else resolve(); }
      );
    });

    toReserve -= reserveFromBatch;
  }

  console.log("[reserveCredits] done, total reserved:", amount - toReserve);
  return { success: true, reserved: amount - toReserve };
}

/**
 * Confirm reserved credits — converts 'reserved' transactions to 'consumed'
 * and decrements remaining + reservedAmount from batches.
 */
export async function confirmCredits(appointmentId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const client = (db as any).$client;

  const reservedTxs = await new Promise<any[]>((resolve, reject) => {
    client.execute(
      `SELECT * FROM creditTransactions WHERE reason = 'reserved' AND appointmentId = ?`,
      [appointmentId],
      (err: any, results: any) => {
        if (err) reject(err);
        else resolve(Array.isArray(results) ? results : []);
      }
    );
  });

  if (reservedTxs.length === 0) return;

  for (const tx of reservedTxs) {
    const toConsume = Math.abs(tx.delta);

    await new Promise<void>((resolve) => {
      client.execute(
        `UPDATE creditBatches
         SET remaining = remaining - ?, reservedAmount = GREATEST(0, reservedAmount - ?)
         WHERE id = ?`,
        [toConsume, toConsume, tx.batchId],
        (err: any) => { if (err) console.error("[confirmCredits] update batch:", err?.message); resolve(); }
      );
    });

    await new Promise<void>((resolve) => {
      client.execute(
        `UPDATE creditTransactions SET reason = 'consumed' WHERE id = ?`,
        [tx.id],
        (err: any) => { if (err) console.error("[confirmCredits] update tx:", err?.message); resolve(); }
      );
    });
  }
}

/**
 * Refund reserved credits — releases the reservation without consuming.
 * Decrements reservedAmount and inserts a positive 'refund' transaction.
 */
export async function refundCredits(userId: number, appointmentId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const client = (db as any).$client;

  const reservedTxs = await new Promise<any[]>((resolve, reject) => {
    client.execute(
      `SELECT * FROM creditTransactions WHERE reason = 'reserved' AND appointmentId = ?`,
      [appointmentId],
      (err: any, results: any) => {
        if (err) reject(err);
        else resolve(Array.isArray(results) ? results : []);
      }
    );
  });

  if (reservedTxs.length === 0) return;

  for (const tx of reservedTxs) {
    const toRefund = Math.abs(tx.delta);

    await new Promise<void>((resolve) => {
      client.execute(
        `UPDATE creditBatches SET reservedAmount = GREATEST(0, reservedAmount - ?) WHERE id = ?`,
        [toRefund, tx.batchId],
        (err: any) => { if (err) console.error("[refundCredits] update batch:", err?.message); resolve(); }
      );
    });

    await new Promise<void>((resolve) => {
      client.execute(
        `UPDATE creditTransactions SET reason = 'refunded' WHERE id = ?`,
        [tx.id],
        (err: any) => { if (err) console.error("[refundCredits] update tx:", err?.message); resolve(); }
      );
    });

    await new Promise<void>((resolve) => {
      client.execute(
        `INSERT INTO creditTransactions (userId, batchId, delta, reason, appointmentId, description)
         VALUES (?, ?, ?, 'refund', ?, ?)`,
        [userId, tx.batchId, toRefund, appointmentId, `Reembolso de ${toRefund} créditos (cita #${appointmentId})`],
        (err: any) => { if (err) console.error("[refundCredits] insert refund tx:", err?.message); resolve(); }
      );
    });
  }
}

/**
 * Expire all remaining credits for a user immediately (called when subscription is cancelled).
 */
export async function expireAllCredits(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const client = (db as any).$client;

  const batches = await getActiveBatches(userId);
  let totalExpired = 0;

  for (const batch of batches) {
    if (batch.remaining > 0) {
      totalExpired += batch.remaining;

      await new Promise<void>((resolve) => {
        client.execute(
          `UPDATE creditBatches SET remaining = 0, reservedAmount = 0, expiredEarly = 1 WHERE id = ?`,
          [batch.id],
          (err: any) => { if (err) console.error("[expireAllCredits] update:", err?.message); resolve(); }
        );
      });

      await new Promise<void>((resolve) => {
        client.execute(
          `INSERT INTO creditTransactions (userId, batchId, delta, reason, description)
           VALUES (?, ?, ?, 'expire', ?)`,
          [userId, batch.id, -batch.remaining, `Créditos expirados por cancelación de suscripción`],
          (err: any) => { if (err) console.error("[expireAllCredits] insert:", err?.message); resolve(); }
        );
      });
    }
  }

  return totalExpired;
}

/**
 * Get the next expiration date (the soonest expiring active batch).
 */
export async function getNextExpirationDate(userId: number): Promise<Date | null> {
  const db = await getDb();
  if (!db) return null;
  const client = (db as any).$client;

  const rows = await new Promise<any[]>((resolve, reject) => {
    client.execute(
      `SELECT MIN(expiresAt) AS nextExpiry FROM creditBatches
       WHERE userId = ? AND remaining > 0 AND expiredEarly = 0 AND expiresAt > NOW()`,
      [userId],
      (err: any, results: any) => {
        if (err) reject(err);
        else resolve(Array.isArray(results) ? results : []);
      }
    );
  });

  const val = rows[0]?.nextExpiry;
  return val ? new Date(val) : null;
}

/**
 * Get recent credit transactions for a user (last 50).
 */
export async function getCreditTransactions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const client = (db as any).$client;

  return new Promise<any[]>((resolve, reject) => {
    client.execute(
      `SELECT * FROM creditTransactions WHERE userId = ? ORDER BY createdAt DESC LIMIT 50`,
      [userId],
      (err: any, results: any) => {
        if (err) reject(err);
        else resolve(Array.isArray(results) ? results : []);
      }
    );
  });
}

/**
 * Expire all batches that have passed their expiresAt date.
 * Called by the server cron job every hour.
 */
export async function expireTimedOutBatches(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const client = (db as any).$client;

  const expiredBatches = await new Promise<any[]>((resolve, reject) => {
    client.execute(
      `SELECT id, userId, remaining FROM creditBatches
       WHERE remaining > 0 AND expiredEarly = 0 AND expiresAt < NOW()`,
      [],
      (err: any, results: any) => {
        if (err) reject(err);
        else resolve(Array.isArray(results) ? results : []);
      }
    );
  });

  if (expiredBatches.length === 0) return 0;

  for (const batch of expiredBatches) {
    await new Promise<void>((resolve) => {
      client.execute(
        `UPDATE creditBatches SET remaining = 0, reservedAmount = 0, expiredEarly = 0 WHERE id = ?`,
        [batch.id],
        (err: any) => { if (err) console.error("[expireTimedOutBatches] update:", err?.message); resolve(); }
      );
    });

    await new Promise<void>((resolve) => {
      client.execute(
        `INSERT INTO creditTransactions (userId, batchId, delta, reason, description)
         VALUES (?, ?, ?, 'expire', ?)`,
        [batch.userId, batch.id, -batch.remaining, `Créditos expirados automáticamente (60 días)`],
        (err: any) => { if (err) console.error("[expireTimedOutBatches] insert:", err?.message); resolve(); }
      );
    });
  }

  console.log(`[Credits] Expired ${expiredBatches.length} batch(es) automatically.`);
  return expiredBatches.length;
}
