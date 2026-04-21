import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

function getGoogleRedirectUri(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] ?? req.protocol;
  const host = req.headers["x-forwarded-host"] ?? req.headers.host;
  return `${proto}://${host}/api/auth/google/callback`;
}

export function registerOAuthRoutes(app: Express) {
  // ── Google OAuth: iniciar flujo ──────────────────────────────────────────────
  app.get("/api/auth/google", (req: Request, res: Response) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: "Google OAuth not configured. Set GOOGLE_CLIENT_ID." });
    }

    const redirectUri = getGoogleRedirectUri(req);
    const returnTo = (req.query.returnTo as string) ?? "/dashboard";
    const state = Buffer.from(JSON.stringify({ returnTo })).toString("base64url");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "offline",
      prompt: "select_account",
    });

    return res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
  });

  // ── Google OAuth: callback ───────────────────────────────────────────────────
  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const { code, state, error } = req.query as Record<string, string>;

    if (error || !code) {
      console.error("[Google OAuth] Error or missing code:", error);
      return res.redirect("/?error=auth_failed");
    }

    let returnTo = "/dashboard";
    try {
      if (state) {
        const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
        if (decoded.returnTo) returnTo = decoded.returnTo;
      }
    } catch {
      // ignore malformed state
    }

    try {
      const clientId = process.env.GOOGLE_CLIENT_ID!;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
      const redirectUri = getGoogleRedirectUri(req);

      // 1. Intercambiar code por tokens
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = (await tokenRes.json()) as {
        access_token?: string;
        error?: string;
      };

      if (!tokenData.access_token) {
        console.error("[Google OAuth] Token exchange failed:", tokenData?.error ?? "unknown error");
        return res.redirect("/?error=token_exchange_failed");
      }

      // 2. Obtener información del usuario
      const userInfoRes = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      const userInfo = (await userInfoRes.json()) as {
        sub: string;       // Google user ID (openId)
        email: string;
        name?: string;
        picture?: string;
        email_verified?: boolean;
      };

      if (!userInfo.sub || !userInfo.email) {
        console.error("[Google OAuth] Missing user info:", userInfo);
        return res.redirect("/?error=missing_user_info");
      }

      // 3. Upsert usuario en la base de datos
      const existingUser = await db.getUserByOpenId(`google:${userInfo.sub}`).catch(() => null);
      const isNewUser = !existingUser;

      await db.upsertUser({
        openId: `google:${userInfo.sub}`,
        email: userInfo.email,
        name: userInfo.name ?? null,
        loginMethod: "google",
        lastSignedIn: new Date(),
        profileImage: userInfo.picture ?? null,
      });

      // 3b. Verificar que el usuario quedó persistido antes de emitir cookie
      const dbUser = await db.getUserByOpenId(`google:${userInfo.sub}`);
      if (!dbUser) {
        console.error("[Google OAuth] Usuario no persistido en BD después de upsert");
        return res.redirect("/?error=auth_failed");
      }

      // Usar dbUser para el rol (elimina el segundo query redundante)
      if (returnTo === "/dashboard") {
        if (dbUser.role === "professional") returnTo = "/panel-profesional";
        else if (dbUser.role === "admin") returnTo = "/admin";
      }

      // 3c. Emails para usuarios nuevos (fire-and-forget)
      if (isNewUser && userInfo.email) {
        const { sendWelcomeEmail, sendAdminNewUserRegistration } = await import("../email");
        sendWelcomeEmail({
          userEmail: userInfo.email,
          userName: userInfo.name ?? userInfo.email,
        }).catch(() => {});
        const adminEmail = process.env.ADMIN_EMAIL ?? "marketingdedsm@gmail.com";
        sendAdminNewUserRegistration({
          userName: userInfo.name ?? userInfo.email,
          userEmail: userInfo.email,
          adminEmails: [adminEmail],
        }).catch(() => {});
      }

      // 4. Crear sesión JWT
      const sessionToken = await sdk.createSessionToken(`google:${userInfo.sub}`, {
        name: userInfo.name ?? userInfo.email,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      console.log("[Google OAuth] Setting cookie:", COOKIE_NAME, "options:", JSON.stringify(cookieOptions));
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      console.log("[Google OAuth] Cookie set, redirecting to:", returnTo);
      console.log("[Google OAuth] Response headers:", JSON.stringify(res.getHeaders()));

      // Delay redirect by 300ms so the browser has time to persist the Set-Cookie
      // header before navigating. A 302 or instant meta-refresh can race against
      // cookie processing in Safari/Chrome on cross-origin OAuth flows.
      const safeReturnTo = returnTo.startsWith("/") ? returnTo : "/dashboard";
      return res.send(`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Iniciando sesión...</title></head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f9fafb;">
  <div style="text-align:center;">
    <img src="https://pub-cc4c932d49594db4a582c5a9a78363f7.r2.dev/imagenes%20carrusel/Inteira-Verde-1.webp" style="height:40px;margin-bottom:16px;" />
    <p style="color:#6b7280;font-size:14px;">Iniciando sesión...</p>
  </div>
  <script>
    setTimeout(function() {
      window.location.replace(${JSON.stringify(safeReturnTo)});
    }, 300);
  </script>
</body>
</html>`);
    } catch (err) {
      console.error("[Google OAuth] Callback failed:", err);
      return res.redirect("/?error=auth_failed");
    }
  });

  // ── Mantener compatibilidad con ruta antigua (redirige a Google) ─────────────
  app.get("/api/oauth/callback", (_req: Request, res: Response) => {
    res.redirect("/api/auth/google");
  });
}
