import { eq, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  professionals,
  specialties,
  subscriptionPlans,
  userSubscriptions,
  appointments,
  reviews,
  documents,
  emailLogs,
  payments,
  professionalAvailability,
  type Professional,
  type Specialty,
  type SubscriptionPlan,
  type UserSubscription,
  type Appointment,
  type Review,
  type Document,
  type EmailLog,
  type Payment,
  type ProfessionalAvailability,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId || !user.email) {
    throw new Error("User openId and email are required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    // Use raw SQL to avoid Drizzle including columns that may not exist in production DB yet.
    // Only use the core columns that are guaranteed to exist.
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const name = user.name ?? null;
    const lastSignedIn = user.lastSignedIn
      ? new Date(user.lastSignedIn).toISOString().slice(0, 19).replace("T", " ")
      : now;

    // Determine role: admin if owner, else default 'user'
    const role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");

    // Escape single quotes in string values
    const esc = (v: string | null) => v === null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;

    const insertSQL = [
      "INSERT INTO `users` (`openId`, `email`, `name`, `lastSignedIn`, `createdAt`, `updatedAt`)",
      `VALUES (${esc(user.openId)}, ${esc(user.email)}, ${esc(name)}, '${lastSignedIn}', '${now}', '${now}')`,
      "ON DUPLICATE KEY UPDATE",
      `\`name\` = ${esc(name)}, \`lastSignedIn\` = '${lastSignedIn}', \`updatedAt\` = '${now}'`,
    ].join(" ");

    await db.execute(insertSQL);

    // Try to update role separately (column may or may not exist)
    try {
      await db.execute(`UPDATE \`users\` SET \`role\` = '${role}' WHERE \`openId\` = ${esc(user.openId)} AND \`role\` = 'user'`);
    } catch {
      // role column may not exist yet, ignore
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Professional functions
export async function createProfessional(
  userId: number,
  specialtyId: number,
  licenseNumber: string,
  data?: Partial<Professional>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(professionals).values({
    userId,
    specialtyId,
    licenseNumber,
    status: "pending",
    ...data,
  });
}

export async function getProfessionalByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(professionals)
    .where(eq(professionals.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getProfessionalById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(professionals)
    .where(eq(professionals.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getProfessionalsBySpecialty(specialtyId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(professionals)
    .where(
      and(
        eq(professionals.specialtyId, specialtyId),
        eq(professionals.status, "approved")
      )
    );
}

export async function getPendingProfessionals() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(professionals)
    .where(eq(professionals.status, "pending"));
}

export async function approveProfessional(
  professionalId: number,
  adminId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(professionals)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(professionals.id, professionalId));
}

export async function rejectProfessional(
  professionalId: number,
  reason: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(professionals)
    .set({
      status: "rejected",
      rejectionReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(professionals.id, professionalId));
}

// Specialty functions
export async function getAllSpecialties() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(specialties);
}

export async function getSpecialtyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(specialties)
    .where(eq(specialties.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createSpecialty(data: Partial<Specialty>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(specialties).values(data as any);
}

// Subscription Plan functions
export async function getAllSubscriptionPlans() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.isActive, true));
}

export async function getSubscriptionPlanById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createSubscriptionPlan(data: Partial<SubscriptionPlan>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(subscriptionPlans).values(data as any);
}

// User Subscription functions
export async function getUserSubscription(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function createUserSubscription(
  userId: number,
  planId: number,
  stripeSubscriptionId?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1);

  return await db.insert(userSubscriptions).values({
    userId,
    planId,
    stripeSubscriptionId,
    status: "active",
    startDate,
    endDate,
  });
}

// Professional Availability functions
export async function getProfessionalAvailability(professionalId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(professionalAvailability)
    .where(eq(professionalAvailability.professionalId, professionalId));
}

export async function createProfessionalAvailability(
  data: Partial<ProfessionalAvailability>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(professionalAvailability).values(data as any);
}

// Appointment functions
export async function createAppointment(data: Partial<Appointment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(appointments).values(data as any);
}

export async function getAppointmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserAppointments(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: appointments.id,
      userId: appointments.userId,
      professionalId: appointments.professionalId,
      specialtyId: appointments.specialtyId,
      appointmentDate: appointments.appointmentDate,
      durationMinutes: appointments.durationMinutes,
      status: appointments.status,
      videoCallType: appointments.videoCallType,
      videoCallLink: appointments.videoCallLink,
      notes: appointments.notes,
      cancellationReason: appointments.cancellationReason,
      createdAt: appointments.createdAt,
      professionalName: users.name,
      professionalSpecialty: professionals.specialtyId,
    })
    .from(appointments)
    .leftJoin(professionals, eq(appointments.professionalId, professionals.id))
    .leftJoin(users, eq(professionals.userId, users.id))
    .where(eq(appointments.userId, userId));

  return rows;
}

export async function getProfessionalAppointments(professionalId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(appointments)
    .where(eq(appointments.professionalId, professionalId));
}

// Review functions
export async function createReview(data: Partial<Review>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(reviews).values(data as any);
}

export async function getProfessionalReviews(professionalId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(reviews)
    .where(eq(reviews.professionalId, professionalId));
}

// Document functions
export async function createDocument(data: Partial<Document>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(documents).values(data as any);
}

export async function getUserDocuments(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(documents).where(eq(documents.userId, userId));
}

// Email Log functions
export async function createEmailLog(data: Partial<EmailLog>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(emailLogs).values(data as any);
}

// Payment functions
export async function getPaymentByStripeId(stripePaymentId: string) {
  const db = await getDb();
  if (!db) return null;

  const results = await db
    .select()
    .from(payments)
    .where(eq(payments.stripePaymentId, stripePaymentId))
    .limit(1);
  return results[0] ?? null;
}

export async function recordStripePayment(data: {
  userId: number;
  stripePaymentId: string;
  amount: string;
  currency: string;
  productType: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(payments).values({
    userId: data.userId,
    stripePaymentId: data.stripePaymentId,
    amount: data.amount,
    currency: data.currency,
    status: "succeeded",
    paymentType: "subscription",
  } as any);
}

export async function createPayment(data: Partial<Payment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(payments).values(data as any);
}

export async function getUserPayments(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(payments).where(eq(payments.userId, userId));
}

// ─── Admin Metrics helpers ────────────────────────────────────────────────────
export async function getAdminMetrics() {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Total users
  const [{ totalUsers }] = await db
    .select({ totalUsers: sql<number>`COUNT(*)` })
    .from(users);

  // New users this month
  const [{ newUsersMonth }] = await db
    .select({ newUsersMonth: sql<number>`COUNT(*)` })
    .from(users)
    .where(sql`createdAt >= ${monthStart}`);

  // Active professionals (approved)
  const [{ activeProfessionals }] = await db
    .select({ activeProfessionals: sql<number>`COUNT(*)` })
    .from(professionals)
    .where(sql`approvalStatus = 'approved'`);

  // Appointments today
  const [{ appointmentsToday }] = await db
    .select({ appointmentsToday: sql<number>`COUNT(*)` })
    .from(appointments)
    .where(sql`appointmentDate >= ${todayStart} AND status != 'canceled'`);

  // Appointments this month
  const [{ appointmentsMonth }] = await db
    .select({ appointmentsMonth: sql<number>`COUNT(*)` })
    .from(appointments)
    .where(sql`appointmentDate >= ${monthStart} AND status != 'canceled'`);

  // Completed appointments this month (revenue proxy: each = avg 800 credits)
  const [{ completedMonth }] = await db
    .select({ completedMonth: sql<number>`COUNT(*)` })
    .from(appointments)
    .where(sql`appointmentDate >= ${monthStart} AND status = 'completed'`);

  // Active subscriptions
  const [{ activeSubscriptions }] = await db
    .select({ activeSubscriptions: sql<number>`COUNT(*)` })
    .from(userSubscriptions)
    .where(sql`status = 'active'`);

  return {
    totalUsers: Number(totalUsers),
    newUsersMonth: Number(newUsersMonth),
    activeProfessionals: Number(activeProfessionals),
    appointmentsToday: Number(appointmentsToday),
    appointmentsMonth: Number(appointmentsMonth),
    completedMonth: Number(completedMonth),
    activeSubscriptions: Number(activeSubscriptions),
  };
}

export async function getAppointmentsByDay(days = 30) {
  const db = await getDb();
  if (!db) return [];

  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await db
    .select({
      day: sql<string>`DATE(appointmentDate)`,
      total: sql<number>`COUNT(*)`,
      completed: sql<number>`SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)`,
      canceled: sql<number>`SUM(CASE WHEN status = 'canceled' THEN 1 ELSE 0 END)`,
    })
    .from(appointments)
    .where(sql`appointmentDate >= ${since}`)
    .groupBy(sql`DATE(appointmentDate)`)
    .orderBy(sql`DATE(appointmentDate) ASC`);

  return rows.map((r) => ({
    day: r.day,
    total: Number(r.total),
    completed: Number(r.completed),
    canceled: Number(r.canceled),
  }));
}

export async function getRecentAppointments(limit = 10) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: appointments.id,
      appointmentDate: appointments.appointmentDate,
      status: appointments.status,
      videoCallType: appointments.videoCallType,
      userId: appointments.userId,
      professionalId: appointments.professionalId,
      specialtyId: appointments.specialtyId,
    })
    .from(appointments)
    .orderBy(sql`appointmentDate DESC`)
    .limit(limit);
}

export async function getTopProfessionals(limit = 5) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      professionalId: reviews.professionalId,
      avgRating: sql<number>`AVG(rating)`,
      totalReviews: sql<number>`COUNT(*)`,
      name: users.name,
    })
    .from(reviews)
    .innerJoin(professionals, eq(professionals.id, reviews.professionalId))
    .innerJoin(users, eq(users.id, professionals.userId))
    .groupBy(reviews.professionalId, users.name)
    .orderBy(sql`AVG(rating) DESC`)
    .limit(limit);

  return rows.map((r) => ({
    professionalId: r.professionalId,
    name: r.name,
    avgRating: Number(r.avgRating).toFixed(1),
    totalReviews: Number(r.totalReviews),
  }));
}
