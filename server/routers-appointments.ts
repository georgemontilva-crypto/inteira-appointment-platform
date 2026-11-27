import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { randomInt } from "node:crypto";
import { modalidadesEfectivas } from "./modalidad";
import {
  canScheduleAppointment,
  getAvailableSlots,
  isTimeWithinAvailability,
  calculateEndTime,
  bloquesDeModalidad,
  huecosPorModalidad,
} from "./appointment-utils";
import { generateVideoCallLink } from "./videocall";
import {
  sendAppointmentConfirmation,
  sendAppointmentCancellation,
  sendAppointmentCancelledToProfessional,
  sendProfessionalAppointmentConfirmation,
} from "./email";
import { reserveCredits, confirmCredits, refundCredits, getUserCreditBalance } from "./credits";
import { createNotification } from "./notifications";
import { chargeProfessionalPenalty } from "./professionalWallet";

const SESSION_TYPES = {
  basic:   { credits: 350,  memberCredits: 245,  durationMinutes: 60, label: "Sesión Básica" },
  premium: { credits: 1500, memberCredits: 1250, durationMinutes: 60, label: "Sesión Premium" },
} as const;
type SessionType = keyof typeof SESSION_TYPES;

/**
 * Plan vigente de la persona, o null si no tiene ninguno.
 *
 * Si tiene los dos lotes activos manda el pro, que es el que da más acceso.
 */
async function getActivePlan(userId: number): Promise<"plan_pro" | "plan_basic" | null> {
  const { getDb } = await import("./db");
  const dbConn = await getDb();
  if (!dbConn) return null;
  const client = (dbConn as any).$client;
  const rows = await new Promise<any[]>((resolve) => {
    client.execute(
      `SELECT DISTINCT source FROM creditBatches
       WHERE userId = ? AND source IN ('plan_basic', 'plan_pro')
         AND expiredEarly = 0 AND expiresAt > NOW() AND remaining > 0`,
      [userId],
      (err: any, results: any) => {
        if (err) { console.error("[getActivePlan]", err?.message); resolve([]); }
        else resolve(Array.isArray(results) ? results : []);
      }
    );
  });
  const fuentes = rows.map((r) => String(r.source));
  if (fuentes.includes("plan_pro")) return "plan_pro";
  if (fuentes.includes("plan_basic")) return "plan_basic";
  return null;
}

/** Returns true if the user has an active plan credit batch (plan_basic or plan_pro). */
async function userHasActiveMembership(userId: number): Promise<boolean> {
  return (await getActivePlan(userId)) !== null;
}

/**
 * Un plan Básico no da acceso a los asesores Pro: esos son los del plan Pro.
 * Quien no tiene plan sí puede agendar con un Pro pagando la sesión completa.
 */
function planCubreTier(plan: "plan_pro" | "plan_basic" | null, tier: string): boolean {
  if (tier !== "pro") return true;
  return plan !== "plan_basic";
}

// Since both session types are now 60 min, durationMinutes alone can't distinguish them.
// This helper queries creditTransactions to find the original credit cost of an appointment.
async function getAppointmentCreditCost(appointmentId: number): Promise<number> {
  const dbInst = await db.getDb();
  if (!dbInst) return 0;
  const client = (dbInst as any).$client;
  return new Promise<number>((resolve) => {
    client.execute(
      `SELECT COALESCE(SUM(ABS(delta)), 0) as total
       FROM creditTransactions
       WHERE appointmentId = ? AND reason IN ('reserved', 'consumed', 'refunded')`,
      [appointmentId],
      (err: any, results: any) => {
        if (err) { resolve(0); return; }
        resolve(Number(Array.isArray(results) ? results[0]?.total : 0) || 0);
      }
    );
  });
}

/**
 * Huecos libres de un día para un grupo de asesores, listos para la agenda.
 *
 * La usan la agenda de una especialidad y la búsqueda general de sesiones.
 * Con plan Básico los asesores Pro no se ofrecen (agendarlos se rechazaría
 * al confirmar); un día bloqueado no ofrece nada; lo presencial solo sale
 * con consultorio aprobado.
 */
async function construirAgenda(params: {
  professionals: any[];
  userId: number | null;
  date: string;
  timezoneOffset: number;
  modality: "any" | "online" | "in_person";
  durationMinutes: number;
}) {
  const { date, durationMinutes } = params;
  const planActivo = params.userId ? await getActivePlan(params.userId) : null;
  const disponibles = params.professionals.filter(
    (p: any) => p.isAvailable !== 0 && planCubreTier(planActivo, String(p.tier ?? "basic"))
  );

  const offsetMs = (params.timezoneOffset ?? -300) * 60 * 1000;
  const clientMidnight = new Date(new Date(date + "T00:00:00Z").getTime() - offsetMs);
  const consultorios = await db.getApprovedClinicsFor(disponibles.map((p: any) => Number(p.id)));

  const porAsesor = await Promise.all(
    disponibles.map(async (pro: any) => {
      const [availability, appointments, bloqueados] = await Promise.all([
        db.getProfessionalAvailability(pro.id),
        db.getProfessionalAppointments(pro.id),
        db.getBlockedDates(pro.id),
      ]);
      if (bloqueados.has(date)) return [];
      const bookedTimes = appointments
        .filter((apt: any) => apt.status !== "canceled")
        .map((apt: any) => apt.appointmentDate);

      const consultorio = consultorios.get(Number(pro.id)) ?? null;
      const ofrece = modalidadesEfectivas(pro.sessionModality, consultorio !== null);
      const slots = huecosPorModalidad({
        clientMidnight,
        availability,
        durationMinutes,
        bookedTimes,
        offsetMs,
        permiteOnline: ofrece.online,
        presencialAprobado: ofrece.presencial,
        filtro: params.modality,
      });

      return slots.map((slot) => ({
        time: slot.startTime, // "09:00"
        modalities: slot.modalities,
        clinicCity: ofrece.presencial ? consultorio?.city ?? null : null,
        clinicAddress: ofrece.presencial && consultorio
          ? [consultorio.address, consultorio.city, consultorio.state].filter(Boolean).join(", ")
          : null,
        durationMinutes,
        professionalId: pro.id as number,
        professionalSlug: (pro.slug ?? null) as string | null,
        professionalName: (pro.professionalName ?? "Especialista") as string,
        photo: (pro.profilePhoto ?? pro.userProfileImage ?? null) as string | null,
        tier: (pro.tier ?? "basic") as string,
        yearsOfExperience: (pro.yearsOfExperience ?? null) as number | null,
        averageRating: pro.averageRating != null ? Number(pro.averageRating) : null,
        totalReviews: Number(pro.totalReviews ?? 0),
        country: (pro.country ?? null) as string | null,
        state: (pro.state ?? null) as string | null,
        specialtyName: (pro.specialtyName ?? null) as string | null,
        specialtySlug: (pro.specialtySlug ?? null) as string | null,
      }));
    })
  );

  return {
    slots: porAsesor.flat().sort((a, b) => a.time.localeCompare(b.time)),
    totalProfessionals: disponibles.length,
    hasInPerson: consultorios.size > 0,
  };
}

/**
 * Intentos fallidos de código por cita. En memoria basta: el límite existe
 * para que no se puedan probar los 10.000 códigos, y un reinicio del
 * servidor solo devuelve 5 intentos más.
 */
const intentosCheckin = new Map<number, number>();

/** Código de 4 dígitos para registrar la llegada al consultorio. */
function generarCodigoLlegada(): string {
  return String(randomInt(0, 10_000)).padStart(4, "0");
}

export const appointmentRouter = router({
  // Get available slots for a professional on a specific date
  getAvailableSlots: publicProcedure
    .input(
      z.object({
        professionalId: z.number(),
        date: z.string(), // ISO date string yyyy-MM-dd
        sessionType: z.enum(["basic", "premium"]).optional().default("basic"),
        timezoneOffset: z.number().optional().default(-300),
        // Por compatibilidad, sin modalidad se devuelven los huecos online,
        // que es lo único que existía antes.
        modality: z.enum(["online", "in_person"]).optional().default("online"),
      })
    )
    .query(async ({ input }) => {
      const durationMinutes = SESSION_TYPES[input.sessionType].durationMinutes;

      const professional = await db.getProfessionalById(input.professionalId);
      if (!professional) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Professional not found",
        });
      }

      // Si el asesor bloqueó ese día, no hay huecos que ofrecer.
      const bloqueados = await db.getBlockedDates(input.professionalId);
      if (bloqueados.has(input.date)) return [];

      const availability = await db.getProfessionalAvailability(
        input.professionalId
      );
      const appointments = await db.getProfessionalAppointments(
        input.professionalId
      );

      // Cualquier cita que no esté cancelada ocupa el horario: antes solo se
      // miraban las "scheduled", así que una cita en curso volvía a ofrecerse.
      const bookedTimes = appointments
        .filter((apt) => apt.status !== "canceled")
        .map((apt) => apt.appointmentDate);

      // Construir la fecha en hora local del cliente
      const offsetMs = (input.timezoneOffset ?? -300) * 60 * 1000;
      const dateObj = new Date(input.date + "T00:00:00Z"); // medianoche UTC
      // Ajustar al inicio del día en la zona del cliente
      const clientMidnight = new Date(dateObj.getTime() - offsetMs);

      const consultorio =
        input.modality === "in_person"
          ? await db.getClinicByProfessionalId(input.professionalId)
          : null;
      const ofrece = modalidadesEfectivas(
        (professional as any).sessionModality,
        consultorio?.status === "approved"
      );

      const slots = huecosPorModalidad({
        clientMidnight,
        availability,
        durationMinutes,
        bookedTimes,
        offsetMs,
        permiteOnline: ofrece.online,
        presencialAprobado: ofrece.presencial,
        filtro: input.modality,
      });
      // Return simple time strings like "09:00", "10:00"
      return slots.map((s) => s.startTime);
    }),

  /**
   * Agenda de una especialidad: todos los huecos libres de todos sus asesores
   * aprobados para un día, ordenados por hora.
   *
   * Es lo que alimenta la vista de agenda: en vez de elegir asesor y luego ver
   * su calendario, se ve directamente qué hay disponible ese día.
   */
  getSpecialtyAgenda: publicProcedure
    .input(
      z.object({
        specialtySlug: z.string().max(120),
        date: z.string(), // yyyy-MM-dd en hora del cliente
        sessionType: z.enum(["basic", "premium"]).optional().default("basic"),
        modality: z.enum(["any", "online", "in_person"]).optional().default("any"),
        timezoneOffset: z.number().optional().default(-300),
      })
    )
    .query(async ({ ctx, input }) => {
      const specialty = await db.getSpecialtyBySlug(input.specialtySlug);
      if (!specialty) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Especialidad no encontrada" });
      }
      const professionals = await db.getProfessionalsBySpecialty(specialty.id);
      const agenda = await construirAgenda({
        professionals,
        userId: (ctx as any)?.user?.id ?? null,
        date: input.date,
        timezoneOffset: input.timezoneOffset,
        modality: input.modality,
        durationMinutes: SESSION_TYPES[input.sessionType].durationMinutes,
      });

      return {
        specialty: {
          id: specialty.id as number,
          name: specialty.name as string,
          slug: specialty.slug as string,
          description: (specialty.description ?? null) as string | null,
        },
        date: input.date,
        sessionType: input.sessionType,
        modality: input.modality,
        totalProfessionals: agenda.totalProfessionals,
        /** Si hay algún consultorio aprobado en la especialidad, para mostrar el filtro */
        hasInPerson: agenda.hasInPerson,
        slots: agenda.slots,
      };
    }),

  /**
   * Buscar sesiones: horarios libres de todas las especialidades en un día,
   * o de una sola si se elige. Es la búsqueda general de la app.
   */
  searchSessions: publicProcedure
    .input(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        specialtyId: z.number().optional(),
        modality: z.enum(["any", "online", "in_person"]).optional().default("any"),
        timezoneOffset: z.number().optional().default(-300),
      })
    )
    .query(async ({ ctx, input }) => {
      const professionals = await db.getApprovedProfessionalsForAgenda(input.specialtyId);
      const agenda = await construirAgenda({
        professionals,
        userId: (ctx as any)?.user?.id ?? null,
        date: input.date,
        timezoneOffset: input.timezoneOffset,
        modality: input.modality,
        durationMinutes: SESSION_TYPES.basic.durationMinutes,
      });
      return {
        date: input.date,
        modality: input.modality,
        totalProfessionals: agenda.totalProfessionals,
        hasInPerson: agenda.hasInPerson,
        slots: agenda.slots,
      };
    }),

  /**
   * Próximos días con horarios libres en una especialidad.
   *
   * Sirve para que un día vacío no sea un callejón sin salida: en vez de
   * "no hay horarios", se ofrecen los días que sí tienen. Los datos de cada
   * asesor se cargan una sola vez y se recorren los días en memoria, así que
   * cuesta lo mismo que la agenda de un día.
   */
  getSpecialtyNextDays: publicProcedure
    .input(
      z.object({
        specialtySlug: z.string(),
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        days: z.number().min(1).max(30).optional().default(14),
        sessionType: z.enum(["basic", "premium"]).optional().default("basic"),
        modality: z.enum(["any", "online", "in_person"]).optional().default("any"),
        timezoneOffset: z.number().optional().default(-300),
      })
    )
    .query(async ({ ctx, input }) => {
      const specialty = await db.getSpecialtyBySlug(input.specialtySlug);
      if (!specialty) return { days: [] as { date: string; slots: number }[] };

      const durationMinutes = SESSION_TYPES[input.sessionType].durationMinutes;
      const planActivo = (ctx as any)?.user?.id
        ? await getActivePlan((ctx as any).user.id)
        : null;
      const professionals = await db.getProfessionalsBySpecialty(specialty.id);
      const disponibles = professionals.filter(
        (p: any) => p.isAvailable !== 0 && planCubreTier(planActivo, String(p.tier ?? "basic"))
      );
      if (disponibles.length === 0) return { days: [] };

      const offsetMs = (input.timezoneOffset ?? -300) * 60 * 1000;
      const consultorios = await db.getApprovedClinicsFor(disponibles.map((p: any) => Number(p.id)));

      const datos = await Promise.all(
        disponibles.map(async (pro: any) => {
          const [availability, appointments, bloqueados] = await Promise.all([
            db.getProfessionalAvailability(pro.id),
            db.getProfessionalAppointments(pro.id),
            db.getBlockedDates(pro.id),
          ]);
          const ofrece = modalidadesEfectivas(pro.sessionModality, consultorios.has(Number(pro.id)));
          return {
            availability,
            permiteOnline: ofrece.online,
            presencialAprobado: ofrece.presencial,
            bloqueados,
            bookedTimes: appointments
              .filter((apt: any) => apt.status !== "canceled")
              .map((apt: any) => apt.appointmentDate),
          };
        })
      );

      const base = new Date(input.from + "T00:00:00Z").getTime();
      const resultado: { date: string; slots: number }[] = [];

      for (let i = 1; i <= input.days; i++) {
        const diaUTC = new Date(base + i * 86_400_000);
        const fecha = diaUTC.toISOString().slice(0, 10);
        const clientMidnight = new Date(diaUTC.getTime() - offsetMs);

        let total = 0;
        for (const d of datos) {
          if (d.bloqueados.has(fecha)) continue;
          total += huecosPorModalidad({
            clientMidnight,
            availability: d.availability,
            durationMinutes,
            bookedTimes: d.bookedTimes,
            offsetMs,
            permiteOnline: d.permiteOnline,
            presencialAprobado: d.presencialAprobado,
            filtro: input.modality,
          }).length;
        }
        if (total > 0) resultado.push({ date: fecha, slots: total });
      }

      return { days: resultado };
    }),

  // Schedule an appointment
  scheduleAppointment: protectedProcedure
    .input(
      z.object({
        professionalId: z.number(),
        appointmentDate: z.string(), // ISO string from frontend
        sessionType: z.enum(["basic", "premium"]).optional().default("basic"),
        notes: z.string().max(2000).optional(),
        timezoneOffset: z.number().optional().default(0), // client's getTimezoneOffset() * -1
        modality: z.enum(["online", "in_person"]).optional().default("online"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // El precio lo decide la clasificación del asesor, no lo que mande el
      // cliente: un asesor "basic" se cobra como sesión básica y uno "pro"
      // como premium. Antes el tipo de sesión era una elección de quien
      // agendaba, así que un asesor básico podía salir a precio de pro.
      const planActivo = await getActivePlan(ctx.user.id);
      const hasMembership = planActivo !== null;
      const pricingType: "individual" | "member" = hasMembership ? "member" : "individual";
      const appointmentDateObj = new Date(input.appointmentDate);
      // La columna appointmentDate no acepta un ISO con "T"/"Z": da
      // "Incorrect datetime value". El flujo de agendar ya mandaba
      // "YYYY-MM-DD HH:MM:SS" en UTC; aquí se normaliza cualquier otra forma
      // para que un cliente nuevo no vuelva a romper el apartado.
      const appointmentDateSql = /[TZ]/.test(input.appointmentDate)
        ? appointmentDateObj.toISOString().slice(0, 19).replace("T", " ")
        : input.appointmentDate;

      // Validate appointment can be scheduled
      if (!canScheduleAppointment(appointmentDateObj)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Las citas deben agendarse con al menos 10 minutos de anticipación",
        });
      }

      // Get professional
      const professional = await db.getProfessionalById(input.professionalId);
      if (!professional) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Professional not found",
        });
      }

      const tierAsesor = String((professional as any).tier ?? "basic");
      if (!planCubreTier(planActivo, tierAsesor)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Tu plan Básico no incluye asesores Pro. Cambia al plan Pro para agendar con este especialista.",
        });
      }
      const sessionType: SessionType = tierAsesor === "pro" ? "premium" : "basic";
      const sessionConfig = SESSION_TYPES[sessionType];
      const durationMinutes = sessionConfig.durationMinutes;
      const creditCost = hasMembership ? sessionConfig.memberCredits : sessionConfig.credits;

      // Presencial solo con consultorio aprobado: es lo que valida que el
      // lugar existe y está en regla.
      const esPresencial = input.modality === "in_person";
      const consultorio = esPresencial
        ? await db.getClinicByProfessionalId(input.professionalId)
        : null;
      const ofrece = modalidadesEfectivas(
        (professional as any).sessionModality,
        consultorio?.status === "approved"
      );
      if (esPresencial && !ofrece.presencial) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este especialista no tiene consultorio aprobado para citas presenciales.",
        });
      }
      if (!esPresencial && !ofrece.online) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este especialista atiende solo de forma presencial.",
        });
      }

      // Check professional availability — solo los bloques de esa modalidad
      const availability = await db.getProfessionalAvailability(
        input.professionalId
      );
      const tzOffsetMs = (input.timezoneOffset ?? 0) * 60 * 1000;
      if (
        !isTimeWithinAvailability(
          appointmentDateObj,
          durationMinutes,
          bloquesDeModalidad(availability, input.modality),
          tzOffsetMs
        )
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: esPresencial
            ? "Ese horario no es de atención presencial. Elige otro."
            : "Ese horario no está dentro de la disponibilidad del especialista.",
        });
      }

      // El asesor pudo bloquear el día después de que se cargó la agenda.
      const diasBloqueados = await db.getBlockedDates(input.professionalId);
      const diaLocal = new Date(appointmentDateObj.getTime() + tzOffsetMs)
        .toISOString()
        .slice(0, 10);
      if (diasBloqueados.has(diaLocal)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El especialista bloqueó ese día. Elige otra fecha.",
        });
      }

      // Dos personas pueden estar mirando la misma agenda: sin esto, las dos
      // apartan el mismo hueco. Se comprueba contra cualquier cita que se
      // solape, propia o del asesor, salvo las canceladas.
      {
        const dbCheck = await db.getDb();
        if (dbCheck) {
          const choque = await new Promise<any | null>((resolve) => {
            (dbCheck as any).$client.execute(
              `SELECT id, professionalId, userId FROM appointments
               WHERE status <> 'canceled'
                 AND (professionalId = ? OR userId = ?)
                 AND appointmentDate < DATE_ADD(?, INTERVAL ? MINUTE)
                 AND DATE_ADD(appointmentDate, INTERVAL durationMinutes MINUTE) > ?
               LIMIT 1`,
              [
                input.professionalId,
                ctx.user.id,
                appointmentDateSql,
                durationMinutes,
                appointmentDateSql,
              ],
              (err: any, results: any) => {
                if (err) {
                  console.error("[scheduleAppointment] choque:", err?.message);
                  resolve(null);
                  return;
                }
                resolve(Array.isArray(results) && results.length > 0 ? results[0] : null);
              }
            );
          });
          if (choque) {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                Number(choque.userId) === ctx.user.id
                  ? "Ya tienes una cita a esa hora."
                  : "Ese horario acaba de ocuparse. Elige otro.",
            });
          }
        }
      }

      // ── Check credit balance (modelo basado en créditos, no suscripción obligatoria) ──
      const creditBalance = await getUserCreditBalance(ctx.user.id);
      if (creditBalance < creditCost) {
        throw new TRPCError({
          code: "PAYMENT_REQUIRED",
          message: `Saldo insuficiente. Necesitas ${creditCost} créditos para agendar una ${sessionConfig.label}. Saldo actual: ${creditBalance} créditos. Recarga tu wallet en /wallet.`,
        });
      }

      // Create video call link
      const appointmentEndDate = calculateEndTime(
        appointmentDateObj,
        durationMinutes
      );

      const professionalUser = await db.getUserById(professional.userId);
      const userRecord = await db.getUserById(ctx.user.id);
      const specialty = await db.getSpecialtyById(professional.specialtyId);

      // Presencial: código de llegada y copia de la dirección (si el asesor
      // la cambia después, la cita conserva a dónde se acordó ir).
      const checkinCode = esPresencial ? generarCodigoLlegada() : null;
      const direccionCita = consultorio
        ? [consultorio.address, consultorio.city, consultorio.state].filter(Boolean).join(", ")
        : null;

      // Create appointment first to get the real ID for Daily.co room name
      const newAppointmentId = await db.createAppointment({
        userId: ctx.user.id,
        professionalId: input.professionalId,
        specialtyId: professional.specialtyId,
        appointmentDate: appointmentDateSql, // cadena, no Date: mysql2 desplaza los Date a UTC
        durationMinutes,
        videoCallType: "daily",
        videoCallLink: undefined,
        videoCallId: undefined,
        notes: input.notes,
        status: "scheduled",
        timezoneOffset: input.timezoneOffset,
        modality: input.modality,
        checkinCode,
        clinicAddress: direccionCita,
        clinicMapsUrl: consultorio?.mapsUrl ?? null,
      });

      // Una cita presencial no lleva sala de video.
      const videoCall = esPresencial
        ? null
        : await generateVideoCallLink(
            newAppointmentId,
            appointmentDateObj,
            appointmentEndDate,
            {
              userId: ctx.user.id,
              userName: userRecord?.name ?? "Paciente",
              professionalId: professional.id,
              professionalName: professionalUser?.name ?? "Profesional",
            }
          );

      // Update appointment row with the video call link and pricingType
      const { getDb } = await import("./db");
      const dbConn = await getDb();
      if (dbConn) {
        await new Promise<void>((resolve) => {
          (dbConn as any).$client.execute(
            "UPDATE appointments SET videoCallLink = ?, videoCallId = ?, videoCallUrlUser = ?, videoCallUrlProfessional = ?, pricingType = ? WHERE id = ?",
            [
              videoCall?.url ?? null,
              videoCall?.roomName ?? null,
              videoCall?.userUrl ?? null,
              videoCall?.professionalUrl ?? null,
              pricingType,
              newAppointmentId,
            ],
            (err: any) => { if (err) console.error("[createAppointment] update video call:", err); resolve(); }
          );
        });
      }

      const datosPresencial =
        esPresencial && direccionCita
          ? { clinicAddress: direccionCita, clinicMapsUrl: consultorio?.mapsUrl ?? null, checkinCode }
          : null;

      // ── Reserve credits (FIFO) — confirmed on review/no-show ────────────
      await reserveCredits(
        ctx.user.id,
        creditCost,
        newAppointmentId,
        `${sessionConfig.label} con ${professionalUser?.name ?? "especialista"}`
      );

      // Send confirmation email to user
      if (userRecord?.email) {
        await sendAppointmentConfirmation({
          userEmail: userRecord.email,
          userName: userRecord.name ?? "Usuario",
          professionalName: professionalUser?.name ?? "Especialista",
          specialty: specialty?.name ?? "Especialidad",
          appointmentDate: appointmentDateObj,
          durationMinutes,
          videoCallType: "daily",
          videoCallLink: `https://inteira.app/sala/${newAppointmentId}`,
          timezoneOffsetMinutes: input.timezoneOffset,
          presencial: datosPresencial,
        });
      }

      // Send confirmation email to professional
      if (professionalUser?.email) {
        sendProfessionalAppointmentConfirmation({
          professionalEmail: professionalUser.email,
          professionalName: professionalUser.name ?? "Profesional",
          patientName: userRecord?.name ?? "Usuario",
          appointmentDate: appointmentDateObj,
          durationMinutes,
          timezoneOffsetMinutes: input.timezoneOffset,
          videoCallLink: `https://inteira.app/sala/${newAppointmentId}`,
          // Al asesor no se le manda el código: lo recibe del cliente al llegar.
          presencial: datosPresencial ? { ...datosPresencial, checkinCode: null } : null,
        }).catch(() => {});
      }

      // In-app notifications
      createNotification({
        userId: ctx.user.id,
        type: "appointment_confirmed",
        title: esPresencial ? "✅ Cita presencial confirmada" : "✅ Cita confirmada",
        message: esPresencial
          ? `Tu cita presencial con ${professionalUser?.name ?? "el especialista"} quedó agendada. Tu código de llegada es ${checkinCode}.`
          : `Tu cita con ${professionalUser?.name ?? "el especialista"} quedó agendada para el ${appointmentDateObj.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}`,
        link: "/citas",
        audience: "user",
      }).catch(() => {});
      createNotification({
        userId: professional.userId,
        type: "new_appointment",
        title: "📅 Nueva cita agendada",
        message: `${userRecord?.name ?? "Un usuario"} agendó una cita contigo para el ${appointmentDateObj.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}`,
        link: "/panel-profesional",
        audience: "professional",
      }).catch(() => {});

      return {
        success: true,
        videoCallLink: videoCall?.url ?? null,
        creditsUsed: creditCost,
        modality: input.modality,
        checkinCode,
      };
    }),

  // Cancel appointment
  cancelAppointment: protectedProcedure
    .input(
      z.object({
        appointmentId: z.number(),
        reason: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const appointment = await db.getAppointmentById(input.appointmentId);
      if (!appointment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Appointment not found",
        });
      }

      // Check authorization (user)
      if (
        ctx.user.role === "user" &&
        Number(appointment.userId) !== Number(ctx.user.id)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to cancel this appointment",
        });
      }

      // Fix 1: guard — no cancelar citas en estado terminal
      if (["canceled", "completed", "no-show"].includes(appointment.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Esta cita no puede ser cancelada" });
      }

      // ── Política de cancelación ───────────────────────────────────────────
      const now = new Date();
      const createdAt = new Date(appointment.createdAt);
      const hoursSinceBooked = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      const appointmentTime = new Date(appointment.appointmentDate);
      const hoursUntil = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      console.log("[Cancel] hoursUntil:", hoursUntil, "hoursSinceBooked:", hoursSinceBooked);

      const canceledByRole =
        ctx.user.role === "professional" ? "professional" :
        ctx.user.role === "admin"
          ? (Number(appointment.userId) === Number(ctx.user.id) ? "user" : "admin")
          : "user";

      // Verificar que el profesional es dueño de esta cita
      let userProfessional: Awaited<ReturnType<typeof db.getProfessionalByUserId>> = null;
      if (canceledByRole === "professional") {
        userProfessional = await db.getProfessionalByUserId(ctx.user.id);
        if (!userProfessional || Number(appointment.professionalId) !== Number(userProfessional.id)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to cancel this appointment" });
        }
      }
      // Admins pueden cancelar cualquier cita sin validación adicional

      let penaltyAmount = 0;
      let penaltyType: "none" | "partial" | "late" | "credits_lost" = "none";

      if (canceledByRole === "professional") {
        // Profesional cancela: siempre devolver los créditos reservados al cliente
        // Fix 4: solo actuar sobre créditos si el status es "scheduled" (pending_review ya los tiene confirmados)
        if (appointment.status === "scheduled") {
          await refundCredits(appointment.userId, input.appointmentId).catch((err: any) => console.error("[Credits] refundCredits error (professional cancel):", err?.message));
        }
        // Multa en pesos según tier y anticipación (se descuenta del professionalWallet)
        const isPro = (userProfessional as any)?.tier === "pro";
        if (hoursUntil > 12) {
          penaltyAmount = 0;
          penaltyType = "none";
        } else if (hoursUntil > 5) {
          // Entre 5 y 12 horas: básico paga $70, pro sin penalización
          penaltyAmount = isPro ? 0 : 70;
          penaltyType = isPro ? "none" : "partial";
        } else {
          // 5 horas o menos: básico $150, pro $250
          penaltyAmount = isPro ? 250 : 150;
          penaltyType = "late";
        }
      } else if (canceledByRole === "admin") {
        // Fix 3: admin cancela cita de tercero — siempre reembolsar créditos al usuario
        if (appointment.status === "scheduled") {
          await refundCredits(appointment.userId, input.appointmentId).catch((err: any) => console.error("[Credits] refundCredits error (admin cancel):", err?.message));
        }
        penaltyAmount = 0;
        penaltyType = "none";
      } else {
        // Cliente cancela:
        // Reembolso si canceló dentro de las primeras 4h desde que agendó,
        // O si cancela con más de 4h de anticipación a la cita.
        if (hoursSinceBooked <= 4 || hoursUntil >= 4) {
          if (appointment.status === "scheduled") {
            await refundCredits(appointment.userId, input.appointmentId).catch((err: any) => console.error("[Credits] refundCredits error (user cancel):", err?.message));
          }
          penaltyAmount = 0;
          penaltyType = "none";
        } else {
          // Fuera de ventana de gracia y menos de 4h para la cita: créditos perdidos
          if (appointment.status === "scheduled") {
            await confirmCredits(input.appointmentId).catch((err: any) => console.error("[Credits] confirmCredits error (user cancel late):", err?.message));
          }
          penaltyAmount = 0;
          penaltyType = "credits_lost";
        }
      }

      // Update appointment status
      const db_instance = await db.getDb();
      if (!db_instance) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      const client = (db_instance as any).$client;
      await new Promise<void>((resolve, reject) => {
        client.execute(
          `UPDATE appointments
           SET status = 'canceled', canceledAt = NOW(), canceledBy = ?,
               cancellationReason = ?, penaltyAmount = ?, penaltyType = ?, updatedAt = NOW()
           WHERE id = ?`,
          [canceledByRole, input.reason ?? null, penaltyAmount, penaltyType, input.appointmentId],
          (err: any) => { if (err) reject(err); else resolve(); }
        );
      });

      // Registrar penalización del profesional si aplica (descuento en pesos del wallet)
      if (canceledByRole === "professional" && penaltyAmount > 0) {
        await chargeProfessionalPenalty(appointment.professionalId, penaltyAmount).catch(() => {});
        await new Promise<void>((resolve) => {
          client.execute(
            "INSERT INTO professionalPenalties (professionalId, appointmentId, amount, penaltyType, reason) VALUES (?, ?, ?, ?, ?)",
            [appointment.professionalId, input.appointmentId, penaltyAmount, penaltyType,
             `Cancelación con ${Math.round(hoursUntil)}h de anticipación`],
            (err: any) => { if (err) console.error("[cancel] penalty insert:", err?.message); resolve(); }
          );
        });
      }

      // Send cancellation emails
      const canceledUser = await db.getUserById(appointment.userId);
      const canceledProfessional = await db.getProfessionalById(appointment.professionalId);
      const canceledProfUser = canceledProfessional
        ? await db.getUserById(canceledProfessional.userId)
        : null;

      const hasRefund = canceledByRole === "professional" || hoursUntil >= 4;
      const sessionCost = await getAppointmentCreditCost(input.appointmentId) || 350;

      if (canceledUser?.email) {
        sendAppointmentCancellation({
          userEmail: canceledUser.email,
          userName: canceledUser.name ?? "Usuario",
          professionalName: canceledProfUser?.name ?? "Especialista",
          appointmentDate: new Date(appointment.appointmentDate),
          canceledBy: canceledByRole === "user" ? "el usuario" : "el profesional",
          hasRefund,
          credits: sessionCost,
          timezoneOffsetMinutes: appointment.timezoneOffset ?? -360,
        }).catch(() => {});
      }

      if (canceledProfUser?.email) {
        sendAppointmentCancelledToProfessional({
          professionalEmail: canceledProfUser.email,
          professionalName: canceledProfUser.name ?? "Especialista",
          patientName: canceledUser?.name ?? "Usuario",
          appointmentDate: new Date(appointment.appointmentDate),
          canceledBy: canceledByRole as "user" | "professional" | "admin",
          timezoneOffsetMinutes: appointment.timezoneOffset ?? -360,
        }).catch(() => {});
      }

      // In-app notifications
      if (canceledByRole === "professional" || canceledByRole === "admin") {
        createNotification({
          userId: appointment.userId,
          type: "appointment_cancelled",
          title: "❌ Cita cancelada",
          message: `Tu cita del ${new Date(appointment.appointmentDate).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })} fue cancelada por el especialista`,
          link: "/citas",
          audience: "all",
        }).catch(() => {});
      }
      if (canceledProfessional && (canceledByRole === "user" || canceledByRole === "admin")) {
        createNotification({
          userId: canceledProfessional.userId,
          type: "appointment_cancelled",
          title: "❌ Cita cancelada",
          message: `${canceledUser?.name ?? "El usuario"} canceló su cita del ${new Date(appointment.appointmentDate).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}`,
          link: "/panel-profesional",
          audience: "all",
        }).catch(() => {});
      }

      return { success: true };
    }),

  // Get appointment details
  getAppointment: protectedProcedure
    .input(z.object({ appointmentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const appointment = await db.getAppointmentById(input.appointmentId);
      if (!appointment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Appointment not found",
        });
      }

      // Check authorization
      if (
        ctx.user.role === "user" &&
        Number(appointment.userId) !== Number(ctx.user.id)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to view this appointment",
        });
      }

      if (ctx.user.role === "professional") {
        const viewingProfessional = await db.getProfessionalByUserId(ctx.user.id);
        if (!viewingProfessional || appointment.professionalId !== viewingProfessional.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to view this appointment" });
        }
      }

      const professional = await db.getProfessionalById(
        appointment.professionalId
      );
      const user = await db.getUserById(appointment.userId);

      // El código de llegada solo lo ve el cliente de la cita.
      const esElCliente = Number(appointment.userId) === Number(ctx.user.id);
      const { checkinCode, ...resto } = appointment as any;

      return {
        ...resto,
        checkinCode: esElCliente ? checkinCode ?? null : null,
        professional,
        user: {
          name: user?.name,
          email: user?.email,
          phone: user?.phone,
        },
      };
    }),

  // Mark appointment as completed
  completeAppointment: protectedProcedure
    .input(z.object({ appointmentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const appointment = await db.getAppointmentById(input.appointmentId);
      if (!appointment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Appointment not found",
        });
      }

      // Only professional can mark as completed — and only their own appointment
      if (ctx.user.role !== "professional") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only professionals can mark appointments as completed",
        });
      }

      // Fix: professionalId in appointments is professionals.id, not users.id
      const completingProfessional = await db.getProfessionalByUserId(ctx.user.id);
      if (!completingProfessional || appointment.professionalId !== completingProfessional.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to complete this appointment",
        });
      }

      // En presencial, lo que prueba que la sesión ocurrió es el código del
      // cliente; sin él, marcarla como terminada llevaría a pagarla sola.
      if ((appointment as any).modality === "in_person" && !(appointment as any).checkedInAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Primero registra el código de llegada que te da el cliente.",
        });
      }

      const db_instance = await db.getDb();
      if (!db_instance) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      const client = (db_instance as any).$client;
      await new Promise<void>((resolve, reject) => {
        client.execute(
          "UPDATE appointments SET status = 'pending_review', updatedAt = NOW() WHERE id = ?",
          [input.appointmentId],
          (err: any) => { if (err) reject(err); else resolve(); }
        );
      });

      // Notify user to leave a review
      createNotification({
        userId: appointment.userId,
        type: "info",
        title: "¡Tu sesión terminó!",
        message: "Por favor califica tu experiencia para liberar el pago al profesional.",
        link: "/citas",
        audience: "user",
      }).catch(() => {});

      return { success: true };
    }),

  // Submit review → completes appointment and credits professional
  submitReview: protectedProcedure
    .input(z.object({
      appointmentId: z.number(),
      rating: z.number().min(1).max(5),
      comment: z.string().max(2000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const appointment = await db.getAppointmentById(input.appointmentId);
      if (!appointment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cita no encontrada" });
      }
      if (Number(appointment.userId) !== Number(ctx.user.id)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No autorizado" });
      }
      if (appointment.status !== "pending_review") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Esta cita no está pendiente de reseña" });
      }

      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const client = (dbInstance as any).$client;

      // Check for existing review (idempotent)
      const existingRows = await new Promise<any[]>((resolve, reject) => {
        client.execute(
          "SELECT id FROM reviews WHERE appointmentId = ? LIMIT 1",
          [input.appointmentId],
          (err: any, results: any) => {
            if (err) reject(err);
            else resolve(Array.isArray(results) ? results : []);
          }
        );
      });

      if (existingRows.length === 0) {
        // Insert review
        await new Promise<void>((resolve, reject) => {
          client.execute(
            `INSERT INTO reviews (professionalId, userId, appointmentId, rating, comment, isVerified, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, 0, NOW(), NOW())`,
            [appointment.professionalId, ctx.user.id, input.appointmentId, input.rating, input.comment ?? null],
            (err: any) => { if (err) reject(err); else resolve(); }
          );
        });

        // Update professional average rating in one SQL round-trip
        await new Promise<void>((resolve) => {
          client.execute(
            `UPDATE professionals
             SET averageRating = (SELECT AVG(rating) FROM reviews WHERE professionalId = ?),
                 totalReviews  = (SELECT COUNT(*) FROM reviews WHERE professionalId = ?),
                 updatedAt = NOW()
             WHERE id = ?`,
            [appointment.professionalId, appointment.professionalId, appointment.professionalId],
            (err: any) => { if (err) console.error("[submitReview] avg rating update error:", err?.message); resolve(); }
          );
        });

        // Credit professional earnings (inside idempotency block — only runs once per review)
        const professional = await db.getProfessionalById(appointment.professionalId);
        if (!professional) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Profesional no encontrado" });

        const { creditProfessionalEarning } = await import("./professionalWallet");
        const sessionCreditCost = await getAppointmentCreditCost(input.appointmentId);
        // member_basic=245, member_premium=1250, individual_basic=350, individual_premium=1500
        const sessionType = (sessionCreditCost >= 1250) ? "premium" : "basic";
        const apptPricingType = ((appointment as any).pricingType ?? "individual") as "individual" | "member";
        const { netAmount } = await creditProfessionalEarning(
          professional.id,
          input.appointmentId,
          (professional.tier ?? "basic") as "basic" | "pro",
          sessionType,
          apptPricingType
        );

        // Notify professional
        const profUser = await db.getUserById(professional.userId);
        if (profUser?.email) {
          const { sendProfessionalEarningNotification } = await import("./email");
          sendProfessionalEarningNotification({
            professionalEmail: profUser.email,
            professionalName: profUser.name ?? "Profesional",
            netAmount,
            appointmentId: input.appointmentId,
          }).catch(() => {});
        }

        createNotification({
          userId: professional.userId,
          type: "new_earning",
          title: "Reseña recibida",
          message: `Recibiste una reseña de ${input.rating} estrella${input.rating !== 1 ? "s" : ""}. Se acreditaron $${netAmount} MXN a tu wallet.`,
          link: "/profesional/wallet",
          audience: "professional",
        }).catch(() => {});
      }

      // Mark appointment as completed
      await new Promise<void>((resolve, reject) => {
        client.execute(
          "UPDATE appointments SET status = 'completed', updatedAt = NOW() WHERE id = ?",
          [input.appointmentId],
          (err: any) => { if (err) reject(err); else resolve(); }
        );
      });

      return { success: true };
    }),

  // Called when user clicks "Unirse a la sesión" — confirms credits immediately
  joinAppointment: protectedProcedure
    .input(z.object({ appointmentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const appointment = await db.getAppointmentById(input.appointmentId);
      if (!appointment || Number(appointment.userId) !== Number(ctx.user.id)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // Record attendance regardless of status (used for no-show arbitration)
      const joinDb = await db.getDb();
      if (joinDb) {
        await new Promise<void>((resolve) => {
          (joinDb as any).$client.execute(
            "UPDATE appointments SET userJoinedAt = COALESCE(userJoinedAt, NOW()) WHERE id = ?",
            [input.appointmentId],
            (err: any) => { if (err) console.error("[Attendance] userJoinedAt:", err?.message); resolve(); }
          );
        });
      }

      // Idempotent: only act on scheduled appointments
      if (appointment.status !== "scheduled") return { success: true };

      await confirmCredits(input.appointmentId).catch((err: any) => console.error("[Credits] confirmCredits error (session join):", err?.message));

      // Email debit notification (fire-and-forget)
      const userRecord = await db.getUserById(ctx.user.id).catch(() => null);
      const sessionCost = await getAppointmentCreditCost(input.appointmentId) || 350;
      if (userRecord?.email) {
        const { sendCreditsDebitedEmail } = await import("./email");
        sendCreditsDebitedEmail({
          userEmail: userRecord.email,
          userName: userRecord.name ?? "Usuario",
          credits: sessionCost,
          appointmentDate: new Date((appointment as any).appointmentDate),
        }).catch(() => {});
      }

      createNotification({
        userId: ctx.user.id,
        type: "credits_debited",
        title: "💳 Créditos debitados",
        message: `Se debitaron ${sessionCost} créditos por tu sesión de hoy`,
        link: "/wallet",
        audience: "user",
      }).catch(() => {});

      return { success: true };
    }),

  // Mark appointment as pending_review when user leaves the video call
  markAppointmentPendingReview: protectedProcedure
    .input(z.object({ appointmentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const appointment = await db.getAppointmentById(input.appointmentId);
      if (!appointment) throw new TRPCError({ code: "NOT_FOUND", message: "Cita no encontrada" });
      if (Number(appointment.userId) !== Number(ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN", message: "No autorizado" });

      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await new Promise<void>((resolve, reject) => {
        (dbInstance as any).$client.execute(
          "UPDATE appointments SET status = 'pending_review', updatedAt = NOW() WHERE id = ? AND status IN ('scheduled', 'in_progress')",
          [input.appointmentId],
          (err: any) => { if (err) reject(err); else resolve(); }
        );
      });

      return { success: true };
    }),

  /**
   * El asesor registra la llegada del cliente al consultorio con el código
   * de 4 dígitos que el cliente le da en persona. Es la prueba de que la cita
   * presencial ocurrió: con ella el cron la completa y libera el pago.
   *
   * Se acepta desde 30 minutos antes del inicio hasta 24 horas después, por
   * si el asesor lo olvidó en el momento. Tras 5 intentos fallidos en una
   * cita se bloquea para que nadie pueda probar los 10.000 códigos.
   */
  confirmCheckin: protectedProcedure
    .input(z.object({ appointmentId: z.number(), code: z.string().regex(/^\d{4}$/, "El código tiene 4 dígitos") }))
    .mutation(async ({ ctx, input }) => {
      const professional = await db.getProfessionalByUserId(ctx.user.id);
      const appointment: any = await db.getAppointmentById(input.appointmentId);
      if (!appointment) throw new TRPCError({ code: "NOT_FOUND", message: "Cita no encontrada" });
      if (!professional || Number(appointment.professionalId) !== Number(professional.id)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Esta cita no es tuya" });
      }
      if (appointment.modality !== "in_person") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Esta cita es online; no lleva código." });
      }
      if (appointment.checkedInAt) {
        return { success: true, alreadyCheckedIn: true };
      }
      if (!["scheduled", "in_progress", "pending_review"].includes(appointment.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Esta cita ya no está activa." });
      }

      const inicio = new Date(appointment.appointmentDate).getTime();
      const ahora = Date.now();
      if (ahora < inicio - 30 * 60_000) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "El código se registra cuando el cliente llega, a partir de 30 minutos antes." });
      }
      if (ahora > inicio + 24 * 3_600_000) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Pasaron más de 24 horas; esta cita la revisa el equipo de Inteira." });
      }

      const intentos = intentosCheckin.get(input.appointmentId) ?? 0;
      if (intentos >= 5) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Demasiados intentos con código incorrecto. Escríbenos y lo revisamos.",
        });
      }
      if (String(appointment.checkinCode ?? "") !== input.code) {
        intentosCheckin.set(input.appointmentId, intentos + 1);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Código incorrecto. Te quedan ${4 - intentos} intentos.`,
        });
      }
      intentosCheckin.delete(input.appointmentId);

      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await new Promise<void>((resolve, reject) => {
        (dbInstance as any).$client.execute(
          `UPDATE appointments
              SET checkedInAt = NOW(),
                  professionalJoinedAt = COALESCE(professionalJoinedAt, NOW()),
                  userJoinedAt = COALESCE(userJoinedAt, NOW()),
                  status = IF(status = 'scheduled', 'in_progress', status),
                  updatedAt = NOW()
            WHERE id = ? AND checkedInAt IS NULL`,
          [input.appointmentId],
          (err: any) => (err ? reject(err) : resolve())
        );
      });

      createNotification({
        userId: appointment.userId,
        type: "info",
        title: "📍 Llegada registrada",
        message: "Tu especialista registró tu llegada al consultorio.",
        link: "/citas",
        audience: "user",
      }).catch(() => {});

      return { success: true, alreadyCheckedIn: false };
    }),

  /**
   * Sala de entrada. Sustituye al enlace crudo de Daily en los correos:
   * verifica que quien abre el enlace sea realmente una de las dos partes de
   * la cita, y devuelve el estado de llegada de ambos.
   */
  getRoomAccess: protectedProcedure
    .input(z.object({ appointmentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const appointment: any = await db.getAppointmentById(input.appointmentId);
      if (!appointment) throw new TRPCError({ code: "NOT_FOUND", message: "Cita no encontrada" });

      const professional = await db.getProfessionalByUserId(ctx.user.id);
      const isProfessional =
        !!professional && Number(appointment.professionalId) === Number(professional.id);
      const isClient = Number(appointment.userId) === Number(ctx.user.id);

      if (!isProfessional && !isClient) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Esta cita no es tuya" });
      }
      // Una cita presencial no tiene sala: si alguien abre el enlace, se le
      // dice a dónde ir en vez de mostrarle una sala vacía.
      if (appointment.modality === "in_person") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Esta cita es presencial${appointment.clinicAddress ? `, en ${appointment.clinicAddress}` : ""}. No hay videollamada.`,
        });
      }
      const role: "user" | "professional" = isProfessional ? "professional" : "user";

      const dbInstance = await db.getDb();
      const client = dbInstance ? (dbInstance as any).$client : null;

      // Nombre de la contraparte
      let otherName = role === "professional" ? "el paciente" : "el especialista";
      if (client) {
        const otherUserId = role === "professional"
          ? appointment.userId
          : (await db.getProfessionalById(appointment.professionalId))?.userId;
        if (otherUserId) {
          const rows = await new Promise<any[]>((resolve) => {
            client.execute("SELECT name FROM `users` WHERE id = ? LIMIT 1", [otherUserId],
              (err: any, r: any) => resolve(err || !Array.isArray(r) ? [] : r));
          });
          if (rows[0]?.name) otherName = rows[0].name;
        }
      }

      const start = new Date(appointment.appointmentDate);
      const end = new Date(start.getTime() + (appointment.durationMinutes ?? 60) * 60000);
      const now = Date.now();
      // Se puede entrar desde 10 minutos antes y hasta 15 después del fin
      const opensAt = start.getTime() - 10 * 60000;
      const closesAt = end.getTime() + 15 * 60000;

      const myArrivedAt = role === "professional"
        ? appointment.professionalJoinedAt
        : appointment.userJoinedAt;
      const otherArrivedAt = role === "professional"
        ? appointment.userJoinedAt
        : appointment.professionalJoinedAt;

      return {
        role,
        appointmentId: appointment.id,
        status: appointment.status,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        durationMinutes: appointment.durationMinutes ?? 60,
        otherName,
        myArrivedAt: myArrivedAt ? new Date(myArrivedAt).toISOString() : null,
        otherArrivedAt: otherArrivedAt ? new Date(otherArrivedAt).toISOString() : null,
        canEnter: now >= opensAt && now <= closesAt,
        opensAt: new Date(opensAt).toISOString(),
        isOver: now > closesAt,
        isCanceled: ["canceled", "no-show"].includes(appointment.status),
      };
    }),

  /**
   * Registra la llegada y devuelve el enlace de la sala.
   * Es el único camino a la videollamada: el enlace de Daily ya no viaja en
   * los correos, así que nadie ajeno a la cita puede entrar.
   */
  confirmArrival: protectedProcedure
    .input(z.object({ appointmentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const appointment: any = await db.getAppointmentById(input.appointmentId);
      if (!appointment) throw new TRPCError({ code: "NOT_FOUND", message: "Cita no encontrada" });

      const professional = await db.getProfessionalByUserId(ctx.user.id);
      const isProfessional =
        !!professional && Number(appointment.professionalId) === Number(professional.id);
      const isClient = Number(appointment.userId) === Number(ctx.user.id);
      if (!isProfessional && !isClient) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Esta cita no es tuya" });
      }
      if (["canceled", "no-show"].includes(appointment.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Esta cita ya fue cerrada" });
      }

      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const client = (dbInstance as any).$client;

      const column = isProfessional ? "professionalJoinedAt" : "userJoinedAt";
      await new Promise<void>((resolve) => {
        client.execute(
          `UPDATE appointments SET ${column} = COALESCE(${column}, NOW()) WHERE id = ?`,
          [input.appointmentId],
          (err: any) => { if (err) console.error("[Sala] arrival:", err?.message); resolve(); }
        );
      });

      // El cliente además confirma el consumo de créditos, igual que antes
      if (isClient && appointment.status === "scheduled") {
        await confirmCredits(input.appointmentId).catch((err: any) =>
          console.error("[Credits] confirmCredits (sala):", err?.message));
      }

      const roomUrl = isProfessional
        ? (appointment.videoCallUrlProfessional ?? appointment.videoCallLink)
        : (appointment.videoCallUrlUser ?? appointment.videoCallLink);

      if (!roomUrl) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "La sala no está lista todavía" });
      }

      return { roomUrl, role: isProfessional ? "professional" : "user" };
    }),

  // Called when the PROFESSIONAL opens the video room — records attendance so
  // the cron can tell a client no-show apart from a professional no-show.
  markProfessionalJoined: protectedProcedure
    .input(z.object({ appointmentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const appointment = await db.getAppointmentById(input.appointmentId);
      if (!appointment) throw new TRPCError({ code: "NOT_FOUND", message: "Cita no encontrada" });

      const professional = await db.getProfessionalByUserId(ctx.user.id);
      if (!professional || Number(appointment.professionalId) !== Number(professional.id)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No autorizado" });
      }

      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await new Promise<void>((resolve, reject) => {
        (dbInstance as any).$client.execute(
          "UPDATE appointments SET professionalJoinedAt = COALESCE(professionalJoinedAt, NOW()) WHERE id = ?",
          [input.appointmentId],
          (err: any) => { if (err) reject(err); else resolve(); }
        );
      });

      return { success: true };
    }),

  // User reports that the professional never showed up → immediate refund.
  // Only allowed once the session window has clearly passed and only if the
  // professional never registered attendance.
  reportProfessionalNoShow: protectedProcedure
    .input(z.object({ appointmentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const appointment = await db.getAppointmentById(input.appointmentId);
      if (!appointment) throw new TRPCError({ code: "NOT_FOUND", message: "Cita no encontrada" });
      if (Number(appointment.userId) !== Number(ctx.user.id)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No autorizado" });
      }
      if (!["scheduled", "in_progress", "pending_review"].includes(appointment.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Esta cita ya fue cerrada. Contacta a soporte." });
      }
      if ((appointment as any).professionalJoinedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El profesional sí ingresó a la sesión. Si hubo un problema, contacta a soporte.",
        });
      }

      // Wait until 15 minutes past the start time before allowing the report.
      const startsAt = new Date((appointment as any).appointmentDate).getTime();
      if (Date.now() < startsAt + 15 * 60 * 1000) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Espera al menos 15 minutos después de la hora de inicio antes de reportar.",
        });
      }

      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await new Promise<void>((resolve, reject) => {
        (dbInstance as any).$client.execute(
          `UPDATE appointments SET status = 'canceled', canceledBy = 'professional',
                  canceledAt = NOW(), cancellationReason = 'El profesional no se presentó a la sesión',
                  updatedAt = NOW()
           WHERE id = ? AND status IN ('scheduled', 'in_progress', 'pending_review')`,
          [input.appointmentId],
          (err: any) => { if (err) reject(err); else resolve(); }
        );
      });

      const refunded = await refundCredits(
        appointment.userId, input.appointmentId, "el profesional no se presentó"
      ).catch((err: any) => {
        console.error("[Credits] refundCredits error (professional no-show report):", err?.message);
        return 0;
      });

      createNotification({
        userId: ctx.user.id,
        type: "refund",
        title: "💰 Créditos devueltos",
        message: `Te devolvimos ${refunded} créditos porque el profesional no se presentó.`,
        link: "/wallet",
        audience: "user",
      }).catch(() => {});

      return { success: true, refunded };
    }),

  // Mark appointment as no-show (professional action)
  markNoShow: protectedProcedure
    .input(z.object({ appointmentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const appointment = await db.getAppointmentById(input.appointmentId);
      if (!appointment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cita no encontrada" });
      }
      if (ctx.user.role !== "professional") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo profesionales pueden marcar no-show" });
      }
      const professional = await db.getProfessionalByUserId(ctx.user.id);
      if (!professional || appointment.professionalId !== professional.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No autorizado" });
      }
      if (appointment.status !== "scheduled") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Solo citas agendadas pueden marcarse como no-show" });
      }

      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const client = (dbInstance as any).$client;
      await new Promise<void>((resolve, reject) => {
        client.execute(
          "UPDATE appointments SET status = 'no-show', updatedAt = NOW() WHERE id = ?",
          [input.appointmentId],
          (err: any) => { if (err) reject(err); else resolve(); }
        );
      });

      // Confirm reserved credits (user no-showed → professional gets paid, credits consumed)
      await confirmCredits(input.appointmentId).catch((err: any) => console.error("[Credits] confirmCredits error (no-show):", err?.message));

      createNotification({
        userId: appointment.userId,
        type: "info",
        title: "No asistencia registrada",
        message: "El profesional registró que no asististe a tu cita. Contacta soporte si crees que es un error.",
        link: "/citas",
        audience: "user",
      }).catch(() => {});

      return { success: true };
    }),
});
