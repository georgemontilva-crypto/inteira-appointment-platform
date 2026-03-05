import { eq, and } from "drizzle-orm";
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
    const values: InsertUser = {
      openId: user.openId,
      email: user.email,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
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
  if (!db) return undefined;

  const result = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
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

  return await db
    .select()
    .from(appointments)
    .where(eq(appointments.userId, userId));
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
