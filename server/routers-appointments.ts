import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  canScheduleAppointment,
  getAvailableSlots,
  isTimeWithinAvailability,
  calculateEndTime,
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

/** Returns true if the user has an active plan credit batch (plan_basic or plan_pro). */
async function userHasActiveMembership(userId: number): Promise<boolean> {
  const { getDb } = await import("./db");
  const dbConn = await getDb();
  if (!dbConn) return false;
  const client = (dbConn as any).$client;
  const rows = await new Promise<any[]>((resolve) => {
    client.execute(
      `SELECT id FROM creditBatches
       WHERE userId = ? AND source IN ('plan_basic', 'plan_pro')
         AND expiredEarly = 0 AND expiresAt > NOW() AND remaining > 0
       LIMIT 1`,
      [userId],
      (err: any, results: any) => {
        if (err) { console.error("[userHasActiveMembership]", err?.message); resolve([]); }
        else resolve(Array.isArray(results) ? results : []);
      }
    );
  });
  return rows.length > 0;
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

export const appointmentRouter = router({
  // Get available slots for a professional on a specific date
  getAvailableSlots: publicProcedure
    .input(
      z.object({
        professionalId: z.number(),
        date: z.string(), // ISO date string yyyy-MM-dd
        sessionType: z.enum(["basic", "premium"]).optional().default("basic"),
        timezoneOffset: z.number().optional().default(-300),
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

      const availability = await db.getProfessionalAvailability(
        input.professionalId
      );
      const appointments = await db.getProfessionalAppointments(
        input.professionalId
      );

      const bookedTimes = appointments
        .filter((apt) => apt.status === "scheduled")
        .map((apt) => apt.appointmentDate);

      console.log("[DIAG slots v2] date:", input.date, "professionalId:", input.professionalId, "availability count:", availability.length, "availability:", JSON.stringify(availability));

      // Construir la fecha en hora local del cliente
      const offsetMs = (input.timezoneOffset ?? -300) * 60 * 1000;
      const dateObj = new Date(input.date + "T00:00:00Z"); // medianoche UTC
      // Ajustar al inicio del día en la zona del cliente
      const clientMidnight = new Date(dateObj.getTime() - offsetMs);
      const slots = getAvailableSlots(
        clientMidnight,
        availability,
        durationMinutes,
        bookedTimes,
        offsetMs,
      );
      console.log("[Slots] offsetMs:", offsetMs, "date:", clientMidnight.toISOString(), "slots count:", slots.length, "slots:", slots.map(s => s.startTime));
      // Return simple time strings like "09:00", "10:00"
      return slots.map((s) => s.startTime);
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      const sessionConfig = SESSION_TYPES[input.sessionType];
      const durationMinutes = sessionConfig.durationMinutes;
      const hasMembership = await userHasActiveMembership(ctx.user.id);
      const pricingType: "individual" | "member" = hasMembership ? "member" : "individual";
      const creditCost = hasMembership ? sessionConfig.memberCredits : sessionConfig.credits;
      const appointmentDateObj = new Date(input.appointmentDate);

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

      // Check professional availability
      const availability = await db.getProfessionalAvailability(
        input.professionalId
      );
      const tzOffsetMs = (input.timezoneOffset ?? 0) * 60 * 1000;
      if (
        !isTimeWithinAvailability(
          appointmentDateObj,
          durationMinutes,
          availability,
          tzOffsetMs
        )
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Selected time is not within professional's availability",
        });
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

      // Create appointment first to get the real ID for Daily.co room name
      const newAppointmentId = await db.createAppointment({
        userId: ctx.user.id,
        professionalId: input.professionalId,
        specialtyId: professional.specialtyId,
        appointmentDate: input.appointmentDate, // store the local-time string; mysql2 Date objects get UTC-shifted
        durationMinutes,
        videoCallType: "daily",
        videoCallLink: undefined,
        videoCallId: undefined,
        notes: input.notes,
        status: "scheduled",
        timezoneOffset: input.timezoneOffset,
      });

      // Generate Daily.co room using the real appointment ID
      const videoCall = await generateVideoCallLink(
        newAppointmentId,
        appointmentDateObj,
        appointmentEndDate
      );

      // Update appointment row with the video call link and pricingType
      const { getDb } = await import("./db");
      const dbConn = await getDb();
      if (dbConn) {
        await new Promise<void>((resolve) => {
          (dbConn as any).$client.execute(
            "UPDATE appointments SET videoCallLink = ?, videoCallId = ?, pricingType = ? WHERE id = ?",
            [videoCall.url, videoCall.roomName, pricingType, newAppointmentId],
            (err: any) => { if (err) console.error("[createAppointment] update video call:", err); resolve(); }
          );
        });
      }

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
          videoCallLink: videoCall.url,
          timezoneOffsetMinutes: input.timezoneOffset,
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
          videoCallLink: videoCall.url,
        }).catch(() => {});
      }

      // In-app notifications
      createNotification({
        userId: ctx.user.id,
        type: "appointment_confirmed",
        title: "✅ Cita confirmada",
        message: `Tu cita con ${professionalUser?.name ?? "el especialista"} quedó agendada para el ${appointmentDateObj.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}`,
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
        videoCallLink: videoCall.url,
        creditsUsed: creditCost,
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
        }).catch(() => {});
      }

      if (canceledProfUser?.email) {
        sendAppointmentCancelledToProfessional({
          professionalEmail: canceledProfUser.email,
          professionalName: canceledProfUser.name ?? "Especialista",
          patientName: canceledUser?.name ?? "Usuario",
          appointmentDate: new Date(appointment.appointmentDate),
          canceledBy: canceledByRole as "user" | "professional" | "admin",
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

      return {
        ...appointment,
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
