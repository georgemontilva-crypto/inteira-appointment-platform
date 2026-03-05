import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { appointmentRouter } from "./routers-appointments";

// Validation schemas
const specialtySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

const subscriptionPlanSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.string(),
  currency: z.string().default("MXN"),
  billingPeriod: z.enum(["monthly", "yearly"]),
  maxAppointmentsPerMonth: z.number().optional(),
  maxMinutesPerAppointment: z.number().optional(),
  features: z.record(z.string(), z.any()).optional(),
});

const professionalRegistrationSchema = z.object({
  specialtyId: z.number(),
  licenseNumber: z.string().min(1),
  yearsOfExperience: z.number().optional(),
  education: z.string().optional(),
  certifications: z.string().optional(),
  bio: z.string().optional(),
  hourlyRate: z.string().optional(),
});

const userProfileUpdateSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  profileImage: z.string().optional(),
});

export const appRouter = router({
  system: systemRouter,

  // Auth routes
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // User routes
  user: router({
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      return user;
    }),

    updateProfile: protectedProcedure
      .input(userProfileUpdateSchema)
      .mutation(async ({ ctx, input }) => {
        const db_instance = await db.getDb();
        if (!db_instance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        await db_instance
          .update(users)
          .set({
            ...input,
            updatedAt: new Date(),
          })
          .where(eq(users.id, ctx.user.id));

        return await db.getUserById(ctx.user.id);
      }),

    getSubscription: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserSubscription(ctx.user.id);
    }),

    getAppointments: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserAppointments(ctx.user.id);
    }),
  }),

  // Professional routes
  professional: router({
    register: protectedProcedure
      .input(professionalRegistrationSchema)
      .mutation(async ({ ctx, input }) => {
        // Check if user already registered as professional
        const existing = await db.getProfessionalByUserId(ctx.user.id);
        if (existing) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User already registered as professional",
          });
        }

        // Create professional profile
        await db.createProfessional(
          ctx.user.id,
          input.specialtyId,
          input.licenseNumber,
          {
            yearsOfExperience: input.yearsOfExperience,
            education: input.education,
            certifications: input.certifications,
            bio: input.bio,
            hourlyRate: input.hourlyRate ? input.hourlyRate : undefined,
          }
        );

        return { success: true };
      }),

    getProfile: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "professional") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User is not a professional",
        });
      }

      return await db.getProfessionalByUserId(ctx.user.id);
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const professional = await db.getProfessionalById(input.id);
        if (!professional) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Professional not found",
          });
        }

        const user = await db.getUserById(professional.userId);
        const reviews = await db.getProfessionalReviews(professional.id);

        return {
          ...professional,
          user: {
            name: user?.name,
            email: user?.email,
            profileImage: user?.profileImage,
            phone: user?.phone,
          },
          reviews,
        };
      }),

    getBySpecialty: publicProcedure
      .input(z.object({ specialtyId: z.number() }))
      .query(async ({ input }) => {
        return await db.getProfessionalsBySpecialty(input.specialtyId);
      }),

    getAppointments: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "professional") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User is not a professional",
        });
      }

      const professional = await db.getProfessionalByUserId(ctx.user.id);
      if (!professional) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Professional profile not found",
        });
      }

      return await db.getProfessionalAppointments(professional.id);
    }),

    getAvailability: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "professional") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User is not a professional",
        });
      }

      const professional = await db.getProfessionalByUserId(ctx.user.id);
      if (!professional) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Professional profile not found",
        });
      }

      return await db.getProfessionalAvailability(professional.id);
    }),

    setAvailability: protectedProcedure
      .input(
        z.object({
          dayOfWeek: z.number().min(0).max(6),
          startTime: z.string(),
          endTime: z.string(),
          isAvailable: z.boolean().default(true),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "professional") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "User is not a professional",
          });
        }

        const professional = await db.getProfessionalByUserId(ctx.user.id);
        if (!professional) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Professional profile not found",
          });
        }

        await db.createProfessionalAvailability({
          professionalId: professional.id,
          dayOfWeek: input.dayOfWeek,
          startTime: input.startTime,
          endTime: input.endTime,
          isAvailable: input.isAvailable,
        });

        return { success: true };
      }),
  }),

  // Admin routes
  admin: router({
    getPendingProfessionals: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User is not an admin",
        });
      }

      return await db.getPendingProfessionals();
    }),

    approveProfessional: protectedProcedure
      .input(z.object({ professionalId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "User is not an admin",
          });
        }

        await db.approveProfessional(input.professionalId, ctx.user.id);
        return { success: true };
      }),

    rejectProfessional: protectedProcedure
      .input(
        z.object({
          professionalId: z.number(),
          reason: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "User is not an admin",
          });
        }

        await db.rejectProfessional(input.professionalId, input.reason);
        return { success: true };
      }),
  }),

  // Specialty routes
  specialty: router({
    getAll: publicProcedure.query(async () => {
      return await db.getAllSpecialties();
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getSpecialtyById(input.id);
      }),

    create: protectedProcedure
      .input(specialtySchema)
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only admins can create specialties",
          });
        }

        await db.createSpecialty(input);
        return { success: true };
      }),
  }),

  // Appointment routes
  appointment: appointmentRouter,

  // Subscription Plan routes
  subscriptionPlan: router({
    getAll: publicProcedure.query(async () => {
      return await db.getAllSubscriptionPlans();
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getSubscriptionPlanById(input.id);
      }),

    create: protectedProcedure
      .input(subscriptionPlanSchema)
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only admins can create subscription plans",
          });
        }

        await db.createSubscriptionPlan({
          ...input,
          price: input.price,
        });

        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
