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
          message: "Appointments must be scheduled at least 4 hours in advance",
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

      // Check user subscription
      const subscription = await db.getUserSubscription(ctx.user.id);
      if (!subscription || subscription.status !== "active") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User does not have an active subscription",
        });
      }

      // Check plan limits
      const plan = await db.getSubscriptionPlanById(subscription.planId);
      if (!plan) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Subscription plan not found",
        });
      }

      if (
        plan.maxAppointmentsPerMonth &&
        (subscription.appointmentsUsedThisMonth ?? 0) >= plan.maxAppointmentsPerMonth
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Monthly appointment limit reached",
        });
      }

      if (
        plan.maxMinutesPerAppointment &&
        input.durationMinutes > plan.maxMinutesPerAppointment
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Appointment duration exceeds plan limit of ${plan.maxMinutesPerAppointment} minutes`,
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
      await db.createAppointment({
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

      return { success: true, videoCallLink: videoCall.joinUrl };
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

      // Check authorization
      if (
        ctx.user.role === "user" &&
        appointment.userId !== ctx.user.id
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to cancel this appointment",
        });
      }

      if (
        ctx.user.role === "professional" &&
        appointment.professionalId !== ctx.user.id
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to cancel this appointment",
        });
      }

      // Check if appointment can be canceled (at least 4 hours before)
      const now = new Date();
      const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);
      if (appointment.appointmentDate <= fourHoursFromNow) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot cancel appointment less than 4 hours before start time",
        });
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
          canceledBy: ctx.user.role === "user" ? "user" : "professional",
          cancellationReason: input.reason,
          updatedAt: new Date(),
        })
        .where(eq(appointments.id, input.appointmentId));

      // TODO: Send cancellation email

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

      // Only professional can mark as completed
      if (ctx.user.role !== "professional") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only professionals can mark appointments as completed",
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

      return { success: true };
    }),
});
