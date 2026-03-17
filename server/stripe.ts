/**
 * stripe.ts — Integración de Stripe para Inteira
 *
 * Flujo:
 * 1. Frontend llama a createCheckoutSession con el producto a comprar
 * 2. Backend crea una Stripe Checkout Session y devuelve la URL
 * 3. Usuario completa el pago en Stripe
 * 4. Stripe envía un webhook a /api/stripe/webhook
 * 5. Backend verifica el webhook y acredita los créditos al usuario
 */

import Stripe from "stripe";
import type { Express, Request, Response } from "express";
import * as db from "./db";
import { addCreditBatch, CREDIT_COSTS, type CreditSource } from "./credits";

// ─── Configuración ────────────────────────────────────────────────────────────

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY no está configurado");
  return new Stripe(key, { apiVersion: "2025-01-27.acacia" });
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
  app.post("/api/stripe/create-checkout", async (req: Request, res: Response) => {
    try {
      const stripe = getStripe();
      const { productType, userId } = req.body as {
        productType: CreditSource;
        userId: number;
      };

      if (!productType || !userId) {
        return res.status(400).json({ error: "productType y userId son requeridos" });
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
        cancel_url: `${baseUrl}/wallet?payment=cancelled`,
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
  app.post(
    "/api/stripe/webhook",
    // Necesitamos el body raw para verificar la firma
    (req: Request, res: Response, next) => {
      if (req.headers["content-type"] === "application/json") {
        let data = "";
        req.setEncoding("utf8");
        req.on("data", (chunk) => { data += chunk; });
        req.on("end", () => {
          (req as any).rawBody = data;
          next();
        });
      } else {
        next();
      }
    },
    async (req: Request, res: Response) => {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      const signature = req.headers["stripe-signature"] as string;
      const rawBody = (req as any).rawBody ?? JSON.stringify(req.body);

      let event: Stripe.Event;

      try {
        const stripe = getStripe();
        if (webhookSecret && signature) {
          event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
        } else {
          // Sin webhook secret (desarrollo local), parsear directamente
          console.warn("[Stripe] Webhook sin verificación de firma (solo para desarrollo)");
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
  );
}

// ─── Lógica de pago exitoso ───────────────────────────────────────────────────

async function handleSuccessfulPayment(session: Stripe.Checkout.Session) {
  try {
    const { userId, productType, credits } = session.metadata ?? {};

    if (!userId || !productType || !credits) {
      console.error("[Stripe] Webhook: metadata incompleta", session.metadata);
      return;
    }

    const userIdNum = parseInt(userId, 10);
    const creditsNum = parseInt(credits, 10);

    // Verificar que no se haya procesado ya este pago
    const existingPayment = await db.getPaymentByStripeId(session.id);
    if (existingPayment) {
      console.log("[Stripe] Pago ya procesado:", session.id);
      return;
    }

    // Registrar el pago
    await db.recordStripePayment({
      userId: userIdNum,
      stripePaymentId: session.id,
      amount: String((session.amount_total ?? 0) / 100),
      currency: (session.currency ?? "mxn").toUpperCase(),
      productType: productType as CreditSource,
    });

    // Acreditar créditos al usuario
    await addCreditBatch(userIdNum, productType as CreditSource);

    console.log(`[Stripe] ✅ Pago procesado: ${creditsNum} créditos para usuario ${userIdNum}`);
  } catch (err) {
    console.error("[Stripe] Error procesando pago exitoso:", err);
  }
}
