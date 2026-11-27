/**
 * Recorrido de punta a punta contra una base MySQL real:
 * compra de créditos → apartar cita → entrar o no → resultado del cron.
 *
 * Stripe y Daily se simulan con webhooks firmados de verdad (pasan por la
 * verificación de firma del servidor). La API de Daily se responde con un
 * fetch falso. No corre con `vitest`: necesita una base MySQL local.
 *
 * Cómo correrlo:
 *   1. MySQL 8 local en UTC (SET GLOBAL time_zone = '+00:00') y una base vacía.
 *   2. Aplicar drizzle/00*.sql en orden y arrancar una vez el servidor
 *      (npx tsx server/_core/index.ts) para que corran las migraciones.
 *   3. DATABASE_URL=… STRIPE_SECRET_KEY=sk_test_x STRIPE_WEBHOOK_SECRET=whsec_x
 *      DAILY_WEBHOOK_SECRET=<base64> DAILY_API_KEY=x TZ=UTC
 *      npx tsx server/__e2e__/flujo.e2e.ts
 */
import express from "express";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import Stripe from "stripe";

// ── Daily falso ──────────────────────────────────────────────────────────────
let dailyCaido = false;
const fetchReal = globalThis.fetch;
globalThis.fetch = (async (url: any, init?: any) => {
  const u = String(url);
  if (!u.includes("api.daily.co")) return fetchReal(url, init);
  if (dailyCaido) return new Response(JSON.stringify({ error: "unavailable" }), { status: 503 });
  if (u.endsWith("/rooms") && init?.method === "POST") {
    const body = JSON.parse(init.body);
    return new Response(JSON.stringify({ name: body.name, url: `https://inteira.daily.co/${body.name}` }), { status: 200 });
  }
  if (u.includes("/meeting-tokens")) return new Response(JSON.stringify({ token: "tok_" + crypto.randomUUID() }), { status: 200 });
  if (u.includes("/meetings")) return new Response(JSON.stringify({ data: [] }), { status: 200 });
  return new Response("{}", { status: 200 });
}) as any;

const resultados: { paso: string; ok: boolean; detalle?: string }[] = [];
function check(paso: string, ok: boolean, detalle?: any) {
  resultados.push({ paso, ok, detalle: detalle === undefined ? undefined : typeof detalle === "string" ? detalle : JSON.stringify(detalle) });
  console.log(`${ok ? "✅" : "❌"} ${paso}${detalle !== undefined && !ok ? "  → " + (typeof detalle === "string" ? detalle : JSON.stringify(detalle)) : ""}`);
}
async function espera<T>(fn: () => Promise<T>): Promise<{ ok: true; v: T } | { ok: false; e: any }> {
  try {
    return { ok: true, v: await fn() };
  } catch (e) {
    return { ok: false, e };
  }
}

async function main() {
  const db = await import("../db");
  const { appRouter } = await import("../routers");
  const { runAttendanceCron } = await import("../attendanceCron");
  const { registerStripeRoutes } = await import("../stripe");
  const { registerDailyWebhook } = await import("../dailyWebhook");

  const conn = await db.getDb();
  const client = (conn as any).$client;
  const q = (sql: string, p: any[] = []) =>
    new Promise<any>((res, rej) => client.execute(sql, p, (e: any, r: any) => (e ? rej(e) : res(r))));

  // ── Servidor HTTP con los webhooks reales ─────────────────────────────────
  const app = express();
  registerStripeRoutes(app);
  registerDailyWebhook(app);
  const server = app.listen(0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  // ── Datos de prueba ────────────────────────────────────────────────────────
  const marca = Date.now();
  const nuevoUsuario = async (nombre: string, role: "user" | "professional" | "admin") => {
    const r = await q(
      "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, 'email', ?)",
      [`e2e-${nombre}-${marca}`, nombre, `${nombre.toLowerCase()}-${marca}@prueba.test`, role]
    );
    const [u] = await q("SELECT * FROM users WHERE id = ?", [r.insertId]);
    return u;
  };
  const llamar = (user: any) =>
    appRouter.createCaller({ user, req: { headers: {}, ip: "127.0.0.1" } as any, res: { cookie() {}, clearCookie() {} } as any });

  const esp = await q("INSERT INTO specialties (name, description, slug) VALUES (?, 'e2e', ?)", [`Psico E2E ${marca}`, `psico-e2e-${marca}`]);
  const specialtyId = esp.insertId;
  const especialidadSlug = `psico-e2e-${marca}`;

  // Una migración vieja regala créditos al usuario 1: que no sea de la prueba.
  await nuevoUsuario("Relleno", "user");
  const ana = await nuevoUsuario("Ana", "user");
  const beto = await nuevoUsuario("Beto", "user");
  const sinSaldo = await nuevoUsuario("SinSaldo", "user");
  const admin = await nuevoUsuario("Admin", "admin");
  const uPro = await nuevoUsuario("Pablo", "professional"); // asesor básico, online
  const uPres = await nuevoUsuario("Paula", "professional"); // asesora pro, presencial y online

  const nuevoAsesor = async (u: any, tier: "basic" | "pro", modalidad: string) => {
    const r = await q(
      `INSERT INTO professionals (userId, specialtyId, licenseNumber, status, tier, slug, sessionModality, isAvailable)
       VALUES (?, ?, ?, 'approved', ?, ?, ?, 1)`,
      [u.id, specialtyId, `LIC-${u.id}-${marca}`, tier, `${u.name.toLowerCase()}-${marca}`, modalidad]
    );
    return r.insertId as number;
  };
  const proId = await nuevoAsesor(uPro, "basic", "online");
  const presId = await nuevoAsesor(uPres, "pro", "both");

  // Horario: todos los días 07:00–21:00. Pablo online; Paula mañana en
  // consultorio y tarde online.
  for (let d = 0; d < 7; d++) {
    await llamar(uPro).professional.setAvailability({ dayOfWeek: d, startTime: "07:00", endTime: "21:00" });
    await llamar(uPres).professional.setAvailability({ dayOfWeek: d, startTime: "07:00", endTime: "13:00", modality: "in_person" });
    await llamar(uPres).professional.setAvailability({ dayOfWeek: d, startTime: "14:00", endTime: "21:00", modality: "online" });
  }

  const TZ = -360; // México, UTC-6
  const saldo = async (u: any) => Number((await llamar(u).user.getWallet()).balance);
  // n-ésimo horario del día (07:00, 08:10, 09:20…) en UTC para México
  const fechaLocal = (diasAdelante: number, n: number) => {
    const minutosLocal = 7 * 60 + n * 70;
    const d = new Date(Date.now() + TZ * 60000);
    d.setUTCDate(d.getUTCDate() + diasAdelante);
    d.setUTCHours(0, minutosLocal - TZ, 0, 0);
    return d.toISOString().slice(0, 19).replace("T", " ");
  };
  const fechaISO = (diasAdelante: number) => {
    const d = new Date(Date.now() + TZ * 60000);
    d.setUTCDate(d.getUTCDate() + diasAdelante);
    return d.toISOString().slice(0, 10);
  };

  // ═══ 1. COMPRA DE CRÉDITOS (webhook de Stripe firmado) ═════════════════════
  const stripe = new Stripe("sk_test_dummy");
  const pagar = async (user: any, productType: string, credits: number, sessionId: string) => {
    const evento = {
      id: "evt_" + sessionId,
      type: "checkout.session.completed",
      data: {
        object: {
          id: sessionId,
          object: "checkout.session",
          amount_total: credits * 100,
          currency: "mxn",
          payment_status: "paid",
          metadata: { userId: String(user.id), productType, credits: String(credits) },
        },
      },
    };
    const payload = JSON.stringify(evento);
    const firma = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET! });
    return fetchReal(`${base}/api/stripe/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": firma },
      body: payload,
    });
  };

  const antes = await saldo(ana);
  const r1 = await pagar(ana, "individual_basic", 350, `cs_test_ana1_${marca}`);
  check("Compra: Stripe acepta el webhook firmado", r1.status === 200, r1.status);
  check("Compra: Ana recibe 350 créditos", (await saldo(ana)) === antes + 350, { antes, despues: await saldo(ana) });

  const r1b = await pagar(ana, "individual_basic", 350, `cs_test_ana1_${marca}`);
  check("Compra: Stripe reenvía el mismo pago y NO se duplica", r1b.status === 200 && (await saldo(ana)) === antes + 350, await saldo(ana));

  const falsa = await fetchReal(`${base}/api/stripe/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "stripe-signature": "t=1,v1=falsa" },
    body: JSON.stringify({ type: "checkout.session.completed" }),
  });
  check("Compra: un webhook con firma falsa se rechaza", falsa.status >= 400, falsa.status);

  await pagar(ana, "individual_basic", 350, `cs_test_ana2_${marca}`);
  await pagar(beto, "individual_basic", 350, `cs_test_beto1_${marca}`);
  await pagar(beto, "individual_premium", 1500, `cs_test_beto2_${marca}`);
  check("Compra: saldos de partida (Ana 700, Beto 1850)", (await saldo(ana)) === 700 && (await saldo(beto)) === 1850, { ana: await saldo(ana), beto: await saldo(beto) });

  // ═══ 2. BUSCAR Y APARTAR ═══════════════════════════════════════════════════
  const agenda = await llamar(ana).appointment.getSpecialtyAgenda({ specialtySlug: especialidadSlug, date: fechaISO(2), timezoneOffset: TZ });
  const huecosPablo = agenda.slots.filter((s: any) => s.professionalId === proId);
  const huecosPaula = agenda.slots.filter((s: any) => s.professionalId === presId);
  check("Agenda: Pablo ofrece 12 horarios online (07:00–21:00, cada 70 min)", huecosPablo.length === 12 && huecosPablo.every((s: any) => s.modalities.join() === "online"), huecosPablo.map((s: any) => s.time));
  check(
    "Agenda: Paula SIN consultorio aprobado no ofrece presencial",
    huecosPaula.length > 0 && huecosPaula.every((s: any) => !s.modalities.includes("in_person")),
    huecosPaula.map((s: any) => s.time + ":" + s.modalities.join("+"))
  );

  const cita = (u: any, profesional: number, cuando: string, modality: "online" | "in_person" = "online") =>
    espera(() => llamar(u).appointment.scheduleAppointment({ professionalId: profesional, appointmentDate: cuando, timezoneOffset: TZ, modality }));

  const c1 = await cita(ana, proId, fechaLocal(2, 2));
  check("Apartar: Ana aparta con Pablo a las 09:20", c1.ok, !c1.ok ? (c1 as any).e?.message : undefined);
  check("Apartar: el saldo disponible de Ana baja 350", (await saldo(ana)) === 350, await saldo(ana));
  const [filaC1] = await q("SELECT * FROM appointments WHERE userId = ? ORDER BY id DESC LIMIT 1", [ana.id]);
  check("Apartar: la cita tiene sala de video con enlaces por persona", Boolean(filaC1?.videoCallId && filaC1?.videoCallUrlUser && filaC1?.videoCallUrlProfessional), filaC1?.videoCallId);
  const [reserva] = await q("SELECT * FROM creditTransactions WHERE appointmentId = ?", [filaC1.id]);
  check("Apartar: hay movimiento 'reserved' de 350", reserva?.reason === "reserved" && Math.abs(Number(reserva.delta)) === 350, reserva);

  const agenda2 = await llamar(beto).appointment.getSpecialtyAgenda({ specialtySlug: especialidadSlug, date: fechaISO(2), timezoneOffset: TZ });
  check("Agenda: el horario apartado ya no aparece", !agenda2.slots.some((s: any) => s.professionalId === proId && s.time === "09:20"));

  const doble = await cita(beto, proId, fechaLocal(2, 2));
  check("Apartar: Beto NO puede apartar la misma hora", !doble.ok, doble.ok ? "se apartó" : (doble as any).e?.message);

  const sinPlata = await cita(sinSaldo, proId, fechaLocal(2, 4));
  check("Apartar: sin saldo no se aparta", !sinPlata.ok, sinPlata.ok ? "se apartó" : (sinPlata as any).e?.message);
  const [huerfana] = await q("SELECT COUNT(*) AS n FROM appointments WHERE userId = ?", [sinSaldo.id]);
  check("Apartar: sin saldo no deja una cita a medias", Number(huerfana.n) === 0, huerfana.n);

  // Daily caído al apartar
  dailyCaido = true;
  const conDailyCaido = await cita(beto, proId, fechaLocal(2, 7));
  dailyCaido = false;
  const [filaCaida] = await q("SELECT id, status FROM appointments WHERE userId = ? AND professionalId = ? AND appointmentDate = ?", [beto.id, proId, fechaLocal(2, 7)]);
  const saldoBetoTrasCaida = await saldo(beto);
  check(
    "Apartar con Daily caído: o se aparta bien o no deja nada a medias",
    conDailyCaido.ok ? saldoBetoTrasCaida === 1850 - 350 : !filaCaida && saldoBetoTrasCaida === 1850,
    { apartada: conDailyCaido.ok, fila: filaCaida ?? null, saldo: saldoBetoTrasCaida, error: !conDailyCaido.ok ? (conDailyCaido as any).e?.message : null }
  );
  const reintento = await cita(beto, proId, fechaLocal(2, 7));
  check(
    "Apartar con Daily caído: la hora se puede volver a intentar",
    conDailyCaido.ok || reintento.ok,
    !reintento.ok ? (reintento as any).e?.message : undefined
  );

  // ═══ 3. CANCELAR Y VOLVER A APARTAR ════════════════════════════════════════
  const c2 = await cita(ana, proId, fechaLocal(3, 1));
  const [filaC2] = await q("SELECT id FROM appointments WHERE userId = ? AND appointmentDate = ?", [ana.id, fechaLocal(3, 1)]);
  const saldoAntesCancelar = await saldo(ana);
  const canc = await espera(() => llamar(ana).appointment.cancelAppointment({ appointmentId: filaC2.id, reason: "prueba" }));
  check("Cancelar: Ana cancela con más de 4 h", c2.ok && canc.ok, !canc.ok ? (canc as any).e?.message : undefined);
  check("Cancelar: se le devuelven los 350", (await saldo(ana)) === saldoAntesCancelar + 350, { antes: saldoAntesCancelar, despues: await saldo(ana) });
  const agenda3 = await llamar(beto).appointment.getSpecialtyAgenda({ specialtySlug: especialidadSlug, date: fechaISO(3), timezoneOffset: TZ });
  check("Cancelar: la hora vuelve a aparecer libre", agenda3.slots.some((s: any) => s.professionalId === proId && s.time === "08:10"));
  const reaparta = await cita(beto, proId, fechaLocal(3, 1));
  check("Cancelar: otra persona puede apartar esa hora", reaparta.ok, !reaparta.ok ? (reaparta as any).e?.message : undefined);

  // ═══ 4. ENTRAR A LA SALA ═══════════════════════════════════════════════════
  const accesoCliente = await espera(() => llamar(ana).appointment.getRoomAccess({ appointmentId: filaC1.id }));
  check("Sala: Ana obtiene acceso a su cita", accesoCliente.ok, !accesoCliente.ok ? (accesoCliente as any).e?.message : undefined);
  const accesoAjeno = await espera(() => llamar(beto).appointment.getRoomAccess({ appointmentId: filaC1.id }));
  check("Sala: Beto NO puede entrar a la cita de Ana", !accesoAjeno.ok);

  // ═══ 5. ASISTENCIA (presencia por webhook de Daily) ═════════════════════════
  const secretoDaily = Buffer.from(process.env.DAILY_WEBHOOK_SECRET!, "base64");
  const eventoDaily = async (type: string, payload: any) => {
    const body = JSON.stringify({ type, payload, version: "1.0.0", id: crypto.randomUUID() });
    const ts = String(Math.floor(Date.now() / 1000));
    const firma = crypto.createHmac("sha256", secretoDaily).update(`${ts}.${body}`).digest("base64");
    return fetchReal(`${base}/api/webhooks/daily`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Webhook-Timestamp": ts, "X-Webhook-Signature": firma },
      body,
    });
  };

  // Crea una cita online y la "mueve" al pasado para que el cron la procese.
  const citaPasada = async (u: any, diasAdelante: number, hora: number) => {
    const r = await cita(u, proId, fechaLocal(diasAdelante, hora));
    if (!r.ok) throw new Error("no se pudo apartar: " + (r as any).e?.message);
    const [fila] = await q("SELECT * FROM appointments WHERE userId = ? AND appointmentDate = ?", [u.id, fechaLocal(diasAdelante, hora)]);
    await q("UPDATE appointments SET appointmentDate = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 HOUR) - INTERVAL ? SECOND WHERE id = ?", [fila.id % 50, fila.id]);
    const [movida] = await q("SELECT * FROM appointments WHERE id = ?", [fila.id]);
    return movida;
  };
  const presencia = async (fila: any, rol: "user" | "professional", desdeMin: number, hastaMin: number) => {
    const inicio = Math.floor(new Date(fila.appointmentDate + "Z").getTime() / 1000);
    const sid = crypto.randomUUID();
    const id = rol === "user" ? fila.userId : fila.professionalId;
    const a = await eventoDaily("participant.joined", { room: fila.videoCallId, session_id: sid, user_id: `${rol}:${id}`, joined_at: inicio + desdeMin * 60 });
    const b = await eventoDaily("participant.left", { room: fila.videoCallId, session_id: sid, user_id: `${rol}:${id}`, joined_at: inicio + desdeMin * 60, duration: (hastaMin - desdeMin) * 60 });
    return a.status === 200 && b.status === 200;
  };
  const ganancia = async (citaId: number) => (await q("SELECT * FROM professionalEarnings WHERE appointmentId = ?", [citaId]))[0];
  const estado = async (citaId: number) => (await q("SELECT status FROM appointments WHERE id = ?", [citaId]))[0]?.status;
  const consumido = async (citaId: number) =>
    (await q("SELECT reason, delta FROM creditTransactions WHERE appointmentId = ? ORDER BY id", [citaId])).map((r: any) => `${r.reason}:${r.delta}`).join(",");

  await pagar(ana, "individual_premium", 1500, `cs_test_ana3_${marca}`);
  await pagar(beto, "individual_premium", 1500, `cs_test_beto3_${marca}`);

  // a) Se realizó: los dos 50 min juntos
  const realizada = await citaPasada(ana, 4, 0);
  check("Daily: los webhooks de presencia se aceptan", (await presencia(realizada, "professional", 0, 55)) && (await presencia(realizada, "user", 2, 52)));
  // b) El asesor no entró
  const asesorFalta = await citaPasada(beto, 4, 1);
  await presencia(asesorFalta, "user", 0, 20);
  // c) El cliente no entró
  const clienteFalta = await citaPasada(ana, 4, 2);
  await presencia(clienteFalta, "professional", 0, 30);
  // d) Nadie entró
  const nadie = await citaPasada(beto, 4, 3);
  // e) Entraron pero solo coincidieron 2 minutos
  const poquito = await citaPasada(ana, 4, 4);
  await presencia(poquito, "professional", 0, 10);
  await presencia(poquito, "user", 8, 30);

  const saldoBetoAntesCron = await saldo(beto);
  await runAttendanceCron();

  check("Realizada: queda 'completed'", (await estado(realizada.id)) === "completed", await estado(realizada.id));
  const gReal = await ganancia(realizada.id);
  check("Realizada: el asesor gana 70% (245 de 350)", gReal && Number(gReal.netAmount) === 245 && Number(gReal.commissionAmount) === 105, gReal);
  check("Realizada: los créditos se consumen", (await consumido(realizada.id)).includes("consumed"), await consumido(realizada.id));

  check("Asesor ausente: la cita se cancela", (await estado(asesorFalta.id)) === "canceled", await estado(asesorFalta.id));
  check("Asesor ausente: Beto recupera sus 350", (await saldo(beto)) === saldoBetoAntesCron + 350, { antes: saldoBetoAntesCron, despues: await saldo(beto) });
  check("Asesor ausente: el asesor no cobra", !(await ganancia(asesorFalta.id)));

  check("Cliente ausente: queda 'no-show'", (await estado(clienteFalta.id)) === "no-show", await estado(clienteFalta.id));
  check("Cliente ausente: se consumen los créditos y el asesor cobra", (await consumido(clienteFalta.id)).includes("consumed") && !!(await ganancia(clienteFalta.id)), await consumido(clienteFalta.id));

  check("Nadie entró: va a revisión, sin cobrar ni pagar", (await estado(nadie.id)) === "pending_review" && !(await ganancia(nadie.id)), await estado(nadie.id));
  check("Coincidieron 2 min: va a revisión", (await estado(poquito.id)) === "pending_review", await estado(poquito.id));

  // Segunda pasada del cron: no debe volver a cobrar ni a pagar nada
  const saldosAntes2 = [await saldo(ana), await saldo(beto)];
  const gananciasAntes2 = (await q("SELECT COUNT(*) AS n, SUM(netAmount) AS s FROM professionalEarnings WHERE professionalId = ?", [proId]))[0];
  await runAttendanceCron();
  const gananciasDespues2 = (await q("SELECT COUNT(*) AS n, SUM(netAmount) AS s FROM professionalEarnings WHERE professionalId = ?", [proId]))[0];
  check(
    "Cron repetido: no cobra ni paga dos veces",
    (await saldo(ana)) === saldosAntes2[0] && (await saldo(beto)) === saldosAntes2[1] && gananciasAntes2.s === gananciasDespues2.s,
    { saldosAntes2, despues: [await saldo(ana), await saldo(beto)], gananciasAntes2, gananciasDespues2 }
  );

  // Revisión tras 8 h sin reseña: se completa y se paga (comportamiento actual)
  await q("UPDATE appointments SET updatedAt = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 9 HOUR) WHERE id IN (?, ?)", [nadie.id, poquito.id]);
  await runAttendanceCron();
  check("Revisión online >8 h: se cierra como 'completed'", (await estado(nadie.id)) === "completed", await estado(nadie.id));

  // ═══ 6. PRESENCIAL ═════════════════════════════════════════════════════════
  // Paula registra su consultorio; mientras está pendiente no hay presencial.
  await llamar(uPres).professional.saveMyClinic({
    address: "Av. Universidad 1200, int. 4, Xoco",
    city: "Coyoacán",
    state: "Ciudad de México",
    country: "MX",
    photos: ["https://example.com/1.jpg", "https://example.com/2.jpg", "https://example.com/3.jpg"],
    addressProofUrl: "https://example.com/comprobante.pdf",
    noLicenseRequired: true,
  });
  const pendiente = await cita(ana, presId, fechaLocal(5, 1), "in_person");
  check("Presencial: con consultorio pendiente NO se puede apartar", !pendiente.ok);

  await llamar(admin).admin.reviewClinic({ professionalId: presId, decision: "approved" });
  const agendaPres = await llamar(ana).appointment.getSpecialtyAgenda({ specialtySlug: especialidadSlug, date: fechaISO(5), timezoneOffset: TZ, modality: "in_person" });
  const presPaula = agendaPres.slots.filter((s: any) => s.professionalId === presId);
  check("Presencial: aprobado, Paula ofrece 5 horarios presenciales (07–13)", presPaula.length === 5 && presPaula.every((s: any) => s.time < "13:00" && s.modalities.join() === "in_person"), presPaula.map((s: any) => s.time));

  const horaOnline = await cita(ana, presId, fechaLocal(5, 8), "in_person");
  check("Presencial: no se puede apartar presencial en un bloque online", !horaOnline.ok);

  await pagar(ana, "individual_premium", 1500, `cs_test_ana4_${marca}`);
  await pagar(beto, "individual_premium", 1500, `cs_test_beto4_${marca}`);
  const saldoAnaPres = await saldo(ana);
  const cp = await cita(ana, presId, fechaLocal(5, 1), "in_person");
  check("Presencial: Ana aparta en consultorio (Paula es Pro: 1500)", cp.ok && saldoAnaPres - (await saldo(ana)) === 1500, !cp.ok ? (cp as any).e?.message : saldoAnaPres - (await saldo(ana)));
  const codigo = cp.ok ? (cp.v as any).checkinCode : null;
  const [filaPres] = await q("SELECT * FROM appointments WHERE userId = ? AND appointmentDate = ?", [ana.id, fechaLocal(5, 1)]);
  check("Presencial: sin sala de video, con código y dirección", !filaPres.videoCallId && /^\d{4}$/.test(filaPres.checkinCode ?? "") && !!filaPres.clinicAddress, { video: filaPres.videoCallId, codigo: filaPres.checkinCode });

  const vistaAsesora = await llamar(uPres).professional.getAppointments();
  const laCita = (vistaAsesora as any[]).find((a) => a.id === filaPres.id);
  check("Presencial: la asesora NO ve el código", laCita && laCita.checkinCode === undefined, laCita?.checkinCode);
  const vistaDetalle = await llamar(uPres).appointment.getAppointment({ appointmentId: filaPres.id });
  check("Presencial: tampoco en el detalle de la cita", (vistaDetalle as any).checkinCode == null);

  const sala = await espera(() => llamar(ana).appointment.getRoomAccess({ appointmentId: filaPres.id }));
  check("Presencial: no hay sala de video que abrir", !sala.ok);

  // Mover la cita a "ahora" y registrar la llegada
  await q("UPDATE appointments SET appointmentDate = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 MINUTE) WHERE id = ?", [filaPres.id]);
  const malo = await espera(() => llamar(uPres).appointment.confirmCheckin({ appointmentId: filaPres.id, code: codigo === "0000" ? "1111" : "0000" }));
  check("Presencial: un código incorrecto se rechaza", !malo.ok);
  const bueno = await espera(() => llamar(uPres).appointment.confirmCheckin({ appointmentId: filaPres.id, code: codigo }));
  check("Presencial: el código correcto registra la llegada", bueno.ok, !bueno.ok ? (bueno as any).e?.message : undefined);

  // Termina la sesión → el cron la completa y paga
  await q("UPDATE appointments SET appointmentDate = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 70 MINUTE) WHERE id = ?", [filaPres.id]);
  await runAttendanceCron();
  check("Presencial con llegada: 'completed' al terminar", (await estado(filaPres.id)) === "completed", await estado(filaPres.id));
  const gPres = await ganancia(filaPres.id);
  check("Presencial con llegada: la asesora gana 70% de 1500 (1050)", gPres && Number(gPres.netAmount) === 1050, gPres);

  // Sin código
  const cp2 = await cita(beto, presId, fechaLocal(6, 2), "in_person");
  const [filaSin] = await q("SELECT * FROM appointments WHERE userId = ? AND appointmentDate = ?", [beto.id, fechaLocal(6, 2)]);
  await q("UPDATE appointments SET appointmentDate = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 HOUR) WHERE id = ?", [filaSin.id]);
  await runAttendanceCron();
  check("Presencial sin código: va a revisión", cp2.ok && (await estado(filaSin.id)) === "pending_review", await estado(filaSin.id));
  await q("UPDATE appointments SET updatedAt = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 9 HOUR) WHERE id = ?", [filaSin.id]);
  await runAttendanceCron();
  check("Presencial sin código: NO se paga sola a las 8 h", (await estado(filaSin.id)) === "pending_review" && !(await ganancia(filaSin.id)), await estado(filaSin.id));
  const saldoBetoAntesReembolso = await saldo(beto);
  await llamar(admin).admin.resolveInPersonAppointment({ appointmentId: filaSin.id, decision: "refund" });
  check("Presencial sin código: el admin reembolsa y Beto recupera 1500", (await saldo(beto)) === saldoBetoAntesReembolso + 1500, { antes: saldoBetoAntesReembolso, despues: await saldo(beto) });

  // ═══ 7. MÁS CASOS DE "ENTRAR O NO" ═════════════════════════════════════════
  await pagar(ana, "individual_premium", 1500, `cs_test_ana5_${marca}`);
  await pagar(beto, "individual_premium", 1500, `cs_test_beto5_${marca}`);

  // Cancelación tardía (menos de 4 h, agendada hace más de 4 h): pierde créditos
  const tardia = await cita(ana, proId, fechaLocal(7, 0));
  const [filaTardia] = await q("SELECT * FROM appointments WHERE userId = ? AND appointmentDate = ?", [ana.id, fechaLocal(7, 0)]);
  await q("UPDATE appointments SET appointmentDate = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 HOUR), createdAt = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR) WHERE id = ?", [filaTardia.id]);
  const saldoAntesTardia = await saldo(ana);
  await llamar(ana).appointment.cancelAppointment({ appointmentId: filaTardia.id, reason: "tarde" });
  check("Cancelación tardía: Ana no recupera los créditos", tardia.ok && (await saldo(ana)) === saldoAntesTardia && (await consumido(filaTardia.id)).includes("consumed"), { antes: saldoAntesTardia, despues: await saldo(ana), mov: await consumido(filaTardia.id) });
  check("Cancelación tardía: el asesor no cobra (se queda Inteira)", !(await ganancia(filaTardia.id)));

  // Cancelación dentro de las 4 h de gracia después de agendar: reembolso aunque falte poco
  const gracia = await cita(ana, proId, fechaLocal(7, 1));
  const [filaGracia] = await q("SELECT * FROM appointments WHERE userId = ? AND appointmentDate = ?", [ana.id, fechaLocal(7, 1)]);
  await q("UPDATE appointments SET appointmentDate = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 150 MINUTE) WHERE id = ?", [filaGracia.id]);
  const saldoAntesGracia = await saldo(ana);
  await llamar(ana).appointment.cancelAppointment({ appointmentId: filaGracia.id });
  check("Cancelación en las 4 h de gracia: reembolso completo", gracia.ok && (await saldo(ana)) === saldoAntesGracia + 350, { antes: saldoAntesGracia, despues: await saldo(ana) });

  // El asesor cancela: el cliente recupera todo
  const delAsesor = await cita(beto, proId, fechaLocal(7, 2));
  const [filaDelAsesor] = await q("SELECT * FROM appointments WHERE userId = ? AND appointmentDate = ?", [beto.id, fechaLocal(7, 2)]);
  const saldoAntesAsesorCancela = await saldo(beto);
  await llamar(uPro).appointment.cancelAppointment({ appointmentId: filaDelAsesor.id, reason: "imprevisto" });
  check("El asesor cancela: Beto recupera sus 350", delAsesor.ok && (await saldo(beto)) === saldoAntesAsesorCancela + 350, { antes: saldoAntesAsesorCancela, despues: await saldo(beto) });

  const ajena = await espera(() => llamar(beto).appointment.cancelAppointment({ appointmentId: realizada.id }));
  check("Nadie puede cancelar la cita de otro", !ajena.ok);

  // Ana entra a la sala (se le consumen los créditos al entrar) y el asesor nunca llega
  const entraSola = await citaPasada(ana, 8, 0);
  await q("UPDATE appointments SET status = 'scheduled' WHERE id = ?", [entraSola.id]);
  await llamar(ana).appointment.joinAppointment({ appointmentId: entraSola.id });
  check("Entrar: al entrar se consumen los créditos", (await consumido(entraSola.id)).includes("consumed"), await consumido(entraSola.id));
  await presencia(entraSola, "user", 0, 25);
  const saldoAntesSola = await saldo(ana);
  await runAttendanceCron();
  check("Entró y el asesor no llegó: se cancela y se le devuelve todo", (await estado(entraSola.id)) === "canceled" && (await saldo(ana)) === saldoAntesSola + 350, { estado: await estado(entraSola.id), antes: saldoAntesSola, despues: await saldo(ana) });

  // Cita en revisión: el cliente deja reseña → se completa y se paga una sola vez
  const conResena = await citaPasada(beto, 8, 1);
  await runAttendanceCron(); // sin presencia → revisión
  await llamar(beto).appointment.submitReview({ appointmentId: conResena.id, rating: 5, comment: "Muy bien" });
  check("Reseña: la cita queda completada y el asesor cobra", (await estado(conResena.id)) === "completed" && !!(await ganancia(conResena.id)), await estado(conResena.id));
  await q("UPDATE appointments SET updatedAt = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 9 HOUR) WHERE id = ?", [conResena.id]);
  await runAttendanceCron();
  const pagosResena = (await q("SELECT COUNT(*) AS n FROM professionalEarnings WHERE appointmentId = ?", [conResena.id]))[0];
  check("Reseña: no se paga dos veces", Number(pagosResena.n) === 1, pagosResena.n);

  // Plan: precio de miembro y acceso
  const carla = await nuevoUsuario("Carla", "user");
  await pagar(carla, "plan_basic", 980, `cs_test_carla_plan_${marca}`);
  check("Plan Básico: Carla recibe 980 créditos", (await saldo(carla)) === 980, await saldo(carla));
  const miembro = await cita(carla, proId, fechaLocal(9, 0));
  check("Plan Básico: la sesión con un asesor básico cuesta 245", miembro.ok && (await saldo(carla)) === 980 - 245, !miembro.ok ? (miembro as any).e?.message : await saldo(carla));
  const conPro = await cita(carla, presId, fechaLocal(9, 8), "online");
  check("Plan Básico: no puede agendar con una asesora Pro", !conPro.ok, conPro.ok ? "se apartó" : (conPro as any).e?.message);
  const agendaCarla = await llamar(carla).appointment.getSpecialtyAgenda({ specialtySlug: especialidadSlug, date: fechaISO(9), timezoneOffset: TZ });
  check("Plan Básico: la asesora Pro no le aparece en la agenda", !agendaCarla.slots.some((s: any) => s.professionalId === presId));

  // ═══ Resumen ═══════════════════════════════════════════════════════════════
  server.close();
  const fallas = resultados.filter((r) => !r.ok);
  console.log(`\n${resultados.length - fallas.length}/${resultados.length} pasos OK`);
  if (fallas.length) {
    console.log("FALLAS:");
    for (const f of fallas) console.log(" -", f.paso, f.detalle ?? "");
  }
  process.exit(fallas.length ? 1 : 0);
}

main().catch((e) => {
  console.error("Error del recorrido:", e);
  process.exit(2);
});
