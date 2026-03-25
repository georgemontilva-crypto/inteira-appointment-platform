/**
 * stripe.ts — Integración de Stripe para Inteira
 *
 * Flujo:
 * 1. Frontend llama a /api/stripe/create-checkout con el producto a comprar
 * 2. Backend crea una Stripe Checkout Session y devuelve la URL
 * 3. Usuario completa el pago en Stripe
 * 4. Stripe envía un webhook a /api/stripe/webhook
 * 5. Backend verifica el webhook y acredita los créditos al usuario
 *
 * IMPORTANTE: registerStripeRoutes() se llama ANTES de express.json() en index.ts.
 * Por eso cada ruta necesita su propio middleware de body parsing:
 *   - create-checkout: express.json()  (necesita el body parseado)
 *   - webhook:         express.raw()   (necesita el body sin parsear para verificar firma HMAC)
 */

import Stripe from "stripe";
import express from "express";
import type { Express, Request, Response } from "express";
import * as db from "./db";
import { CREDIT_COSTS, addCreditBatch, type CreditSource } from "./credits";
import { processPayment } from "./paymentProcessor";
import { sdk } from "./_core/sdk";

// ─── Configuración ────────────────────────────────────────────────────────────

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY no está configurado");
  return new Stripe(key, { apiVersion: "2026-02-25.clover" });
}

// Precios en centavos de MXN (1 crédito = 1 MXN)
const PRODUCT_PRICES: Record<CreditSource, { amount: number; name: string; description: string }> = {
  individual_basic: {
    amount: 35000,       // $350 MXN en centavos
    name: "Sesión Básica",
    description: "350 créditos · Válidos por 60 días",
  },
  individual_premium: {
    amount: 125000,      // $1,250 MXN en centavos
    name: "Sesión Premium",
    description: "1,250 créditos · Válidos por 60 días",
  },
  plan_basic: {
    amount: 98000,       // $980 MXN en centavos
    name: "Plan Básico",
    description: "980 créditos mensuales · Válidos por 60 días",
  },
  plan_pro: {
    amount: 250000,      // $2,500 MXN en centavos
    name: "Plan Pro",
    description: "2,500 créditos mensuales · Válidos por 60 días",
  },
};

// ─── Registro de rutas Express ────────────────────────────────────────────────

export function registerStripeRoutes(app: Express) {

  // ── Crear sesión de Checkout ─────────────────────────────────────────────────
  // express.json() inline porque esta ruta se registra antes del middleware global
  app.post("/api/stripe/create-checkout", express.json(), async (req: Request, res: Response) => {
    try {
      let sessionUser;
      try {
        sessionUser = await sdk.authenticateRequest(req);
      } catch {
        return res.status(401).json({ error: "No autenticado" });
      }
      const userId = sessionUser.id;

      const stripe = getStripe();
      const { productType } = req.body as { productType: CreditSource };

      if (!productType) {
        return res.status(400).json({ error: "productType es requerido" });
      }

      const product = PRODUCT_PRICES[productType];
      if (!product) {
        return res.status(400).json({ error: "Tipo de producto inválido" });
      }

      const proto = req.headers["x-forwarded-proto"] ?? req.protocol;
      const host = req.headers["x-forwarded-host"] ?? req.headers.host;
      const baseUrl = `${proto}://${host}`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "mxn",
              product_data: {
                name: product.name,
                description: product.description,
              },
              unit_amount: product.amount,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${baseUrl}/wallet?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/planes?payment=cancelled`,
        metadata: {
          userId: String(userId),
          productType,
          credits: String(CREDIT_COSTS[productType]),
        },
        locale: "es",
      });

      return res.json({ url: session.url, sessionId: session.id });
    } catch (err) {
      console.error("[Stripe] Error creando checkout:", err);
      return res.status(500).json({ error: "Error al crear la sesión de pago" });
    }
  });

  // ── Webhook de Stripe ────────────────────────────────────────────────────────
  // express.raw() preserva el body como Buffer para verificar la firma HMAC de Stripe
  async function webhookHandler(req: Request, res: Response) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = req.headers["stripe-signature"] as string;

    let event: Stripe.Event;

    try {
      const stripe = getStripe();
      if (webhookSecret && signature) {
        // req.body es un Buffer gracias a express.raw()
        event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
      } else {
        // Sin webhook secret (desarrollo local sin Stripe CLI), parsear directamente
        console.warn("[Stripe] Webhook sin verificación de firma (solo para desarrollo)");
        const rawBody = req.body instanceof Buffer ? req.body.toString("utf8") : JSON.stringify(req.body);
        event = JSON.parse(rawBody) as Stripe.Event;
      }
    } catch (err) {
      console.error("[Stripe] Webhook signature verification failed:", err);
      return res.status(400).json({ error: "Webhook signature inválida" });
    }

    // Procesar eventos
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleSuccessfulPayment(session);
    }

    return res.json({ received: true });
  }

  app.post("/api/webhook/stripe", express.raw({ type: "application/json" }), webhookHandler);
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), webhookHandler);

  // ── Endpoint de recuperación de créditos ─────────────────────────────────────
  // Permite acreditar créditos manualmente a un usuario usando un token secreto.
  // Idempotente: no duplica créditos si se llama más de una vez.
  app.post("/api/stripe/recover-credits", express.json(), async (req: Request, res: Response) => {
    try {
      const { token, email, productType } = req.body as {
        token: string;
        email: string;
        productType: CreditSource;
      };

      const RECOVERY_TOKEN = "inteira-recovery-2026-jessie";
      if (token !== RECOVERY_TOKEN) {
        return res.status(403).json({ error: "Token inválido" });
      }

      if (!email || !productType) {
        return res.status(400).json({ error: "email y productType son requeridos" });
      }

      const dbConn = await db.getDb();
      if (!dbConn) return res.status(500).json({ error: "DB no disponible" });

      // Buscar el usuario por email
      const [rows] = await (dbConn as any).execute(
        `SELECT id FROM \`users\` WHERE \`email\` = ? LIMIT 1`,
        [email]
      );
      const userId: number | undefined = Array.isArray(rows) ? rows[0]?.id : rows?.id;

      if (!userId) {
        return res.status(404).json({ error: `Usuario ${email} no encontrado` });
      }

      // Idempotencia: verificar si ya fue procesado
      const recoveryId = `RECOVERY_${email.replace(/@/g, "_").replace(/\./g, "_")}_${productType}`;
      const existing = await db.getPaymentByStripeId(recoveryId);
      if (existing) {
        return res.json({ success: false, message: "Créditos ya acreditados anteriormente" });
      }

      // Registrar pago de recuperación
      await db.recordStripePayment({
        userId,
        stripePaymentId: recoveryId,
        amount: String(CREDIT_COSTS[productType]),
        currency: "MXN",
        productType,
      });

      // Acreditar créditos
      const batchId = await addCreditBatch(userId, productType);
      const credits = CREDIT_COSTS[productType];

      console.log(`[Recovery] ✅ ${credits} créditos acreditados a ${email} (userId=${userId}, batchId=${batchId})`);
      return res.json({
        success: true,
        userId,
        credits,
        batchId,
        message: `${credits} créditos acreditados a ${email}`,
      });
    } catch (err) {
      console.error("[Recovery] Error:", err);
      return res.status(500).json({ error: "Error al acreditar créditos" });
    }
  });
}

// ─── Lógica de pago exitoso ───────────────────────────────────────────────────

async function handleSuccessfulPayment(session: Stripe.Checkout.Session) {
  console.log("[Stripe] Processing", session.id, "metadata:", JSON.stringify(session.metadata));

  const { userId, productType, credits } = session.metadata ?? {};
  if (!userId || !productType || !credits) {
    console.error("[Stripe] Metadata incompleta:", session.metadata);
    return;
  }

  const userIdNum = parseInt(userId);
  const creditsNum = parseInt(credits);

  try {
    const db = await (await import("./db")).getDb();
    if (!db) throw new Error("DB not available");
    const client = (db as any).$client;

    // INSERT en cola
    await client.execute(
      "INSERT INTO paymentQueue (stripeSessionId, userId, productType, credits, amount, currency, status) VALUES (?, ?, ?, ?, ?, ?, 'pending') ON DUPLICATE KEY UPDATE updatedAt=NOW()",
      [session.id, userIdNum, productType, creditsNum, String((session.amount_total ?? 0) / 100), (session.currency ?? "mxn").toUpperCase()]
    );

    // Procesar directamente con stripeSessionId + datos como fallback
    const { processPayment } = await import("./paymentProcessor");
    await processPayment(session.id, {
      userId: userIdNum,
      productType,
      credits: creditsNum,
      amount: String((session.amount_total ?? 0) / 100),
      currency: (session.currency ?? "mxn").toUpperCase(),
    });
    console.log(`[Stripe] ✅ ${creditsNum} créditos procesados para userId=${userIdNum}`);

  } catch (err: any) {
    console.error("[Stripe] ❌ Error:", err?.message);
  }
}
