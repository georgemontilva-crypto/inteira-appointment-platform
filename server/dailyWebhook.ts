// server/dailyWebhook.ts
// Recibe los eventos participant.joined / participant.left de Daily.co y guarda
// la presencia REAL en la sala. Es la fuente de verdad para decidir si una cita
// ocurrió, en vez de depender de un clic en la app.

import type { Express, Request, Response } from "express";
import express from "express";
import crypto from "crypto";
import { parseParticipantId } from "./videocall";

const WEBHOOK_SECRET = process.env.DAILY_WEBHOOK_SECRET ?? "";

/**
 * El roomName tiene el formato `cita-<appointmentId>-<timestamp>`.
 */
function appointmentIdFromRoom(roomName: string): number | null {
  const match = /^cita-(\d+)-/.exec(roomName ?? "");
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) ? id : null;
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Daily firma con HMAC-SHA256 sobre `<X-Webhook-Timestamp>.<cuerpo>`, usando el
 * secreto decodificado desde base64. Su documentación usa JSON.stringify del
 * evento ya parseado; aceptamos ambas variantes porque la reserialización puede
 * diferir del cuerpo crudo en espacios o en el orden de las claves.
 */
function verifySignature(rawBody: Buffer, timestamp: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return false;
  const secret = Buffer.from(WEBHOOK_SECRET, "base64");
  const raw = rawBody.toString("utf8");

  const candidates = [raw];
  try {
    candidates.push(JSON.stringify(JSON.parse(raw)));
  } catch {
    // cuerpo no parseable — solo se compara contra el crudo
  }

  for (const body of candidates) {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${timestamp}.${body}`)
      .digest("base64");
    if (timingSafeEqual(expected, signature)) return true;
  }
  return false;
}

function toMysqlDatetime(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toISOString().slice(0, 19).replace("T", " ");
}

async function handleEvent(event: any): Promise<void> {
  const type = event?.type;
  if (type !== "participant.joined" && type !== "participant.left") return;

  const payload = event.payload ?? {};
  const roomName: string = payload.room ?? "";
  const sessionId: string = payload.session_id ?? "";
  if (!roomName || !sessionId) return;

  const appointmentId = appointmentIdFromRoom(roomName);
  if (!appointmentId) {
    console.warn(`[DailyWebhook] room "${roomName}" no corresponde a una cita`);
    return;
  }

  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) return;
  const client = (db as any).$client;

  const exec = (sql: string, params: any[] = []) =>
    new Promise<any>((resolve, reject) => {
      client.execute(sql, params, (err: any, results: any) =>
        err ? reject(err) : resolve(results)
      );
    });

  const identity = parseParticipantId(payload.user_id);
  const role = identity?.role ?? "unknown";

  if (type === "participant.joined") {
    const joinedAt = toMysqlDatetime(payload.joined_at ?? Date.now() / 1000);
    // El evento puede llegar duplicado; sessionId es UNIQUE, así que el
    // INSERT ... ON DUPLICATE KEY UPDATE lo vuelve idempotente.
    await exec(
      `INSERT INTO callPresence
         (appointmentId, roomName, role, participantId, sessionId, joinedAt, source)
       VALUES (?, ?, ?, ?, ?, ?, 'webhook')
       ON DUPLICATE KEY UPDATE role = VALUES(role), joinedAt = VALUES(joinedAt)`,
      [appointmentId, roomName, role, payload.user_id ?? null, sessionId, joinedAt]
    );

    // Espejo en appointments para consultas rápidas y compatibilidad con el
    // camino anterior basado en clic.
    if (role === "professional") {
      await exec(
        "UPDATE appointments SET professionalJoinedAt = COALESCE(professionalJoinedAt, ?) WHERE id = ?",
        [joinedAt, appointmentId]
      );
    } else if (role === "user") {
      await exec(
        "UPDATE appointments SET userJoinedAt = COALESCE(userJoinedAt, ?) WHERE id = ?",
        [joinedAt, appointmentId]
      );
    }
    console.log(`[DailyWebhook] joined ${role} en cita ${appointmentId}`);
    return;
  }

  // participant.left
  const leftEpoch =
    payload.left_at ??
    (payload.joined_at != null && payload.duration != null
      ? payload.joined_at + payload.duration
      : Date.now() / 1000);
  await exec(
    `UPDATE callPresence SET leftAt = ? WHERE sessionId = ? AND leftAt IS NULL`,
    [toMysqlDatetime(leftEpoch), sessionId]
  );
  console.log(`[DailyWebhook] left ${role} en cita ${appointmentId}`);
}

export function registerDailyWebhook(app: Express): void {
  app.post(
    "/api/webhooks/daily",
    express.raw({ type: "application/json", limit: "1mb" }),
    (req: Request, res: Response) => {
      const rawBody: Buffer = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(JSON.stringify(req.body ?? {}));

      let event: any;
      try {
        event = JSON.parse(rawBody.toString("utf8"));
      } catch {
        res.status(400).send("invalid json");
        return;
      }

      // Daily manda un evento de prueba al crear el webhook y espera un 200
      // rápido. Se responde antes de procesar para no bloquear la entrega.
      if (event?.test === "test" || event?.type === "test") {
        res.status(200).send("ok");
        return;
      }

      const timestamp = req.header("X-Webhook-Timestamp") ?? "";
      const signature = req.header("X-Webhook-Signature") ?? "";

      if (!WEBHOOK_SECRET) {
        console.error("[DailyWebhook] DAILY_WEBHOOK_SECRET no está configurado");
        res.status(500).send("not configured");
        return;
      }
      if (!verifySignature(rawBody, timestamp, signature)) {
        console.warn("[DailyWebhook] firma inválida — evento descartado");
        res.status(401).send("invalid signature");
        return;
      }

      // Responder primero, procesar después: si tardamos, Daily marca el
      // endpoint como fallido y desactiva el webhook.
      res.status(200).send("ok");
      handleEvent(event).catch((err) =>
        console.error("[DailyWebhook] error procesando evento:", err?.message)
      );
    }
  );
  console.log("[DailyWebhook] endpoint registrado en /api/webhooks/daily");
}
