/**
 * paymentProcessor.ts — Cola de pagos con reintentos
 *
 * Flujo:
 * 1. Webhook de Stripe inserta en paymentQueue (INSERT ... ON DUPLICATE KEY — idempotente)
 * 2. processPayment(stripeSessionId) acredita créditos y marca como completed
 * 3. Si falla, queda en pending para reintento automático
 * 4. retryPendingPayments() corre cada 2 minutos buscando pending
 * 5. Después de 3 fallos, marca como failed y alerta por consola
 */

import { getDb } from "./db";
import { type CreditSource } from "./credits";

// Procesar un pago por stripeSessionId (no depende de insertId)
export async function processPayment(stripeSessionId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const client = (db as any).$client;

  try {
    // Obtener el item por stripeSessionId
    const findResult = await client.execute(
      "SELECT id, userId, productType, credits, attempts, status FROM paymentQueue WHERE stripeSessionId=? LIMIT 1",
      [stripeSessionId]
    ) as any;
    const findRows = Array.isArray(findResult) ? findResult[0] : [];
    const findArr = Array.isArray(findRows) ? findRows : [];
    const item = findArr[0];

    if (!item) {
      console.error("[PaymentProcessor] Item no encontrado:", stripeSessionId);
      return false;
    }

    if (item.status === "completed") {
      console.log("[PaymentProcessor] Ya completado:", stripeSessionId);
      return true;
    }

    // Marcar como processing
    await client.execute(
      "UPDATE paymentQueue SET status='processing', attempts=attempts+1, updatedAt=NOW() WHERE stripeSessionId=?",
      [stripeSessionId]
    );

    // Verificar idempotencia — ¿ya tiene creditBatch reciente?
    const batchResult = await client.execute(
      "SELECT id FROM creditBatches WHERE userId=? AND source=? AND createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR) LIMIT 1",
      [item.userId, item.productType]
    ) as any;
    const batchRows = Array.isArray(batchResult) ? batchResult[0] : [];
    const batchArr = Array.isArray(batchRows) ? batchRows : [];

    if (batchArr.length > 0) {
      await client.execute(
        "UPDATE paymentQueue SET status='completed', processedAt=NOW(), updatedAt=NOW() WHERE stripeSessionId=?",
        [stripeSessionId]
      );
      console.log("[PaymentProcessor] Ya tenía creditBatch:", stripeSessionId);
      return true;
    }

    // Acreditar créditos
    const { addCreditBatch } = await import("./credits");
    await addCreditBatch(item.userId, item.productType as CreditSource);

    // Marcar como completado
    await client.execute(
      "UPDATE paymentQueue SET status='completed', processedAt=NOW(), updatedAt=NOW() WHERE stripeSessionId=?",
      [stripeSessionId]
    );

    console.log(`[PaymentProcessor] ✅ ${item.credits} créditos acreditados — userId=${item.userId} productType=${item.productType}`);
    return true;

  } catch (err: any) {
    // Leer attempts actuales para decidir status
    let attempts = 1;
    try {
      const attResult = await client.execute(
        "SELECT attempts FROM paymentQueue WHERE stripeSessionId=? LIMIT 1",
        [stripeSessionId]
      ) as any;
      const attRows = Array.isArray(attResult) ? attResult[0] : [];
      const attArr = Array.isArray(attRows) ? attRows : [];
      attempts = attArr[0]?.attempts ?? 1;
    } catch {}

    const newStatus = attempts >= 3 ? "failed" : "pending";
    await client.execute(
      "UPDATE paymentQueue SET status=?, lastError=?, updatedAt=NOW() WHERE stripeSessionId=?",
      [newStatus, (err?.message ?? "Unknown error").slice(0, 500), stripeSessionId]
    ).catch(() => {});

    console.error(`[PaymentProcessor] ❌ Falló intento ${attempts}/3 — ${stripeSessionId}: ${err?.message}`);

    if (newStatus === "failed") {
      console.error(`[PaymentProcessor] 🚨 Pago FALLIDO permanentemente — ${stripeSessionId}. Requiere revisión manual.`);
    }

    return false;
  }
}

// Job de reintentos — procesa pagos pending con backoff de 2 minutos
export async function retryPendingPayments(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const client = (db as any).$client;

  try {
    const result = await client.execute(
      "SELECT stripeSessionId FROM paymentQueue WHERE status='pending' AND attempts < 3 AND updatedAt < DATE_SUB(NOW(), INTERVAL 2 MINUTE) LIMIT 10"
    ) as any;
    const rows = Array.isArray(result) ? result[0] : [];
    const arr = Array.isArray(rows) ? rows : [];

    if (arr.length > 0) {
      console.log(`[PaymentProcessor] Reintentando ${arr.length} pagos pendientes`);
      for (const row of arr) {
        await processPayment(row.stripeSessionId);
      }
    }
  } catch (err: any) {
    console.error("[PaymentProcessor] Error en retryPendingPayments:", err?.message);
  }
}
