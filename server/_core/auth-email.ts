import type { Request, Response } from "express";
import { Router } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import * as db from "../db";
import { getDb } from "../db";

export const emailAuthRouter = Router();

// ── POST /api/auth/email/request-otp — LOGIN (el usuario debe existir) ────────
emailAuthRouter.post("/request-otp", async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };

  if (!email?.trim()) {
    return res.status(400).json({ error: "El email es requerido" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Email inválido" });
  }

  const dbConn = await getDb();
  if (!dbConn) return res.status(500).json({ error: "DB no disponible" });
  const client = (dbConn as any).$client;

  // Verificar que el usuario exista
  const existingUser = await new Promise<any>((resolve) => {
    client.execute(
      "SELECT id, name FROM users WHERE email = ? LIMIT 1",
      [email],
      (err: any, results: any) => resolve(Array.isArray(results) ? results[0] : null)
    );
  });

  if (!existingUser) {
    return res.status(400).json({ error: "Este correo no está registrado", notRegistered: true });
  }

  // Rate limit: max 3 OTPs por email en la última hora
  const recentRows = await new Promise<any[]>((resolve) => {
    client.execute(
      "SELECT COUNT(*) as cnt FROM emailOtps WHERE email = ? AND createdAt > DATE_SUB(NOW(), INTERVAL 1 HOUR)",
      [email],
      (err: any, results: any) => resolve(Array.isArray(results) ? results : [])
    );
  });
  if (Number(recentRows[0]?.cnt) >= 3) {
    return res.status(429).json({ error: "Demasiados intentos. Espera una hora." });
  }

  // Invalidar OTPs anteriores no usados para este email
  await new Promise<void>((resolve) => {
    client.execute(
      "UPDATE emailOtps SET used = TRUE WHERE email = ? AND used = FALSE",
      [email],
      () => resolve()
    );
  });

  // Derivar nombre del usuario almacenado en BD
  const parts = (existingUser.name ?? "").split(" ");
  const firstName = parts[0] ?? "Usuario";
  const lastName = parts.slice(1).join(" ") ?? "";

  // Generar código de 6 dígitos
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const expiresStr = expiresAt.toISOString().slice(0, 19).replace("T", " ");

  await new Promise<void>((resolve, reject) => {
    client.execute(
      "INSERT INTO emailOtps (email, code, firstName, lastName, expiresAt) VALUES (?, ?, ?, ?, ?)",
      [email, code, firstName, lastName, expiresStr],
      (err: any) => { if (err) reject(err); else resolve(); }
    );
  });

  const { sendOtpEmail } = await import("../email");
  await sendOtpEmail({ email, firstName, code });

  return res.json({ success: true });
});

// ── POST /api/auth/email/register-otp — REGISTRO (crea nuevos usuarios) ───────
emailAuthRouter.post("/register-otp", async (req: Request, res: Response) => {
  const { firstName, lastName, email } = req.body as {
    firstName?: string;
    lastName?: string;
    email?: string;
  };

  if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
    return res.status(400).json({ error: "Datos incompletos" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Email inválido" });
  }

  const dbConn = await getDb();
  if (!dbConn) return res.status(500).json({ error: "DB no disponible" });
  const client = (dbConn as any).$client;

  // Rate limit: max 3 OTPs por email en la última hora
  const recentRows = await new Promise<any[]>((resolve) => {
    client.execute(
      "SELECT COUNT(*) as cnt FROM emailOtps WHERE email = ? AND createdAt > DATE_SUB(NOW(), INTERVAL 1 HOUR)",
      [email],
      (err: any, results: any) => resolve(Array.isArray(results) ? results : [])
    );
  });
  if (Number(recentRows[0]?.cnt) >= 3) {
    return res.status(429).json({ error: "Demasiados intentos. Espera una hora." });
  }

  // Invalidar OTPs anteriores no usados para este email
  await new Promise<void>((resolve) => {
    client.execute(
      "UPDATE emailOtps SET used = TRUE WHERE email = ? AND used = FALSE",
      [email],
      () => resolve()
    );
  });

  // Generar código de 6 dígitos
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const expiresStr = expiresAt.toISOString().slice(0, 19).replace("T", " ");

  await new Promise<void>((resolve, reject) => {
    client.execute(
      "INSERT INTO emailOtps (email, code, firstName, lastName, expiresAt) VALUES (?, ?, ?, ?, ?)",
      [email, code, firstName.trim(), lastName.trim(), expiresStr],
      (err: any) => { if (err) reject(err); else resolve(); }
    );
  });

  const { sendOtpEmail } = await import("../email");
  await sendOtpEmail({ email, firstName: firstName.trim(), code });

  return res.json({ success: true });
});

// ── POST /api/auth/email/verify-otp ──────────────────────────────────────────
emailAuthRouter.post("/verify-otp", async (req: Request, res: Response) => {
  const { email, code } = req.body as { email?: string; code?: string };

  if (!email?.trim() || !code?.trim()) {
    return res.status(400).json({ error: "Datos incompletos" });
  }

  const dbConn = await getDb();
  if (!dbConn) return res.status(500).json({ error: "DB no disponible" });
  const client = (dbConn as any).$client;

  // Verificar OTP válido y no expirado
  const otpRows = await new Promise<any[]>((resolve) => {
    client.execute(
      "SELECT * FROM emailOtps WHERE email = ? AND code = ? AND used = FALSE AND expiresAt > NOW() LIMIT 1",
      [email, code],
      (err: any, results: any) => resolve(Array.isArray(results) ? results : [])
    );
  });

  if (otpRows.length === 0) {
    return res.status(400).json({ error: "Código inválido o expirado" });
  }

  const otp = otpRows[0];

  // Marcar OTP como usado
  await new Promise<void>((resolve) => {
    client.execute("UPDATE emailOtps SET used = TRUE WHERE id = ?", [otp.id], () => resolve());
  });

  // Detectar si es usuario nuevo antes del upsert
  const openId = `email:${email}`;
  const existingUser = await db.getUserByOpenId(openId).catch(() => null);
  const isNewUser = !existingUser;

  // Upsert usuario — mismo patrón que oauth.ts
  const fullName = `${otp.firstName} ${otp.lastName}`.trim();
  await db.upsertUser({
    openId,
    email,
    name: fullName,
    loginMethod: "email",
    lastSignedIn: new Date(),
  });
  console.log("[Email OTP] upsertUser completed for:", email);

  // Debug: buscar también por email para ver si el problema es el openId
  const userByEmail = await new Promise<any>((resolve) => {
    client.execute(
      "SELECT id, openId, email FROM users WHERE email = ? LIMIT 1",
      [email],
      (err: any, results: any) => resolve(Array.isArray(results) ? results[0] ?? null : null)
    );
  });
  console.log("[Email OTP] SELECT by email result:", userByEmail ? `found id=${userByEmail.id} openId=${userByEmail.openId}` : "NOT FOUND BY EMAIL EITHER");

  const dbClient = (dbConn as any).$client;
  const selectUser = () => new Promise<any>((resolve) => {
    dbClient.execute(
      "SELECT id, role, name, email FROM users WHERE openId = ? LIMIT 1",
      [openId],
      (err: any, results: any) => resolve(Array.isArray(results) ? results[0] ?? null : null)
    );
  });
  console.log("[Email OTP] Searching for openId:", openId, "email:", email);
  let dbUser = await selectUser();
  console.log("[Email OTP] First SELECT result:", dbUser ? `found id=${dbUser.id}` : "NOT FOUND", "openId:", openId);
  if (!dbUser) {
    await new Promise(r => setTimeout(r, 1500));
    dbUser = await selectUser();
    console.log("[Email OTP] Retry SELECT result:", dbUser ? `found id=${dbUser.id}` : "STILL NOT FOUND");
  }
  if (!dbUser) {
    // Último intento: buscar por email (el usuario puede tener openId diferente)
    dbUser = await new Promise<any>((resolve) => {
      client.execute(
        "SELECT id, role, name, email FROM users WHERE email = ? LIMIT 1",
        [email],
        (err: any, results: any) => resolve(Array.isArray(results) ? results[0] ?? null : null)
      );
    });
    if (dbUser) {
      console.log("[Email OTP] Found user by email fallback, id:", dbUser.id);
      // Actualizar openId para futuros logins por email
      await new Promise<void>((resolve) => {
        client.execute(
          "UPDATE users SET openId = ? WHERE id = ?",
          [openId, dbUser.id],
          () => resolve()
        );
      });
    }
  }
  if (!dbUser) {
    console.error("[Email OTP] Usuario no encontrado ni por openId ni por email");
    return res.status(500).json({ error: "Error al crear la sesión. Por favor intenta de nuevo." });
  }

  // Crear sesión JWT — mismo patrón que oauth.ts
  const sessionToken = await sdk.createSessionToken(openId, {
    name: fullName,
    expiresInMs: ONE_YEAR_MS,
  });

  // Setear cookie — mismo patrón que oauth.ts
  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

  // Destino siempre determinado por el rol
  let destination = "/dashboard";
  if (dbUser.role === "professional") destination = "/panel-profesional";
  else if (dbUser.role === "admin") destination = "/admin";

  // Emails de bienvenida solo para usuarios nuevos (fire-and-forget)
  if (isNewUser) {
    const { sendWelcomeEmail, sendAdminNewUserRegistration } = await import("../email");
    sendWelcomeEmail({ userEmail: email, userName: otp.firstName }).catch(() => {});
    const adminEmail = process.env.ADMIN_EMAIL ?? "marketingdedsm@gmail.com";
    sendAdminNewUserRegistration({
      userName: fullName,
      userEmail: email,
      adminEmails: [adminEmail],
    }).catch(() => {});
  }

  return res.json({ success: true, redirectTo: destination });
});
