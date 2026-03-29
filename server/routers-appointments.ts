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
} from "./email";
import { consumeCredits, getUserCreditBalance, addCreditBatch } from "./credits";
import { createNotification } from "./notifications";

// Credit cost per session type (MXN = credits 1:1)
const SESSION_CREDIT_COST = 350; // Sesión básica

export const appointmentRouter = router({
  // Get available slots for a professional on a specific date
  getAvailableSlots: publicProcedure
    .input(
      z.object({
        professionalId: z.number(),
        date: z.string(), // ISO date string yyyy-MM-dd
        durationMinutes: z.number().optional().default(60),
      })
    )
    .query(async ({ input }) => {
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

      console.error("[DIAG slots v2] date:", input.date, "professionalId:", input.professionalId, "availability count:", availability.length, "availability:", JSON.stringify(availability));

      const dateObj = new Date(input.date + "T12:00:00");
      const slots = getAvailableSlots(
        dateObj,
        availability,
        input.durationMinutes,
        bookedTimes
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
        durationMinutes: z.number().optional().default(60),
        videoCallType: z.enum(["zoom", "google_meet"]).optional().default("zoom"),
        videoProvider: z.enum(["zoom", "google_meet"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const appointmentDateObj = new Date(input.appointmentDate);
      const videoCallType = input.videoProvider ?? input.videoCallType;

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
          input.durationMinutes,
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
      if (creditBalance < SESSION_CREDIT_COST) {
        throw new TRPCError({
          code: "PAYMENT_REQUIRED",
          message: `Saldo insuficiente. Necesitas ${SESSION_CREDIT_COST} créditos para agendar una sesión básica. Saldo actual: ${creditBalance} créditos. Recarga tu wallet en /wallet.`,
        });
      }

      // Create video call link
      const appointmentEndDate = calculateEndTime(
        appointmentDateObj,
        input.durationMinutes
      );

      const professionalUser = await db.getUserById(professional.userId);
      const userRecord = await db.getUserById(ctx.user.id);
      const specialty = await db.getSpecialtyById(professional.specialtyId);

      const videoCall = await generateVideoCallLink(
        videoCallType,
        `Consulta de ${specialty?.name ?? "especialidad"} - Inteira`,
        appointmentDateObj,
        appointmentEndDate,
        professionalUser?.email ?? "",
        userRecord?.email ?? ""
      );

      // Create appointment with video call link
      const newAppointmentId = await db.createAppointment({
        userId: ctx.user.id,
        professionalId: input.professionalId,
        specialtyId: professional.specialtyId,
        appointmentDate: appointmentDateObj,
        durationMinutes: input.durationMinutes,
        videoCallType: videoCallType,
        videoCallLink: videoCall.joinUrl,
        videoCallId: videoCall.meetingId,
        notes: input.notes,
        status: "scheduled",
      });

      // ── Deduct credits (FIFO) ─────────────────────────────────────────────
      await consumeCredits(
        ctx.user.id,
        SESSION_CREDIT_COST,
        "consume",
        newAppointmentId,
        `Sesión básica con ${professionalUser?.name ?? "especialista"}`
      );

      // Send confirmation email
      if (userRecord?.email) {
        await sendAppointmentConfirmation({
          userEmail: userRecord.email,
          userName: userRecord.name ?? "Usuario",
          professionalName: professionalUser?.name ?? "Especialista",
          specialty: specialty?.name ?? "Especialidad",
          appointmentDate: appointmentDateObj,
          durationMinutes: input.durationMinutes,
          videoCallType: videoCallType,
          videoCallLink: videoCall.joinUrl,
        });
      }

      return {
        success: true,
        videoCallLink: videoCall.joinUrl,
        creditsUsed: SESSION_CREDIT_COST,
      };
    }),

  // Cancel appointment
  cancelAppointment: protectedProcedure
    .input(
      z.object({
        appointmentId: z.number(),
        reason: z.string().optional(),
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
        appointment.userId !== ctx.user.id
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
      const canceledByRole = ctx.user.role === "user" ? "user" : "professional";

      // Verificar que el profesional es dueño de esta cita (fix bug: professionalId ≠ userId)
      if (canceledByRole === "professional") {
        const userProfessional = await db.getProfessionalByUserId(ctx.user.id);
        if (!userProfessional || appointment.professionalId !== userProfessional.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to cancel this appointment" });
        }
      }

      let penaltyAmount = 0;
      let penaltyType: "none" | "partial" | "full" | "credits_lost" = "none";

      if (canceledByRole === "professional") {
        // Profesional cancela: siempre devolver créditos al cliente
        if (appointment.status === "scheduled") {
          await addCreditBatch(appointment.userId, "individual_basic", 350).catch(() => {});
        }
        // Multa según anticipación
        if (hoursUntil >= 12) {
          penaltyAmount = 0;
          penaltyType = "none";
        } else if (hoursUntil >= 4) {
          penaltyAmount = 75;
          penaltyType = "partial";
        } else {
          penaltyAmount = 150;
          penaltyType = "full";
        }
      } else {
        // Cliente cancela
        if (hoursUntil >= 4) {
          // Con suficiente anticipación: devolver créditos
          if (appointment.status === "scheduled") {
            await addCreditBatch(appointment.userId, "individual_basic", 350).catch(() => {});
          }
          penaltyAmount = 0;
          penaltyType = "none";
        } else {
          // Cancelación tardía: cliente pierde créditos (ya consumidos)
          penaltyAmount = 0;
          penaltyType = "credits_lost";
        }
      }

      // Update appointment status
      const db_instance = await db.getDb();
      if (!db_instance) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      const { appointments } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      await db_instance
        .update(appointments)
        .set({
          status: "canceled",
          canceledAt: new Date(),
          canceledBy: canceledByRole,
          cancellationReason: input.reason,
          penaltyAmount,
          penaltyType,
          updatedAt: new Date(),
        })
        .where(eq(appointments.id, input.appointmentId));

      // Registrar penalización del profesional si aplica
      if (canceledByRole === "professional" && penaltyAmount > 0) {
        await (db_instance as any).$client.execute(
          "INSERT INTO professionalPenalties (professionalId, appointmentId, amount, penaltyType, reason) VALUES (?, ?, ?, ?, ?)",
          [appointment.professionalId, input.appointmentId, penaltyAmount, penaltyType,
           `Cancelación con ${Math.round(hoursUntil)}h de anticipación`]
        ).catch(() => {});
      }

      // Send cancellation email
      const canceledUser = await db.getUserById(appointment.userId);
      const canceledProfessional = await db.getProfessionalById(appointment.professionalId);
      const canceledProfUser = canceledProfessional
        ? await db.getUserById(canceledProfessional.userId)
        : null;

      if (canceledUser?.email) {
        await sendAppointmentCancellation({
          userEmail: canceledUser.email,
          userName: canceledUser.name ?? "Usuario",
          professionalName: canceledProfUser?.name ?? "Especialista",
          appointmentDate: appointment.appointmentDate,
          canceledBy: ctx.user.role === "user" ? "el usuario" : "el profesional",
        }).catch(() => { /* non-critical */ });
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
        appointment.userId !== ctx.user.id
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to view this appointment",
        });
      }

      if (
        ctx.user.role === "professional" &&
        appointment.professionalId !== ctx.user.id
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to view this appointment",
        });
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

      const { appointments } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      await db_instance
        .update(appointments)
        .set({
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(appointments.id, input.appointmentId));

      // Credit professional earnings
      const { creditProfessionalEarning } = await import("./professionalWallet");
      const { netAmount } = await creditProfessionalEarning(
        completingProfessional.id,
        input.appointmentId,
        (completingProfessional.tier ?? "basic") as "basic" | "pro"
      );

      // Notify professional (fire and forget)
      const profUser = await db.getUserById(completingProfessional.userId);
      if (profUser?.email) {
        const { sendProfessionalEarningNotification } = await import("./email");
        sendProfessionalEarningNotification({
          professionalEmail: profUser.email,
          professionalName: profUser.name ?? "Profesional",
          netAmount,
          appointmentId: input.appointmentId,
        }).catch(() => {});
      }

      // Notificación in-app al profesional
      createNotification({
        userId: completingProfessional.userId,
        type: "new_earning",
        title: "Asesoría completada",
        message: `Has completado una asesoría. Se acreditaron $${netAmount} MXN a tu wallet.`,
        link: "/profesional/wallet",
      }).catch(() => {});

      return { success: true };
    }),
});
