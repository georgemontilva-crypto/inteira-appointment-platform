/**
 * paymentProcessor.ts — Cola de pagos con reintentos
 *
 * Flujo:
 * 1. Webhook de Stripe inserta en paymentQueue (INSERT IGNORE — idempotente)
 * 2. processPayment() acredita créditos y marca como completed
 * 3. Si falla, queda en pending para reintento automático
 * 4. retryPendingPayments() corre cada 2 minutos buscando pending
 * 5. Después de MAX_ATTEMPTS fallos, marca como failed y alerta por consola
 */

import { getDb } from "./db";
import { addCreditBatch, type CreditSource } from "./credits";

const MAX_ATTEMPTS = 3;

// Procesar un pago de la cola
export async function processPayment(queueId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const client = (db as any).$client;

  // Marcar como processing
  await client.execute(
    "UPDATE paymentQueue SET status='processing', attempts=attempts+1, updatedAt=NOW() WHERE id=?",
    [queueId]
  );

  try {
    // Obtener el item de la cola
    const [rows] = await client.execute(
      "SELECT * FROM paymentQueue WHERE id=? LIMIT 1",
      [queueId]
    ) as any;
    const item = Array.isArray(rows) ? rows[0] : null;
    if (!item) throw new Error("Queue item not found");

    // Idempotencia: verificar si ya existe un creditBatch reciente para este pago
    const [batchRows] = await client.execute(
      "SELECT id FROM creditBatches WHERE userId=? AND source=? AND createdAt >= DATE_SUB(NOW(), INTERVAL 1 HOUR) LIMIT 1",
      [item.userId, item.productType]
    ) as any;
    const existingBatch = Array.isArray(batchRows) ? batchRows[0] : null;

    if (existingBatch) {
      // Ya fue procesado — marcar como completado sin duplicar créditos
      await client.execute(
        "UPDATE paymentQueue SET status='completed', processedAt=NOW(), updatedAt=NOW() WHERE id=?",
        [queueId]
      );
      console.log(`[PaymentProcessor] ⏭ Ya procesado (batch existente) — queueId=${queueId} userId=${item.userId}`);
      return true;
    }

    // Acreditar créditos
    await addCreditBatch(item.userId, item.productType as CreditSource);

    // Marcar como completado
    await client.execute(
      "UPDATE paymentQueue SET status='completed', processedAt=NOW(), updatedAt=NOW() WHERE id=?",
      [queueId]
    );

    console.log(`[PaymentProcessor] ✅ Procesado — userId=${item.userId} productType=${item.productType} credits=${item.credits}`);
    return true;

  } catch (err: any) {
    // Leer intentos actuales para decidir si marcar como failed
    const [currentRows] = await client.execute(
      "SELECT attempts FROM paymentQueue WHERE id=? LIMIT 1",
      [queueId]
    ) as any;
    const attempts = Array.isArray(currentRows) ? (currentRows[0]?.attempts ?? 1) : 1;

    const newStatus = attempts >= MAX_ATTEMPTS ? "failed" : "pending";
    await client.execute(
      "UPDATE paymentQueue SET status=?, lastError=?, updatedAt=NOW() WHERE id=?",
      [newStatus, (err?.message ?? "Unknown error").slice(0, 500), queueId]
    );

    console.error(`[PaymentProcessor] ❌ Falló intento ${attempts}/${MAX_ATTEMPTS} — queueId=${queueId}: ${err?.message}`);

    if (newStatus === "failed") {
      console.error(`[PaymentProcessor] 🚨 Pago FALLIDO permanentemente — queueId=${queueId}. Requiere revisión manual en la tabla paymentQueue.`);
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
    const [rows] = await client.execute(
      "SELECT id FROM paymentQueue WHERE status='pending' AND attempts < ? AND updatedAt < DATE_SUB(NOW(), INTERVAL 2 MINUTE) LIMIT 10",
      [MAX_ATTEMPTS]
    ) as any;
    const pending = Array.isArray(rows) ? rows : [];

    if (pending.length > 0) {
      console.log(`[PaymentProcessor] Reintentando ${pending.length} pagos pendientes`);
      for (const row of pending) {
        await processPayment(row.id);
      }
    }
  } catch (err: any) {
    console.error("[PaymentProcessor] Error en retryPendingPayments:", err?.message);
  }
}
