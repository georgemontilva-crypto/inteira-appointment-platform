/**
 * credits.ts — Inteira Credit Wallet Engine
 *
 * Business rules:
 * - Each purchase (plan or individual session) creates a CreditBatch with expiresAt = now + 60 days.
 * - Consumption is FIFO: oldest non-expired batch first.
 * - If a subscription is cancelled, all batches from that subscription expire immediately.
 * - Credit value: 1 MXN = 1 credit.
 *   · Sesión Básica   = 350 credits
 *   · Sesión Premium  = 1,250 credits
 *   · Plan Básico     = 980 credits / month
 *   · Plan Pro        = 2,500 credits / month
 */

import { getDb } from "./db";
import { creditBatches, creditTransactions } from "../drizzle/schema";
import { and, eq, gt, asc, sql } from "drizzle-orm";

// ─── Constants ────────────────────────────────────────────────────────────────

export const CREDIT_COSTS = {
  individual_basic: 350,
  individual_premium: 1250,
  plan_basic: 980,
  plan_pro: 2500,
} as const;

export type CreditSource = keyof typeof CREDIT_COSTS;

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the current UTC timestamp as a Date */
function now(): Date {
  return new Date();
}

/** Returns now + 60 days */
function expiresAt60(): Date {
  return new Date(Date.now() + SIXTY_DAYS_MS);
}

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Get the total available credit balance for a user.
 * Only counts batches that: have remaining > 0, are not expired, and not expiredEarly.
 */
export async function getUserCreditBalance(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const batches = await db
    .select({ remaining: creditBatches.remaining })
    .from(creditBatches)
    .where(
      and(
        eq(creditBatches.userId, userId),
        gt(creditBatches.remaining, 0),
        eq(creditBatches.expiredEarly, false),
        gt(creditBatches.expiresAt, now())
      )
    );

  return batches.reduce((sum: number, b: { remaining: number }) => sum + b.remaining, 0);
}

/**
 * Get all active credit batches for a user, ordered oldest first (FIFO order).
 */
export async function getActiveBatches(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(creditBatches)
    .where(
      and(
        eq(creditBatches.userId, userId),
        gt(creditBatches.remaining, 0),
        eq(creditBatches.expiredEarly, false),
        gt(creditBatches.expiresAt, now())
      )
    )
    .orderBy(asc(creditBatches.createdAt)); // FIFO: oldest first
}

/**
 * Get all batches for a user (including expired/consumed), for wallet history.
 */
export async function getAllBatches(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(creditBatches)
    .where(eq(creditBatches.userId, userId))
    .orderBy(asc(creditBatches.createdAt));
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

  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const result = await db.insert(creditBatches).values({
    userId,
    amount,
    remaining: amount,
    source,
    expiresAt: expires,
    expiredEarly: false,
  });

  const batchId = Number((result as any).insertId ?? 0);

  // Record purchase transaction
  await db.insert(creditTransactions).values({
    userId,
    batchId,
    delta: amount,
    reason: "purchase",
    description: `Compra: ${source} (${amount} créditos, vence ${expires.toLocaleDateString("es-MX")})`,
  });

  return batchId;
}

/**
 * Consume credits using FIFO policy.
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

  const balance = await getUserCreditBalance(userId);

  if (balance < amount) {
    return { success: false, consumed: 0, insufficient: true };
  }

  const batches = await getActiveBatches(userId);
  let remaining = amount;

  for (const batch of batches) {
    if (remaining <= 0) break;

    const toConsume = Math.min(batch.remaining, remaining);

    // Deduct from this batch
    await db
      .update(creditBatches)
      .set({ remaining: batch.remaining - toConsume })
      .where(eq(creditBatches.id, batch.id));

    // Record transaction
    await db.insert(creditTransactions).values({
      userId,
      batchId: batch.id,
      delta: -toConsume,
      reason,
      appointmentId,
      description: description ?? `Consumo de ${toConsume} créditos`,
    });

    remaining -= toConsume;
  }

  return { success: true, consumed: amount - remaining };
}

/**
 * Expire all remaining credits for a user immediately (called when subscription is cancelled).
 * Records an "expire" transaction for each affected batch.
 */
export async function expireAllCredits(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const batches = await getActiveBatches(userId);
  let totalExpired = 0;

  for (const batch of batches) {
    if (batch.remaining > 0) {
      totalExpired += batch.remaining;

      await db
        .update(creditBatches)
        .set({ remaining: 0, expiredEarly: true })
        .where(eq(creditBatches.id, batch.id));

      await db.insert(creditTransactions).values({
        userId,
        batchId: batch.id,
        delta: -batch.remaining,
        reason: "expire",
        description: `Créditos expirados por cancelación de suscripción`,
      });
    }
  }

  return totalExpired;
}

/**
 * Get the next expiration date (the soonest expiring active batch).
 */
export async function getNextExpirationDate(userId: number): Promise<Date | null> {
  const batches = await getActiveBatches(userId);
  if (batches.length === 0) return null;
  // Already ordered by createdAt; find the one with earliest expiresAt
  const sorted = [...batches].sort(
    (a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
  );
  return new Date(sorted[0].expiresAt);
}

/**
 * Get recent credit transactions for a user (last 50).
 */
export async function getCreditTransactions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
    .orderBy(sql`${creditTransactions.createdAt} DESC`)
    .limit(50);
}

/**
 * Expire all batches that have passed their expiresAt date.
 * Called by the server cron job every hour.
 * Returns the number of batches expired.
 */
export async function expireTimedOutBatches(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // Find all batches where expiresAt < now AND remaining > 0 AND not already expired early
  const expiredBatches = await db
    .select({
      id: creditBatches.id,
      userId: creditBatches.userId,
      remaining: creditBatches.remaining,
      expiresAt: creditBatches.expiresAt,
    })
    .from(creditBatches)
    .where(
      and(
        gt(creditBatches.remaining, 0),
        eq(creditBatches.expiredEarly, false)
      )
    );

  // Filter in JS since Drizzle ORM lt() with Date can vary by driver
  const now = new Date();
  const toExpire = expiredBatches.filter(
    (b) => new Date((b as any).expiresAt ?? 0) < now
  );

  if (toExpire.length === 0) return 0;

  for (const batch of toExpire) {
    await db
      .update(creditBatches)
      .set({ remaining: 0, expiredEarly: false, updatedAt: new Date() })
      .where(eq(creditBatches.id, batch.id));

    await db.insert(creditTransactions).values({
      userId: batch.userId,
      batchId: batch.id,
      delta: -batch.remaining,
      reason: "expire",
      description: `Créditos expirados automáticamente (60 días)`,
    });
  }

  console.log(`[Credits] Expired ${toExpire.length} batch(es) automatically.`);
  return toExpire.length;
}
