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
  basic:   { credits: 350,  durationMinutes: 60, label: "Sesión Básica" },
  premium: { credits: 1500, durationMinutes: 90, label: "Sesión Premium" },
} as const;
type SessionType = keyof typeof SESSION_TYPES;

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
      console.log("[SLOTS] Request received - professionalId:", input.professionalId, "date:", input.date, "sessionType:", input.sessionType);

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

      const dateObj = new Date(input.date + "T12:00:00");
      const slots = getAvailableSlots(
        dateObj,
        availability,
        durationMinutes,
        bookedTimes,
        input.timezoneOffset ?? 0
      );
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      const sessionConfig = SESSION_TYPES[input.sessionType];
      const durationMinutes = sessionConfig.durationMinutes;
      const creditCost = sessionConfig.credits;
      const appointmentDateObj = new Date(input.appointmentDate);

      // Validate appointment can be scheduled
      if (!canScheduleAppointment(appointmentDateObj)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Las citas deben agendarse con al menos 30 minutos de anticipación",
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
      if (
        !isTimeWithinAvailability(
          appointmentDateObj,
          durationMinutes,
          availability
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
        appointmentDate: appointmentDateObj,
        durationMinutes,
        videoCallType: "daily",
        videoCallLink: undefined,
        videoCallId: undefined,
        notes: input.notes,
        status: "scheduled",
      });

      // Generate Daily.co room using the real appointment ID
      const videoCall = await generateVideoCallLink(
        newAppointmentId,
        appointmentDateObj,
        appointmentEndDate
      );

      // Update appointment row with the video call link
      const { getDb } = await import("./db");
      const dbConn = await getDb();
      if (dbConn) {
        await new Promise<void>((resolve) => {
          (dbConn as any).$client.execute(
            "UPDATE appointments SET videoCallLink = ?, videoCallId = ? WHERE id = ?",
            [videoCall.url, videoCall.roomName, newAppointmentId],
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
          videoCallLink: videoCall.url,
        }).catch(() => {});
      }

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

      // ── Política de cancelación ───────────────────────────────────────────
      const now = new Date();
      const appointmentTime = new Date(appointment.appointmentDate);
      const hoursUntil = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);
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
        if (appointment.status === "scheduled") {
          await refundCredits(appointment.userId, input.appointmentId).catch(() => {});
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
      } else {
        // Cliente cancela
        if (hoursUntil >= 4) {
          // Con suficiente anticipación: devolver créditos reservados
          if (appointment.status === "scheduled") {
            await refundCredits(appointment.userId, input.appointmentId).catch(() => {});
          }
          penaltyAmount = 0;
          penaltyType = "none";
        } else {
          // Cancelación tardía: confirmar consumo de créditos reservados (cliente los pierde)
          if (appointment.status === "scheduled") {
            await confirmCredits(input.appointmentId).catch(() => {});
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
      const sessionCost = ((appointment as any).durationMinutes ?? 60) > 60 ? 1500 : 350;

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
      }

      // Mark appointment as completed
      await new Promise<void>((resolve, reject) => {
        client.execute(
          "UPDATE appointments SET status = 'completed', updatedAt = NOW() WHERE id = ?",
          [input.appointmentId],
          (err: any) => { if (err) reject(err); else resolve(); }
        );
      });

      // Credit professional earnings
      const professional = await db.getProfessionalById(appointment.professionalId);
      if (!professional) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Profesional no encontrado" });

      const { creditProfessionalEarning } = await import("./professionalWallet");
      const { netAmount } = await creditProfessionalEarning(
        professional.id,
        input.appointmentId,
        (professional.tier ?? "basic") as "basic" | "pro"
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
      }).catch(() => {});

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

      await confirmCredits(input.appointmentId).catch(() => {});

      // Email debit notification (fire-and-forget)
      const userRecord = await db.getUserById(ctx.user.id).catch(() => null);
      const sessionCost = (appointment as any).durationMinutes > 60 ? 1500 : 350;
      if (userRecord?.email) {
        const { sendCreditsDebitedEmail } = await import("./email");
        sendCreditsDebitedEmail({
          userEmail: userRecord.email,
          userName: userRecord.name ?? "Usuario",
          credits: sessionCost,
          appointmentDate: new Date((appointment as any).appointmentDate),
        }).catch(() => {});
      }

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
      await confirmCredits(input.appointmentId).catch(() => {});

      createNotification({
        userId: appointment.userId,
        type: "info",
        title: "No asistencia registrada",
        message: "El profesional registró que no asististe a tu cita. Contacta soporte si crees que es un error.",
        link: "/citas",
      }).catch(() => {});

      return { success: true };
    }),
});
