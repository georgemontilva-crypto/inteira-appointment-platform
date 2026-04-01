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
  licenseNumber: z.string().optional(),      // not all specialties require it
  licenseDocument: z.string().optional(),    // identity doc URL
  yearsOfExperience: z.number().optional(),
  education: z.string().optional(),
  certifications: z.string().optional(),
  bio: z.string().optional(),
  hourlyRate: z.string().optional(),
  profilePhoto: z.string().url().optional(),
  fullName: z.string().optional(),           // nombre completo del profesional
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

        // Build dynamic SQL using safe string escaping (no callbacks)
        const esc = (v: any) => v === null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;
        const setParts: string[] = [];

        if (input.name !== undefined) { setParts.push(`\`name\` = ${esc(input.name)}`); }
        if (input.phone !== undefined) { setParts.push(`\`phone\` = ${esc(input.phone)}`); }
        if (input.bio !== undefined) { setParts.push(`\`bio\` = ${esc(input.bio)}`); }
        if (input.profileImage !== undefined) { setParts.push(`\`profileImage\` = ${esc(input.profileImage)}`); }
        setParts.push("`updatedAt` = NOW()");

        if (setParts.length > 1) {
          await dbInstance.execute(
            `UPDATE \`users\` SET ${setParts.join(", ")} WHERE \`id\` = ${Number(ctx.user.id)}`
          );
        }

        return await db.getUserById(ctx.user.id);
      }),

    updateUserName: protectedProcedure
      .input(z.object({ firstName: z.string().min(1), lastName: z.string().min(1) }))
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
              MIN(CASE WHEN remaining > 0 AND expiresAt IS NOT NULL AND expiresAt > NOW() THEN expiresAt END) AS nextExpiry
             FROM creditBatches
             WHERE userId = ? AND expiredEarly = 0 AND (expiresAt IS NULL OR expiresAt > NOW())`,
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
        // Stripe will handle actual payment; for now we simulate a successful purchase
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
        name: z.string().optional(),           // nombre del usuario (actualiza users.name)
        bio: z.string().optional(),
        education: z.string().optional(),
        certifications: z.string().optional(),
        yearsOfExperience: z.number().optional(),
        languages: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "professional") {
          throw new TRPCError({ code: "FORBIDDEN", message: "User is not a professional" });
        }
        const professional = await db.getProfessionalByUserId(ctx.user.id);
        if (!professional) throw new TRPCError({ code: "NOT_FOUND", message: "Professional profile not found" });

        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Use raw SQL with safe string escaping (no callbacks, no placeholders)
        const esc = (v: any) => v === null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;
        const setParts: string[] = [];

        if (input.bio !== undefined) { setParts.push(`\`bio\` = ${esc(input.bio)}`); }
        if (input.education !== undefined) { setParts.push(`\`education\` = ${esc(input.education)}`); }
        if (input.certifications !== undefined) { setParts.push(`\`certifications\` = ${esc(input.certifications)}`); }
        if (input.yearsOfExperience !== undefined) { setParts.push(`\`yearsOfExperience\` = ${Number(input.yearsOfExperience)}`); }
        setParts.push("`updatedAt` = NOW()");

        if (setParts.length > 1) {
          await dbInstance.execute(
            `UPDATE \`professionals\` SET ${setParts.join(", ")} WHERE \`id\` = ${Number(professional.id)}`
          );
        }

        // Actualizar nombre del usuario si fue provisto
        if (input.name !== undefined && input.name.trim()) {
          try {
            await dbInstance.execute(
              `UPDATE \`users\` SET \`name\` = ${esc(input.name.trim())} WHERE \`id\` = ${Number(ctx.user.id)}`
            );
          } catch {
            // silently ignore
          }
        }

        // Try to update languages separately (column may not exist yet)
        if (input.languages !== undefined) {
          try {
            await dbInstance.execute(
              `UPDATE \`professionals\` SET \`languages\` = ${esc(input.languages)} WHERE \`id\` = ${Number(professional.id)}`
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
        reason: z.string().optional(),
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
        clabe: z.string().length(18).regex(/^\d{18}$/, "CLABE debe tener 18 dígitos numéricos"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "professional") {
          throw new TRPCError({ code: "FORBIDDEN", message: "User is not a professional" });
        }
        const professional = await db.getProfessionalByUserId(ctx.user.id);
        if (!professional) throw new TRPCError({ code: "NOT_FOUND", message: "Professional profile not found" });

        const { getProfessionalWallet, createWithdrawalRequest } = await import("./professionalWallet");
        const wallet = await getProfessionalWallet(professional.id);
        const balance = parseFloat(wallet?.balance ?? "0");

        if (input.amount < 500) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "El retiro mínimo es de $500 MXN",
          });
        }
        if (input.amount > balance) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Saldo insuficiente. Disponible: $${balance.toFixed(2)} MXN`,
          });
        }

        await createWithdrawalRequest(professional.id, input.amount, input.clabe);
        return {
          success: true,
          message: `Solicitud de $${input.amount} MXN enviada. Se procesa en 1–3 días hábiles.`,
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
        comment: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
        const client = (dbConn as any).$client;

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
    getAll: protectedProcedure.query(async ({ ctx }) => {
      return await getUnreadNotifications(ctx.user.id);
    }),

    getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
      const count = await getUnreadCount(ctx.user.id);
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
