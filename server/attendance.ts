// server/attendance.ts
// Decide si una cita realmente ocurrió, a partir de la presencia real en la
// sala de Daily. No basta con "entró": ambas partes tienen que haber coincidido
// dentro de la sala durante un mínimo de tiempo.

import { fetchRoomPresence, parseParticipantId } from "./videocall";

/** Minutos que ambas partes deben coincidir para dar la cita por ocurrida. */
export const MIN_OVERLAP_MINUTES = 5;

export type AttendanceVerdict =
  | { outcome: "held"; overlapMinutes: number }
  | { outcome: "professional_absent" }
  | { outcome: "user_absent" }
  | { outcome: "inconclusive"; reason: string };

interface PresenceRow {
  role: "user" | "professional" | "unknown";
  joinedAt: Date;
  leftAt: Date | null;
}

/**
 * Minutos en que al menos un intervalo de cada rol se solapan.
 * Una sesión sin `leftAt` se considera abierta hasta `fallbackEnd`.
 */
export function computeOverlapMinutes(
  rows: PresenceRow[],
  fallbackEnd: Date
): number {
  const toRanges = (role: "user" | "professional") =>
    rows
      .filter((r) => r.role === role)
      .map((r) => ({
        start: r.joinedAt.getTime(),
        end: (r.leftAt ?? fallbackEnd).getTime(),
      }))
      .filter((r) => r.end > r.start);

  const userRanges = toRanges("user");
  const profRanges = toRanges("professional");
  if (userRanges.length === 0 || profRanges.length === 0) return 0;

  let totalMs = 0;
  for (const u of userRanges) {
    for (const p of profRanges) {
      const overlap = Math.min(u.end, p.end) - Math.max(u.start, p.start);
      if (overlap > 0) totalMs += overlap;
    }
  }
  return totalMs / 60000;
}

/**
 * Lee la presencia guardada por los webhooks y, si hace falta, la completa
 * preguntándole a Daily. Devuelve las filas ya combinadas.
 */
export async function loadPresence(
  client: any,
  appointmentId: number,
  roomName: string | null
): Promise<PresenceRow[]> {
  const exec = (sql: string, params: any[] = []) =>
    new Promise<any[]>((resolve) => {
      client.execute(sql, params, (err: any, results: any) => {
        if (err) {
          console.error("[Attendance] query error:", err?.message);
          resolve([]);
        } else resolve(Array.isArray(results) ? results : []);
      });
    });

  const stored = await exec(
    "SELECT role, joinedAt, leftAt FROM callPresence WHERE appointmentId = ?",
    [appointmentId]
  );

  const rows: PresenceRow[] = stored.map((r: any) => ({
    role: r.role,
    joinedAt: new Date(r.joinedAt),
    leftAt: r.leftAt ? new Date(r.leftAt) : null,
  }));

  const haveBothRoles =
    rows.some((r) => r.role === "user") && rows.some((r) => r.role === "professional");

  // Reconciliación: si falta información, puede que se haya perdido un webhook
  // (deploy, caída momentánea). Se le pregunta a Daily directamente.
  if (!haveBothRoles && roomName) {
    const remote = await fetchRoomPresence(roomName);
    for (const p of remote) {
      const identity = parseParticipantId(p.userId);
      const role = identity?.role ?? "unknown";
      const alreadyKnown = rows.some(
        (r) => r.role === role && Math.abs(r.joinedAt.getTime() - p.joinedAt.getTime()) < 5000
      );
      if (alreadyKnown) continue;
      rows.push({ role, joinedAt: p.joinedAt, leftAt: p.leftAt });
      await new Promise<void>((resolve) => {
        client.execute(
          `INSERT IGNORE INTO callPresence
             (appointmentId, roomName, role, participantId, sessionId, joinedAt, leftAt, source)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'reconciliation')`,
          [
            appointmentId,
            roomName,
            role,
            p.userId ?? null,
            `recon-${appointmentId}-${p.userId ?? "anon"}-${p.joinedAt.getTime()}`,
            p.joinedAt.toISOString().slice(0, 19).replace("T", " "),
            p.leftAt ? p.leftAt.toISOString().slice(0, 19).replace("T", " ") : null,
          ],
          () => resolve()
        );
      });
    }
    if (remote.length > 0) {
      console.log(`[Attendance] cita ${appointmentId}: reconciliadas ${remote.length} sesiones desde Daily`);
    }
  }

  return rows;
}

export function decideAttendance(
  rows: PresenceRow[],
  fallbackEnd: Date
): AttendanceVerdict {
  const identified = rows.filter((r) => r.role !== "unknown");

  // Sin ningún dato no se asume nada: puede que el webhook no esté configurado
  // todavía, o que la sala se haya usado sin tokens de identidad.
  if (identified.length === 0) {
    return {
      outcome: "inconclusive",
      reason: rows.length > 0
        ? "hubo participantes pero ninguno identificado"
        : "sin registro de presencia",
    };
  }

  const profPresent = identified.some((r) => r.role === "professional");
  const userPresent = identified.some((r) => r.role === "user");

  if (!profPresent && !userPresent) {
    return { outcome: "inconclusive", reason: "sin roles reconocidos" };
  }
  if (!profPresent) return { outcome: "professional_absent" };
  if (!userPresent) return { outcome: "user_absent" };

  const overlapMinutes = computeOverlapMinutes(identified, fallbackEnd);
  if (overlapMinutes >= MIN_OVERLAP_MINUTES) {
    return { outcome: "held", overlapMinutes };
  }

  // Ambos entraron pero nunca coincidieron lo suficiente: no se castiga a
  // nadie automáticamente, lo revisa una persona.
  return {
    outcome: "inconclusive",
    reason: `ambos entraron pero solo coincidieron ${overlapMinutes.toFixed(1)} min`,
  };
}
