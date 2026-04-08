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
// data: fallback cuando el INSERT en paymentQueue no persiste antes del SELECT (TiDB eventual consistency)
export async function processPayment(stripeSessionId: string, data?: {
  userId: number;
  productType: string;
  credits: number;
  amount: string;
  currency: string;
}): Promise<boolean> {
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
      if (data) {
        console.warn("[PaymentProcessor] Item no encontrado en DB, procesando con data directa:", stripeSessionId);

        // Idempotencia: verificar que no se haya acreditado en las últimas 24h
        const existingBatch = await new Promise<any[]>((resolve) => {
          client.execute(
            `SELECT id FROM creditBatches WHERE userId = ? AND source = ? AND createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
            [data.userId, data.productType],
            (err: any, results: any) => resolve(Array.isArray(results) ? results : [])
          );
        });

        if (existingBatch.length > 0) {
          console.log(`[PaymentProcessor] Fallback skipped — creditBatch reciente encontrado para userId=${data.userId} source=${data.productType}`);
        } else {
          const { addCreditBatch } = await import("./credits");
          await addCreditBatch(data.userId, data.productType as CreditSource);
          console.log(`[PaymentProcessor] ✅ ${data.credits} créditos acreditados directamente — userId=${data.userId}`);
        }

        // best-effort: insertar como completado para idempotencia futura
        try {
          await client.execute(
            "INSERT INTO paymentQueue (stripeSessionId, userId, productType, credits, amount, currency, status, processedAt) VALUES (?, ?, ?, ?, ?, ?, 'completed', NOW()) ON DUPLICATE KEY UPDATE status='completed', processedAt=NOW(), updatedAt=NOW()",
            [stripeSessionId, data.userId, data.productType, data.credits, data.amount, data.currency]
          );
        } catch (e: any) {
          console.warn("[PaymentProcessor] No se pudo registrar en cola:", e?.message);
        }
        return true;
      }
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
    const { addCreditBatch, CREDIT_COSTS } = await import("./credits");
    await addCreditBatch(item.userId, item.productType as CreditSource);

    // Marcar como completado
    await client.execute(
      "UPDATE paymentQueue SET status='completed', processedAt=NOW(), updatedAt=NOW() WHERE stripeSessionId=?",
      [stripeSessionId]
    );

    console.log(`[PaymentProcessor] ✅ ${item.credits} créditos acreditados — userId=${item.userId} productType=${item.productType}`);

    // Enviar email de confirmación de compra (non-blocking)
    try {
      const userRows = await new Promise<any[]>((resolve) => {
        client.execute(
          "SELECT email, name FROM `users` WHERE id = ? LIMIT 1",
          [item.userId],
          (err: any, results: any) => resolve(Array.isArray(results) ? results : [])
        );
      });
      const u = userRows[0];
      if (u?.email) {
        const { sendCreditsPurchaseConfirmation } = await import("./email");
        sendCreditsPurchaseConfirmation({
          userEmail: u.email,
          userName: u.name ?? "Usuario",
          credits: item.credits,
          priceMXN: CREDIT_COSTS[item.productType as CreditSource] ?? item.credits,
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        }).catch(() => {});
      }
    } catch {}
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
