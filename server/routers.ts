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
import { sendProfessionalApproval, sendAdminNewProfessionalRequest } from "./email";
import {
  createNotification,
  getUnreadNotifications,
  getUnreadCount,
  markAllRead,
  markOneRead,
} from "./notifications";
import {
  getUserCreditBalance,
  getAllBatches,
  getActiveBatches,
  getNextExpirationDate,
  getCreditTransactions,
  addCreditBatch,
  expireTimedOutBatches,
  CREDIT_COSTS,
  type CreditSource,
} from "./credits";

// Validation schemas
const specialtySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  icon: z.string().max(100).optional(),
  color: z.string().max(50).optional(),
});

const subscriptionPlanSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  price: z.string().max(20),
  currency: z.string().max(10).default("MXN"),
  billingPeriod: z.enum(["monthly", "yearly"]),
  maxAppointmentsPerMonth: z.number().optional(),
  maxMinutesPerAppointment: z.number().optional(),
  features: z.record(z.string(), z.any()).optional(),
});

const professionalRegistrationSchema = z.object({
  specialtyId: z.number(),
  licenseNumber: z.string().max(100).optional(),      // not all specialties require it
  licenseDocument: z.string().max(500).optional(),    // identity doc URL
  yearsOfExperience: z.number().optional(),
  education: z.string().max(1000).optional(),
  certifications: z.string().max(1000).optional(),
  bio: z.string().max(1000).optional(),
  hourlyRate: z.string().max(20).optional(),
  profilePhoto: z.string().url().max(500).optional(),
  fullName: z.string().max(100).optional(),           // nombre completo del profesional
});

const userProfileUpdateSchema = z.object({
  name: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  bio: z.string().max(1000).optional(),
  profileImage: z.string().max(500).optional(),
});

export const appRouter = router({
  system: systemRouter,

  // Auth routes
  auth: router({
    me: publicProcedure.query((opts) => {
      return opts.ctx.user;
    }),
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
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Build dynamic SET clause with ? placeholders — no string escaping
        const setParts: string[] = [];
        const params: any[] = [];

        if (input.name !== undefined) { setParts.push("`name` = ?"); params.push(input.name); }
        if (input.phone !== undefined) { setParts.push("`phone` = ?"); params.push(input.phone); }
        if (input.bio !== undefined) { setParts.push("`bio` = ?"); params.push(input.bio); }
        if (input.profileImage !== undefined) { setParts.push("`profileImage` = ?"); params.push(input.profileImage); }
        setParts.push("`updatedAt` = NOW()");

        if (setParts.length > 1) {
          params.push(ctx.user.id);
          await dbInstance.execute(
            `UPDATE \`users\` SET ${setParts.join(", ")} WHERE \`id\` = ?`,
            params
          );
        }

        return await db.getUserById(ctx.user.id);
      }),

    updateUserName: protectedProcedure
      .input(z.object({ firstName: z.string().min(1).max(100), lastName: z.string().min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        const fullName = `${input.firstName.trim()} ${input.lastName.trim()}`;
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
        const client = (dbConn as any).$client;
        await new Promise<void>((resolve, reject) => {
          client.execute(
            "UPDATE users SET name = ?, updatedAt = NOW() WHERE id = ?",
            [fullName, ctx.user.id],
            (err: any) => { if (err) reject(err); else resolve(); }
          );
        });
        return { success: true, name: fullName };
      }),

    getSubscription: protectedProcedure.query(async ({ ctx }) => {
      const subscription = await db.getUserSubscription(ctx.user.id);
      if (!subscription) return null;
      const plan = await db.getSubscriptionPlanById(subscription.planId);
      return { ...subscription, planName: plan?.name ?? null };
    }),

    getAppointments: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserAppointments(ctx.user.id);
    }),
    // ── Wallet ──────────────────────────────────────────────────────────
    getWallet: protectedProcedure.query(async ({ ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const client = (dbConn as any).$client;

      const [balanceRow, batches, transactions] = await Promise.all([
        // balance + nextExpiry en una sola query
        new Promise<any>((resolve, reject) => {
          client.execute(
            `SELECT
              COALESCE(SUM(GREATEST(0, remaining - reservedAmount)), 0) AS balance,
              COALESCE(SUM(reservedAmount), 0) AS reservedCredits,
              MIN(CASE WHEN remaining > 0 AND expiresAt IS NOT NULL AND expiresAt > NOW() THEN expiresAt END) AS nextExpiry
             FROM creditBatches
             WHERE userId = ? AND remaining > 0 AND expiredEarly = 0 AND (expiresAt IS NULL OR expiresAt > NOW())`,
            [ctx.user.id],
            (err: any, results: any) => {
              if (err) reject(err);
              else resolve(Array.isArray(results) ? results[0] : (results ?? { balance: 0, nextExpiry: null }));
            }
          );
        }),
        new Promise<any[]>((resolve, reject) => {
          client.execute(
            `SELECT * FROM creditBatches WHERE userId = ? ORDER BY createdAt ASC`,
            [ctx.user.id],
            (err: any, results: any) => {
              if (err) reject(err);
              else resolve(Array.isArray(results) ? results : []);
            }
          );
        }),
        new Promise<any[]>((resolve, reject) => {
          client.execute(
            `SELECT * FROM creditTransactions WHERE userId = ? ORDER BY createdAt DESC LIMIT 50`,
            [ctx.user.id],
            (err: any, results: any) => {
              if (err) reject(err);
              else resolve(Array.isArray(results) ? results : []);
            }
          );
        }),
      ]);

      return {
        balance: Number(balanceRow?.balance ?? 0),
        reservedCredits: Number(balanceRow?.reservedCredits ?? 0),
        nextExpiry: balanceRow?.nextExpiry ?? null,
        batches,
        transactions,
      };
    }),
    buyIndividualSession: protectedProcedure
      .input(
        z.object({
          sessionType: z.enum(["individual_basic", "individual_premium"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // TODO: En producción esto debe validarse contra Stripe antes de acreditar
        if (process.env.NODE_ENV === "production") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Use Stripe checkout para comprar créditos" });
        }
        const source = input.sessionType as CreditSource;
        const batchId = await addCreditBatch(ctx.user.id, source);
        return {
          success: true,
          batchId,
          creditsAdded: CREDIT_COSTS[source],
          message: `Se agregaron ${CREDIT_COSTS[source]} créditos a tu wallet. Válidos por 60 días.`,
        };
      }),
    buyPlan: protectedProcedure
      .input(
        z.object({
          planType: z.enum(["plan_basic", "plan_pro"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // TODO: En producción esto debe validarse contra Stripe antes de acreditar
        if (process.env.NODE_ENV === "production") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Use Stripe checkout para comprar créditos" });
        }
        const source = input.planType as CreditSource;
        const batchId = await addCreditBatch(ctx.user.id, source);
        return {
          success: true,
          batchId,
          creditsAdded: CREDIT_COSTS[source],
          message: `Se agregaron ${CREDIT_COSTS[source]} créditos a tu wallet. Válidos por 60 días.`,
        };
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
          // Permitir re-registro solo si fue rechazado (eliminar el registro anterior)
          if (existing.status === "rejected") {
            const dbInst = await db.getDb();
            if (dbInst) {
              await dbInst.execute(
                `DELETE FROM \`professionals\` WHERE \`userId\` = ${Number(ctx.user.id)}`
              );
            }
          } else {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "User already registered as professional",
            });
          }
        }

        // Generate unique placeholder when no cédula required for this specialty
        const licenseNum =
          (input.licenseNumber ?? "").trim() ||
          `NOLIC_${ctx.user.id}_${Date.now()}`;

        // Create professional profile
        await db.createProfessional(
          ctx.user.id,
          input.specialtyId,
          licenseNum,
          {
            yearsOfExperience: input.yearsOfExperience,
            education: input.education,
            certifications: input.certifications,
            bio: input.bio,
            hourlyRate: input.hourlyRate ? input.hourlyRate : undefined,
            profilePhoto: input.profilePhoto ?? null,
            licenseDocument: input.licenseDocument ?? null,
          }
        );

        // Actualizar el rol del usuario a 'pending_professional' y guardar el nombre
        // Nota: el rol se cambia a 'professional' solo cuando el admin aprueba
        const dbInst2 = await db.getDb();
        if (dbInst2) {
          // Guardar siempre el nombre que el profesional ingresó en el formulario
          if (input.fullName?.trim()) {
            const safeName = input.fullName.trim().replace(/'/g, "''");
            await dbInst2.execute(
              `UPDATE \`users\` SET \`name\` = '${safeName}' WHERE \`id\` = ${Number(ctx.user.id)}`
            );
          }
        }

        // Notificar al admin principal por email + notificación in-app (fire and forget)
        setImmediate(async () => {
          try {
            const user = await db.getUserById(ctx.user.id);
            const admins = await db.getAdminUsers();
            const adminEmail = process.env.ADMIN_EMAIL ?? "marketingdedsm@gmail.com";
            const targets = admins.length > 0
              ? admins.map((a) => a.email).filter(Boolean)
              : [adminEmail];
            for (const email of targets) {
              await sendAdminNewProfessionalRequest({
                adminEmail: email,
                professionalName: user?.name ?? "Usuario desconocido",
                professionalEmail: user?.email ?? "",
              });
            }
            for (const admin of admins) {
              await createNotification({
                userId: admin.id,
                type: "info",
                title: "Nueva solicitud de profesional",
                message: `${user?.name ?? "Un usuario"} ha enviado una solicitud para ser profesional.`,
                link: "/admin?tab=professionals",
                audience: "user",
              });
            }
          } catch (err: any) {
            console.error("[Register] Error enviando notificaciones al admin:", err?.message);
          }
        });

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
        // Solo mostrar profesionales aprobados en el perfil público
        if (professional.status !== "approved") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Professional not available",
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
        console.error("[DIAG setAvailability] called, ctx.user:", ctx.user?.id, ctx.user?.role);
        if (ctx.user.role !== "professional") {
          throw new TRPCError({ code: "FORBIDDEN", message: "User is not a professional" });
        }
        const professional = await db.getProfessionalByUserId(ctx.user.id);
        if (!professional) throw new TRPCError({ code: "NOT_FOUND", message: "Professional profile not found" });

        await db.createProfessionalAvailability({
          professionalId: professional.id,
          dayOfWeek: input.dayOfWeek,
          startTime: input.startTime,
          endTime: input.endTime,
          isAvailable: input.isAvailable,
        });
        return { success: true };
      }),

    removeAvailability: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "professional") {
          throw new TRPCError({ code: "FORBIDDEN", message: "User is not a professional" });
        }
        const professional = await db.getProfessionalByUserId(ctx.user.id);
        if (!professional) throw new TRPCError({ code: "NOT_FOUND", message: "Professional profile not found" });
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const client = (dbInstance as any).$client;
        await new Promise<void>((resolve, reject) => {
          client.execute(
            "DELETE FROM professionalAvailability WHERE id = ? AND professionalId = ?",
            [input.id, professional.id],
            (err: any) => { if (err) reject(err); else resolve(); }
          );
        });
        return { success: true };
      }),

    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().max(100).optional(),           // nombre del usuario (actualiza users.name)
        bio: z.string().max(1000).optional(),
        education: z.string().max(1000).optional(),
        certifications: z.string().max(1000).optional(),
        yearsOfExperience: z.number().optional(),
        languages: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "professional") {
          throw new TRPCError({ code: "FORBIDDEN", message: "User is not a professional" });
        }
        const professional = await db.getProfessionalByUserId(ctx.user.id);
        if (!professional) throw new TRPCError({ code: "NOT_FOUND", message: "Professional profile not found" });

        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Build dynamic SET clause with ? placeholders — no string escaping
        const setParts: string[] = [];
        const params: any[] = [];

        if (input.bio !== undefined) { setParts.push("`bio` = ?"); params.push(input.bio); }
        if (input.education !== undefined) { setParts.push("`education` = ?"); params.push(input.education); }
        if (input.certifications !== undefined) { setParts.push("`certifications` = ?"); params.push(input.certifications); }
        if (input.yearsOfExperience !== undefined) { setParts.push("`yearsOfExperience` = ?"); params.push(Number(input.yearsOfExperience)); }
        setParts.push("`updatedAt` = NOW()");

        if (setParts.length > 1) {
          await dbInstance.execute(
            `UPDATE \`professionals\` SET ${setParts.join(", ")} WHERE \`id\` = ?`,
            [...params, professional.id]
          );
        }

        // Actualizar nombre del usuario si fue provisto
        if (input.name !== undefined && input.name.trim()) {
          try {
            await dbInstance.execute(
              "UPDATE `users` SET `name` = ?, `updatedAt` = NOW() WHERE `id` = ?",
              [input.name.trim(), ctx.user.id]
            );
          } catch {
            // silently ignore
          }
        }

        // Try to update languages separately (column may not exist yet)
        if (input.languages !== undefined) {
          try {
            await dbInstance.execute(
              "UPDATE `professionals` SET `languages` = ? WHERE `id` = ?",
              [input.languages, professional.id]
            );
          } catch {
            // Column doesn't exist yet in DB — silently ignore
          }
        }

        return { success: true };
      }),

    getFeatured: publicProcedure
      .input(z.object({ limit: z.number().optional().default(6) }))
      .query(async ({ input }) => {
        return await db.getFeaturedProfessionals(input.limit);
      }),

    getPublicProfile: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const professional = await db.getProfessionalById(input.id);
        if (!professional) throw new TRPCError({ code: "NOT_FOUND", message: "Professional not found" });
        const user = await db.getUserById(professional.userId);
        const reviews = await db.getProfessionalReviews(professional.id);
        const avgRating = reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;
        return { ...professional, user, reviews, avgRating };
      }),

    updatePhoto: protectedProcedure
      .input(z.object({ photoUrl: z.string().url() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "professional") {
          throw new TRPCError({ code: "FORBIDDEN", message: "User is not a professional" });
        }
        const professional = await db.getProfessionalByUserId(ctx.user.id);
        if (!professional) throw new TRPCError({ code: "NOT_FOUND", message: "Professional profile not found" });
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { professionals } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await dbInstance.update(professionals).set({
          profilePhoto: input.photoUrl,
          updatedAt: new Date(),
        }).where(eq(professionals.id, professional.id));
        return { success: true };
      }),

    getBlockedDays: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "professional") {
        throw new TRPCError({ code: "FORBIDDEN", message: "User is not a professional" });
      }
      const professional = await db.getProfessionalByUserId(ctx.user.id);
      if (!professional) throw new TRPCError({ code: "NOT_FOUND", message: "Professional profile not found" });
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { blockedDays } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      return await dbInstance.select().from(blockedDays).where(eq(blockedDays.professionalId, professional.id));
    }),

    addBlockedDay: protectedProcedure
      .input(z.object({
        blockedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato debe ser YYYY-MM-DD"),
        reason: z.string().max(255).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "professional") {
          throw new TRPCError({ code: "FORBIDDEN", message: "User is not a professional" });
        }
        const professional = await db.getProfessionalByUserId(ctx.user.id);
        if (!professional) throw new TRPCError({ code: "NOT_FOUND", message: "Professional profile not found" });
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { blockedDays } = await import("../drizzle/schema");
        await dbInstance.insert(blockedDays).values({
          professionalId: professional.id,
          blockedDate: input.blockedDate,
          reason: input.reason ?? null,
        });
        return { success: true };
      }),

    removeBlockedDay: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "professional") {
          throw new TRPCError({ code: "FORBIDDEN", message: "User is not a professional" });
        }
        const professional = await db.getProfessionalByUserId(ctx.user.id);
        if (!professional) throw new TRPCError({ code: "NOT_FOUND", message: "Professional profile not found" });
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { blockedDays } = await import("../drizzle/schema");
        const { and, eq } = await import("drizzle-orm");
        await dbInstance.delete(blockedDays).where(
          and(
            eq(blockedDays.id, input.id),
            eq(blockedDays.professionalId, professional.id)
          )
        );
        return { success: true };
      }),

    getWallet: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "professional") {
        throw new TRPCError({ code: "FORBIDDEN", message: "User is not a professional" });
      }
      const professional = await db.getProfessionalByUserId(ctx.user.id);
      if (!professional) throw new TRPCError({ code: "NOT_FOUND", message: "Professional profile not found" });

      const { getProfessionalWallet, getProfessionalEarningsHistory, getProfessionalWithdrawals } = await import("./professionalWallet");
      const [wallet, earnings, withdrawals] = await Promise.all([
        getProfessionalWallet(professional.id),
        getProfessionalEarningsHistory(professional.id),
        getProfessionalWithdrawals(professional.id),
      ]);
      return { wallet, earnings, withdrawals };
    }),

    getEarningsHistory: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "professional") {
        throw new TRPCError({ code: "FORBIDDEN", message: "User is not a professional" });
      }
      const professional = await db.getProfessionalByUserId(ctx.user.id);
      if (!professional) throw new TRPCError({ code: "NOT_FOUND", message: "Professional profile not found" });
      const { getProfessionalEarningsHistory } = await import("./professionalWallet");
      return await getProfessionalEarningsHistory(professional.id);
    }),

    requestWithdrawal: protectedProcedure
      .input(z.object({
        amount: z.number().positive(),
        paymentMethod: z.enum(["clabe", "binance", "paypal", "other"]),
        paymentDetails: z.string().max(1000),
        notes: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "professional") {
          throw new TRPCError({ code: "FORBIDDEN", message: "User is not a professional" });
        }
        const professional = await db.getProfessionalByUserId(ctx.user.id);
        if (!professional) throw new TRPCError({ code: "NOT_FOUND", message: "Professional profile not found" });

        const { getProfessionalWallet, createWithdrawalRequest, getProfessionalWithdrawals } = await import("./professionalWallet");
        const wallet = await getProfessionalWallet(professional.id);
        const balance = parseFloat(wallet?.balance ?? "0");

        if (input.amount < 1000) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "El retiro mínimo es de $1,000 MXN" });
        }
        if (input.amount > balance) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Saldo insuficiente. Disponible: $${balance.toFixed(2)} MXN` });
        }

        // Block if there's already a pending withdrawal
        const existing = await getProfessionalWithdrawals(professional.id);
        const hasPending = existing.some((w: any) => w.status === "pending");
        if (hasPending) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Ya tienes una solicitud de retiro pendiente" });
        }

        const clabe = input.paymentMethod === "clabe" ? input.paymentDetails : null;
        await createWithdrawalRequest(professional.id, input.amount, clabe, input.paymentMethod, input.paymentDetails, input.notes);

        // Notification to professional
        createNotification({
          userId: ctx.user.id,
          type: "withdrawal_requested",
          title: "💸 Solicitud de retiro enviada",
          message: `Tu solicitud de retiro por $${input.amount} MXN fue recibida. Se procesa los lunes.`,
          link: "/panel-profesional#ganancias",
          audience: "professional",
        }).catch(() => {});

        // Notification to admin(s)
        const profUser = await db.getUserById(professional.userId);
        const admins = await db.getAdminUsers();
        for (const admin of admins) {
          createNotification({
            userId: admin.id,
            type: "withdrawal_requested",
            title: "💸 Nueva solicitud de retiro",
            message: `${profUser?.name ?? "Un profesional"} solicitó un retiro de $${input.amount.toLocaleString("es-MX")} MXN.`,
            link: "/admin#retiros",
            audience: "user",
          }).catch(() => {});
        }

        // Emails (fire-and-forget)
        const { sendWithdrawalRequestEmail, sendWithdrawalReceivedEmail } = await import("./email");
        const profEmail = profUser?.email ?? "";
        const profName = profUser?.name ?? "Profesional";

        // Email to admin
        if (profEmail) {
          sendWithdrawalRequestEmail({
            adminEmail: process.env.ADMIN_EMAIL ?? "Adm@inteira.mx",
            professionalName: profName,
            professionalEmail: profEmail,
            amount: input.amount,
            paymentMethod: input.paymentMethod,
            paymentDetails: input.paymentDetails,
            notes: input.notes,
          })
            .then((ok) => console.log(`[Withdrawal] Admin email ${ok ? "sent" : "failed (Resend returned false)"}`))
            .catch((err) => console.error("[Withdrawal] Admin email error:", err?.message));

          // Confirmation email to professional
          sendWithdrawalReceivedEmail({
            professionalEmail: profEmail,
            professionalName: profName,
            amount: input.amount,
            paymentMethod: input.paymentMethod,
            paymentDetails: input.paymentDetails,
          })
            .then((ok) => console.log(`[Withdrawal] Professional confirmation email ${ok ? "sent to " + profEmail : "failed (Resend returned false)"}`))
            .catch((err) => console.error("[Withdrawal] Professional email error:", err?.message));
        } else {
          console.warn("[Withdrawal] No professional email found — skipping emails for professionalId:", professional.id);
        }

        return {
          success: true,
          message: `Solicitud de $${input.amount.toLocaleString("es-MX")} MXN enviada. Se procesa los lunes.`,
        };
      }),

    getMyReviews: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "professional") {
        throw new TRPCError({ code: "FORBIDDEN", message: "User is not a professional" });
      }
      const professional = await db.getProfessionalByUserId(ctx.user.id);
      if (!professional) throw new TRPCError({ code: "NOT_FOUND", message: "Professional profile not found" });
      const reviews = await db.getProfessionalReviews(professional.id);
      // Enrich with user name
      const enriched = await Promise.all(
        reviews.map(async (r) => {
          const user = await db.getUserById(r.userId);
          return { ...r, userName: user?.name ?? "Usuario" };
        })
      );
      return enriched;
    }),
  }),

  // Review routes
  review: router({
    create: protectedProcedure
      .input(z.object({
        professionalId: z.number(),
        appointmentId: z.number().optional(),
        rating: z.number().min(1).max(5),
        comment: z.string().max(2000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
        const client = (dbConn as any).$client;

        // Si viene appointmentId, verificar que pertenece al usuario y está en estado válido
        if (input.appointmentId) {
          const apt = await db.getAppointmentById(input.appointmentId);
          if (!apt || apt.userId !== ctx.user.id) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Cita no válida" });
          }
          if (!["completed", "pending_review", "no-show"].includes(apt.status)) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Solo puedes reseñar citas completadas" });
          }
        }

        // Limitar a 1 reseña por profesional por usuario
        const existingReview = await new Promise<any[]>((resolve) => {
          client.execute(
            "SELECT id FROM reviews WHERE userId = ? AND professionalId = ? LIMIT 1",
            [ctx.user.id, input.professionalId],
            (err: any, results: any) => resolve(Array.isArray(results) ? results : [])
          );
        });
        if (existingReview.length > 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Ya dejaste una reseña para este profesional" });
        }

        // Verificar si ya existe un review del mismo usuario para esta cita o profesional
        const duplicateCheck = await new Promise<any[]>((resolve) => {
          const [sql, params] = input.appointmentId
            ? [
                "SELECT id FROM reviews WHERE userId = ? AND appointmentId = ? LIMIT 1",
                [ctx.user.id, input.appointmentId],
              ]
            : [
                "SELECT id FROM reviews WHERE userId = ? AND professionalId = ? LIMIT 1",
                [ctx.user.id, input.professionalId],
              ];
          client.execute(sql, params, (err: any, results: any) => {
            if (err) { console.error("[review.create] duplicate check:", err?.message); resolve([]); }
            else resolve(Array.isArray(results) ? results : []);
          });
        });

        if (duplicateCheck.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: input.appointmentId
              ? "Ya has calificado esta cita anteriormente"
              : "Ya has calificado a este profesional anteriormente",
          });
        }

        // INSERT review
        await new Promise<void>((resolve, reject) => {
          client.execute(
            `INSERT INTO reviews (appointmentId, userId, professionalId, rating, comment, isVerified)
             VALUES (?, ?, ?, ?, ?, false)`,
            [
              input.appointmentId ?? null,
              ctx.user.id,
              input.professionalId,
              input.rating,
              input.comment ?? null,
            ],
            (err: any) => {
              if (err && !String(err).includes("Duplicate")) reject(err);
              else resolve();
            }
          );
        });

        // UPDATE professional averageRating + totalReviews
        await new Promise<void>((resolve) => {
          client.execute(
            `UPDATE professionals
             SET averageRating = (SELECT AVG(rating) FROM reviews WHERE professionalId = ?),
                 totalReviews  = (SELECT COUNT(*) FROM reviews WHERE professionalId = ?),
                 updatedAt = NOW()
             WHERE id = ?`,
            [input.professionalId, input.professionalId, input.professionalId],
            (err: any) => { if (err) console.error("[review.create] avg update:", err?.message); resolve(); }
          );
        });

        return { success: true };
      }),

    getByProfessional: publicProcedure
      .input(z.object({ professionalId: z.number() }))
      .query(async ({ input }) => {
        return await db.getProfessionalReviews(input.professionalId);
      }),
  }),

  // Admin routes
  admin: router({
    getMetrics: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "User is not an admin" });
      }
      return await db.getAdminMetrics();
    }),
    getAppointmentsByDay: protectedProcedure
      .input(z.object({ days: z.number().optional().default(30) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "User is not an admin" });
        }
        return await db.getAppointmentsByDay(input.days);
      }),
    getRecentAppointments: protectedProcedure
      .input(z.object({ limit: z.number().optional().default(10) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "User is not an admin" });
        }
        return await db.getRecentAppointments(input.limit);
      }),
    getTopProfessionals: protectedProcedure
      .input(z.object({ limit: z.number().optional().default(5) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "User is not an admin" });
        }
        return await db.getTopProfessionals(input.limit);
      }),

    // ── Cron Jobs ─────────────────────────────────────────────────────────
    runCronJobs: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "User is not an admin" });
      }
      const expiredBatches = await expireTimedOutBatches();
      return {
        success: true,
        expiredBatches,
        message: `Cron ejecutado correctamente. Lotes expirados: ${expiredBatches}.`,
        executedAt: new Date().toISOString(),
      };
    }),

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
      .input(z.object({
        professionalId: z.number(),
        tier: z.enum(["basic", "pro"]).default("basic"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "User is not an admin",
          });
        }

        // Fetch data needed for email before approving
        const professional = await db.getProfessionalById(input.professionalId);
        if (!professional) throw new TRPCError({ code: "NOT_FOUND", message: "Professional not found" });

        const user = await db.getUserById(professional.userId);
        const specialty = professional.specialtyId
          ? await db.getSpecialtyById(professional.specialtyId)
          : null;

        await db.approveProfessional(input.professionalId, ctx.user.id, input.tier);

        // Send approval email (fire and forget)
        if (user?.email) {
          sendProfessionalApproval({
            professionalEmail: user.email,
            professionalName: user.name ?? "Profesional",
            specialty: specialty?.name ?? "—",
            approved: true,
          }).catch(() => {});
        }

        // Notificación in-app al profesional aprobado
        createNotification({
          userId: professional.userId,
          type: "professional_approved",
          title: "¡Solicitud aprobada!",
          message: "Tu solicitud para ser profesional en Inteira fue aprobada. Ya puedes recibir citas.",
          link: "/dashboard",
          audience: "professional",
        }).catch(() => {});

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

        const professional = await db.getProfessionalById(input.professionalId);
        if (!professional) throw new TRPCError({ code: "NOT_FOUND", message: "Professional not found" });
        const user = await db.getUserById(professional.userId);
        await db.rejectProfessional(input.professionalId, input.reason);
        // Enviar email de rechazo al profesional
        if (user?.email) {
          sendProfessionalApproval({
            professionalEmail: user.email,
            professionalName: user.name ?? "Profesional",
            specialty: "",
            approved: false,
          }).catch(() => {});
        }
        // Notificación in-app al profesional rechazado
        createNotification({
          userId: professional.userId,
          type: "professional_rejected",
          title: "Solicitud no aprobada",
          message: input.reason ?? "Tu solicitud no fue aprobada en esta ocasión.",
          link: "/panel-profesional",
          audience: "professional",
        }).catch(() => {});
         return { success: true };
      }),

    // Sincroniza el rol de todos los profesionales aprobados que aún tienen role='user'
    syncProfessionalRoles: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can sync roles" });
      }
      const dbInst = await db.getDb();
      if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Update all users who have an approved professional profile but still have role='user'
      await dbInst.execute(
        `UPDATE \`users\` u
         INNER JOIN \`professionals\` p ON p.userId = u.id
         SET u.role = 'professional'
         WHERE p.status = 'approved' AND u.role = 'user'`
      );
      return { success: true };
    }),

    getProfessionalsBySpecialty: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "User is not an admin" });
      }
      const dbInst = await db.getDb();
      if (!dbInst) return [];
      const rows = await new Promise<{ name: string; count: number }[]>((resolve) => {
        (dbInst as any).$client.execute(
          `SELECT s.name, COUNT(p.id) as count
           FROM specialties s
           LEFT JOIN professionals p ON p.specialtyId = s.id AND p.status = 'approved'
           GROUP BY s.id, s.name`,
          [],
          (err: any, results: any) => {
            if (err) { console.error("[admin] getProfessionalsBySpecialty:", err?.message); resolve([]); }
            else resolve(Array.isArray(results) ? results : []);
          }
        );
      });
      return rows.map((r) => ({
        name: r.name,
        count: Number(r.count),
      }));
    }),

    getPendingWithdrawals: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const dbInst = await db.getDb();
      if (!dbInst) return [];
      const client = (dbInst as any).$client;
      return new Promise<any[]>((resolve) => {
        client.execute(
          `SELECT wr.*, u.name as professionalName, u.email as professionalEmail
           FROM withdrawalRequests wr
           JOIN professionals p ON p.id = wr.professionalId
           JOIN users u ON u.id = p.userId
           ORDER BY wr.createdAt DESC
           LIMIT 100`,
          [],
          (err: any, results: any) => {
            if (err) { console.error("[admin] getPendingWithdrawals:", err?.message); resolve([]); }
            else resolve(Array.isArray(results) ? results : []);
          }
        );
      });
    }),

    approveWithdrawal: protectedProcedure
      .input(z.object({
        withdrawalId: z.number(),
        attachmentBase64: z.string().optional(),
        attachmentName: z.string().max(255).optional(),
        attachmentMimeType: z.string().max(100).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });

        console.log("[Withdrawal:approve] START withdrawalId:", input.withdrawalId,
          "| attachmentName:", input.attachmentName ?? "(none)",
          "| attachmentMimeType:", input.attachmentMimeType ?? "(none)",
          "| attachmentBase64 length:", input.attachmentBase64?.length ?? 0);

        let professionalId: number;
        let amount: number;
        try {
          const { approveWithdrawalRequest } = await import("./professionalWallet");
          ({ professionalId, amount } = await approveWithdrawalRequest(input.withdrawalId));
          console.log("[Withdrawal:approve] DB updated — professionalId:", professionalId, "amount:", amount);
        } catch (err: any) {
          console.error("[Withdrawal:approve] approveWithdrawalRequest FAILED:", err?.message, err?.stack);
          throw err;
        }

        // Look up professional user for notification/email
        const dbInst = await db.getDb();
        const profRow = await new Promise<any>((resolve) => {
          (dbInst as any).$client.execute(
            "SELECT p.userId, u.name, u.email FROM professionals p JOIN users u ON u.id = p.userId WHERE p.id = ? LIMIT 1",
            [professionalId],
            (err: any, results: any) => {
              if (err) console.error("[Withdrawal:approve] profRow query error:", err?.message);
              resolve(Array.isArray(results) ? results[0] ?? null : null);
            }
          );
        });
        console.log("[Withdrawal:approve] profRow:", profRow ? `name=${profRow.name} email=${profRow.email}` : "null");

        // Get withdrawal details from the request itself
        const wrRow = await new Promise<any>((resolve) => {
          (dbInst as any).$client.execute(
            "SELECT paymentMethod, paymentDetails, amount FROM withdrawalRequests WHERE id = ? LIMIT 1",
            [input.withdrawalId],
            (err: any, results: any) => {
              if (err) console.error("[Withdrawal:approve] wrRow query error:", err?.message);
              resolve(Array.isArray(results) ? results[0] ?? null : null);
            }
          );
        });
        console.log("[Withdrawal:approve] wrRow paymentMethod:", wrRow?.paymentMethod ?? "(null)");

        if (profRow?.userId) {
          createNotification({
            userId: profRow.userId,
            type: "new_earning",
            title: "💸 Retiro procesado",
            message: `Tu retiro de $${amount.toLocaleString("es-MX")} MXN fue procesado exitosamente.`,
            link: "/panel-profesional#ganancias",
            audience: "professional",
          }).catch(() => {});
        }

        const { sendWithdrawalPaidEmail } = await import("./email");
        const profEmail = profRow?.email ?? "";
        const profName = profRow?.name ?? "Profesional";
        const paymentMethod = wrRow?.paymentMethod ?? "other";
        const attachment = (input.attachmentBase64 && input.attachmentName)
          ? { base64: input.attachmentBase64, name: input.attachmentName, mimeType: input.attachmentMimeType ?? "application/octet-stream" }
          : undefined;

        console.log("[Withdrawal:approve] Pre-email check — profEmail:", profEmail || "(empty)",
          "| attachment:", attachment ? `${attachment.name} (${attachment.mimeType}, ${attachment.base64.length} base64 chars)` : "(none)");

        if (profEmail) {
          // Email to professional (with attachment if provided)
          sendWithdrawalPaidEmail({
            professionalEmail: profEmail,
            professionalName: profName,
            amount,
            paymentMethod,
            attachment,
          })
            .then((ok) => console.log(`[Withdrawal:approve] Professional email ${ok ? "SENT to " + profEmail : "FAILED — Resend returned false"}`))
            .catch((err) => console.error("[Withdrawal:approve] Professional email THREW:", err));

          // Confirmation email to admin (with attachment as well)
          const adminEmail = process.env.ADMIN_EMAIL ?? "Adm@inteira.mx";
          sendWithdrawalPaidEmail({
            professionalEmail: adminEmail,
            professionalName: `Admin — pago procesado a ${profName}`,
            amount,
            paymentMethod,
            attachment,
          })
            .then((ok) => console.log(`[Withdrawal:approve] Admin email ${ok ? "SENT to " + adminEmail : "FAILED — Resend returned false"}`))
            .catch((err) => console.error("[Withdrawal:approve] Admin email THREW:", err));
        } else {
          console.warn("[Withdrawal:approve] profEmail is empty for professionalId:", professionalId, "— SKIPPING all emails");
        }

        console.log("[Withdrawal:approve] END — returning success");
        return { success: true };
      }),

    rejectWithdrawal: protectedProcedure
      .input(z.object({ withdrawalId: z.number(), adminNote: z.string().max(500).optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { rejectWithdrawalRequest } = await import("./professionalWallet");
        const { professionalId, amount } = await rejectWithdrawalRequest(input.withdrawalId, input.adminNote);

        // Look up professional user for notification/email
        const dbInst = await db.getDb();
        const profRow = await new Promise<any>((resolve) => {
          (dbInst as any).$client.execute(
            "SELECT p.userId, u.name, u.email FROM professionals p JOIN users u ON u.id = p.userId WHERE p.id = ? LIMIT 1",
            [professionalId],
            (err: any, results: any) => resolve(Array.isArray(results) ? results[0] ?? null : null)
          );
        });

        if (profRow?.userId) {
          createNotification({
            userId: profRow.userId,
            type: "system",
            title: "Solicitud de retiro rechazada",
            message: `Tu solicitud de retiro de $${amount.toLocaleString("es-MX")} MXN no fue procesada.${input.adminNote ? ` Motivo: ${input.adminNote}` : ""}`,
            link: "/panel-profesional#ganancias",
            audience: "professional",
          }).catch(() => {});

          if (profRow.email) {
            const { sendWithdrawalRejectedEmail } = await import("./email");
            sendWithdrawalRejectedEmail({
              professionalEmail: profRow.email,
              professionalName: profRow.name ?? "Profesional",
              amount,
              adminNote: input.adminNote,
            }).catch(() => {});
          }
        }

        return { success: true };
      }),

    getActiveProfessionals: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "User is not an admin" });
      }
      const dbInst = await db.getDb();
      if (!dbInst) return [];
      const client = (dbInst as any).$client;
      return new Promise<any[]>((resolve, reject) => {
        client.execute(
          `SELECT p.id, p.userId, p.tier, p.specialtyId, p.hourlyRate, p.bio, p.profilePhoto, p.createdAt,
            u.name as userName, u.email as userEmail,
            s.name as specialtyName
           FROM professionals p
           LEFT JOIN users u ON p.userId = u.id
           LEFT JOIN specialties s ON p.specialtyId = s.id
           WHERE p.status = ?
           ORDER BY u.name ASC`,
          ['approved'],
          (err: any, results: any) => {
            if (err) reject(err);
            else resolve(Array.isArray(results) ? results : []);
          }
        );
      });
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

    // ── Recover a Stripe payment that was not credited (e.g. webhook missed) ──
    recoverStripePayment: protectedProcedure
      .input(
        z.object({
          stripeSessionId: z.string(),
          userId: z.number(),
          productType: z.enum(["individual_basic", "individual_premium", "plan_basic", "plan_pro"]),
          amountMxn: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins" });
        }
        // Idempotency check — don't double-credit
        const existing = await db.getPaymentByStripeId(input.stripeSessionId);
        if (existing) {
          return { success: false, message: "Este pago ya fue procesado anteriormente" };
        }
        // Record the payment
        await db.recordStripePayment({
          userId: input.userId,
          stripePaymentId: input.stripeSessionId,
          amount: String(input.amountMxn),
          currency: "MXN",
          productType: input.productType,
        });
        // Credit the user
        const batchId = await addCreditBatch(input.userId, input.productType as CreditSource);
        const credits = CREDIT_COSTS[input.productType as CreditSource];
        return {
          success: true,
          batchId,
          creditsAdded: credits,
          message: `${credits} créditos acreditados al usuario ${input.userId}`,
        };
      }),
  }),

  // Notifications routes
  notifications: router({
    getAll: protectedProcedure
      .input(z.object({ audience: z.enum(["user", "professional", "all"]).default("user") }).optional())
      .query(async ({ ctx, input }) => {
        return await getUnreadNotifications(ctx.user.id, input?.audience ?? "user");
      }),

    getUnreadCount: protectedProcedure
      .input(z.object({ audience: z.enum(["user", "professional", "all"]).default("user") }).optional())
      .query(async ({ ctx, input }) => {
        const count = await getUnreadCount(ctx.user.id, input?.audience ?? "user");
        return { count };
      }),

    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllRead(ctx.user.id);
      return { success: true };
    }),

    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await markOneRead(input.id, ctx.user.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
