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

// Cache of existing columns in users table (populated on first upsert)
let _usersColumns: Set<string> | null = null;

async function getUsersColumns(db: ReturnType<typeof drizzle>): Promise<Set<string>> {
  if (_usersColumns) return _usersColumns;
  try {
    const [rows] = await db.execute("DESCRIBE `users`") as any;
    const cols = Array.isArray(rows) ? rows : [rows];
    _usersColumns = new Set(cols.map((r: any) => r.Field ?? r.field ?? Object.values(r)[0]));
  } catch {
    // Fallback: assume only the most basic columns exist
    _usersColumns = new Set(["id", "openId", "email", "name"]);
  }
  return _usersColumns;
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
    // Detect which columns actually exist in the DB to build a safe INSERT
    const cols = await getUsersColumns(db);
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const name = user.name ?? null;
    const lastSignedIn = user.lastSignedIn
      ? new Date(user.lastSignedIn).toISOString().slice(0, 19).replace("T", " ")
      : now;
    const role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");

    // Escape single quotes in string values
    const esc = (v: string | null) => v === null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;

    // Build INSERT with only columns that exist
    const insertCols: string[] = ["openId", "email"];
    const insertVals: string[] = [esc(user.openId), esc(user.email)];
    const updateParts: string[] = [];

    if (cols.has("name")) {
      insertCols.push("name"); insertVals.push(esc(name));
      updateParts.push(`\`name\` = ${esc(name)}`);
    }
    if (cols.has("lastSignedIn")) {
      insertCols.push("lastSignedIn"); insertVals.push(`'${lastSignedIn}'`);
      updateParts.push(`\`lastSignedIn\` = '${lastSignedIn}'`);
    }
    if (cols.has("createdAt")) {
      insertCols.push("createdAt"); insertVals.push(`'${now}'`);
    }
    if (cols.has("updatedAt")) {
      insertCols.push("updatedAt"); insertVals.push(`'${now}'`);
      updateParts.push(`\`updatedAt\` = '${now}'`);
    }
    if (cols.has("loginMethod") && user.loginMethod) {
      insertCols.push("loginMethod"); insertVals.push(esc(user.loginMethod ?? null));
      updateParts.push(`\`loginMethod\` = ${esc(user.loginMethod ?? null)}`);
    }
    // Support both profileImage and avatarUrl column names (schema drift)
    const profileImageVal = (user as any).profileImage ?? null;
    if (profileImageVal !== null) {
      if (cols.has("profileImage")) {
        insertCols.push("profileImage"); insertVals.push(esc(profileImageVal));
        updateParts.push(`\`profileImage\` = ${esc(profileImageVal)}`);
      }
      if (cols.has("avatarUrl")) {
        insertCols.push("avatarUrl"); insertVals.push(esc(profileImageVal));
        updateParts.push(`\`avatarUrl\` = ${esc(profileImageVal)}`);
      }
    }

    if (updateParts.length === 0) {
      updateParts.push(`\`email\` = ${esc(user.email)}`);
    }

    const insertSQL = [
      `INSERT INTO \`users\` (${insertCols.map(c => `\`${c}\``).join(", ")})`,
      `VALUES (${insertVals.join(", ")})`,
      `ON DUPLICATE KEY UPDATE ${updateParts.join(", ")}`,
    ].join(" ");

    await db.execute(insertSQL);

    // Try to update role separately (column may or may not exist)
    if (cols.has("role")) {
      try {
        await db.execute(`UPDATE \`users\` SET \`role\` = '${role}' WHERE \`openId\` = ${esc(user.openId)} AND \`role\` = 'user'`);
      } catch {
        // ignore
      }
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

  try {
    const esc = (v: string) => `'${v.replace(/'/g, "''")}'`;
    const [rows] = await db.execute(`SELECT * FROM \`users\` WHERE \`openId\` = ${esc(openId)} LIMIT 1`) as any;
    const arr = Array.isArray(rows) ? rows : [];
    return arr.length > 0 ? arr[0] : undefined;
  } catch (error) {
    console.error("[Database] getUserByOpenId error:", error);
    return undefined;
  }
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const [rows] = await db.execute(`SELECT * FROM \`users\` WHERE \`id\` = ${Number(id)} LIMIT 1`) as any;
    const arr = Array.isArray(rows) ? rows : [];
    return arr.length > 0 ? arr[0] : undefined;
  } catch (error) {
    console.error("[Database] getUserById error:", error);
    return undefined;
  }
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const esc = (v: string) => `'${v.replace(/'/g, "''")}'`;
    const [rows] = await db.execute(`SELECT * FROM \`users\` WHERE \`email\` = ${esc(email)} LIMIT 1`) as any;
    const arr = Array.isArray(rows) ? rows : [];
    return arr.length > 0 ? arr[0] : undefined;
  } catch (error) {
    console.error("[Database] getUserByEmail error:", error);
    return undefined;
  }
}

// Professional functions
export async function createProfessional(
  userId: number,
  specialtyId: number,
  licenseNumber: string,
  data?: Partial<any>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const client = (db as any).$client;

  await client.execute(
    `INSERT INTO professionals
     (userId, specialtyId, licenseNumber, status, bio, profilePhoto, licenseDocument, education, certifications, yearsOfExperience, hourlyRate)
     VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      specialtyId,
      licenseNumber,
      data?.bio ?? null,
      data?.profilePhoto ?? null,
      data?.licenseDocument ?? null,
      data?.education ?? null,
      data?.certifications ?? null,
      data?.yearsOfExperience ?? null,
      data?.hourlyRate ?? null,
    ]
  );
}

export async function getProfessionalByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const client = (db as any).$client;
  try {
    const result = await client.execute(
      "SELECT * FROM `professionals` WHERE `userId` = ? LIMIT 1",
      [userId]
    ) as any;
    const rows = Array.isArray(result) ? result[0] : [];
    const arr = Array.isArray(rows) ? rows : [];
    return arr[0] ?? undefined;
  } catch (e: any) {
    console.error("[DB] getProfessionalByUserId error:", e?.message);
    return undefined;
  }
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
  const client = (db as any).$client;
  try {
    const result = await client.execute(
      `SELECT p.id, p.userId, p.specialtyId, p.licenseNumber, p.licenseDocument,
        p.yearsOfExperience, p.education, p.certifications, p.bio,
        p.profilePhoto, p.hourlyRate, p.status, p.tier, p.createdAt,
        u.name as userName, u.email as userEmail, u.profileImage as userProfileImage,
        s.name as specialtyName
       FROM professionals p
       LEFT JOIN users u ON p.userId = u.id
       LEFT JOIN specialties s ON p.specialtyId = s.id
       WHERE p.id > ?
       ORDER BY p.createdAt DESC`,
      [0]
    ) as any;
    const rows = Array.isArray(result) ? result[0] : [];
    const countResult = await client.execute("SELECT COUNT(*) as total FROM professionals", []) as any;
    console.error("[DEBUG] total professionals:", JSON.stringify(countResult[0]?.[0]));
    return Array.isArray(rows) ? rows : [];
  } catch (e: any) {
    console.error("[DB] getPendingProfessionals error:", e?.message);
    return [];
  }
}

export async function approveProfessional(
  professionalId: number,
  adminId: number,
  tier: "basic" | "pro" = "basic"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get userId before updating
  const proRows = await db
    .select({ userId: professionals.userId })
    .from(professionals)
    .where(eq(professionals.id, professionalId))
    .limit(1);
  const userId = proRows[0]?.userId;

  await db
    .update(professionals)
    .set({ status: "approved", tier, updatedAt: new Date() })
    .where(eq(professionals.id, professionalId));

  if (userId) {
    await db
      .update(users)
      .set({ role: "professional" })
      .where(eq(users.id, userId));
  }
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
  try {
    // Use SELECT * to avoid errors when columns in schema don't match production DB
    const [rows] = await db.execute("SELECT * FROM `specialties` ORDER BY `name` ASC") as any;
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.error("[Database] getAllSpecialties error:", error);
    return [];
  }
}

export async function getSpecialtyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const [rows] = await db.execute(`SELECT * FROM \`specialties\` WHERE \`id\` = ${Number(id)} LIMIT 1`) as any;
    const arr = Array.isArray(rows) ? rows : [];
    return arr.length > 0 ? arr[0] : undefined;
  } catch (error) {
    console.error("[Database] getSpecialtyById error:", error);
    return undefined;
  }
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
  try {
    const [rows] = await db.execute("SELECT * FROM `subscriptionPlans` WHERE `isActive` = 1") as any;
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    // Try without isActive filter if column doesn't exist
    try {
      const [rows] = await db.execute("SELECT * FROM `subscriptionPlans`") as any;
      return Array.isArray(rows) ? rows : [];
    } catch {
      console.error("[Database] getAllSubscriptionPlans error:", error);
      return [];
    }
  }
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
  try {
    const result = await db.execute(
      sql`SELECT * FROM payments WHERE stripeSessionId = ${stripePaymentId} OR stripePaymentIntentId = ${stripePaymentId} LIMIT 1`
    );
    // Drizzle execute con sql template devuelve [rows, fields] en TiDB/MySQL2
    const arr = Array.isArray(result) ? (result as any[])[0] : ((result as any).rows ?? []);
    const finalArr = Array.isArray(arr) ? arr : [];
    const row = finalArr[0] ?? null;
    return row;
  } catch { return null; }
}

export async function recordStripePayment(data: {
  userId: number;
  stripePaymentId: string;
  amount: string;
  currency: string;
  productType: string;
  paymentType?: "subscription" | "appointment";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // NOTA: TiDB usa 'completed' como valor del enum status, no 'succeeded'
  const PAYMENT_STATUS_COMPLETED = "completed";

  // Obtener el cliente MySQL2 subyacente desde Drizzle
  const client = (db as any).session?.client ?? (db as any).client ?? (db as any).$client;

  if (client && typeof client.execute === 'function') {
    await client.execute(
      "INSERT INTO payments (userId, stripeSessionId, stripePaymentIntentId, amount, currency, status, type, creditsGranted, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)",
      [data.userId, data.stripePaymentId, data.stripePaymentId, data.amount, data.currency, PAYMENT_STATUS_COMPLETED, data.paymentType ?? "subscription", JSON.stringify({ productType: data.productType })]
    );
  } else {
    // Fallback: construir query con valores escapados manualmente
    const escaped = {
      userId: Number(data.userId),
      sessionId: data.stripePaymentId.replace(/'/g, "''"),
      amount: data.amount.replace(/'/g, "''"),
      currency: data.currency.replace(/'/g, "''"),
      type: (data.paymentType ?? "subscription").replace(/'/g, "''"),
      metadata: JSON.stringify({ productType: data.productType }).replace(/'/g, "''"),
    };
    await db.execute(
      sql`INSERT INTO payments (userId, stripeSessionId, stripePaymentIntentId, amount, currency, status, type, creditsGranted, metadata) VALUES (${escaped.userId}, ${escaped.sessionId}, ${escaped.sessionId}, ${escaped.amount}, ${escaped.currency}, ${PAYMENT_STATUS_COMPLETED}, ${escaped.type}, 0, ${escaped.metadata})`
    );
  }
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
  const client = (db as any).$client;
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 19).replace('T', ' ');
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 19).replace('T', ' ');

    const r1 = await client.execute("SELECT COUNT(*) as totalUsers FROM users", []) as any;
    const totalUsers = Number(r1[0]?.[0]?.totalUsers) || 0;

    const r2 = await client.execute("SELECT COUNT(*) as newUsersMonth FROM users WHERE createdAt >= ?", [monthStart]) as any;
    const newUsersMonth = Number(r2[0]?.[0]?.newUsersMonth) || 0;

    const r3 = await client.execute("SELECT COUNT(*) as activeProfessionals FROM professionals WHERE status = ?", ['approved']) as any;
    const activeProfessionals = Number(r3[0]?.[0]?.activeProfessionals) || 0;

    const r4 = await client.execute("SELECT COUNT(*) as appointmentsToday FROM appointments WHERE appointmentDate >= ? AND status != ?", [todayStart, 'canceled']) as any;
    const appointmentsToday = Number(r4[0]?.[0]?.appointmentsToday) || 0;

    const r5 = await client.execute("SELECT COUNT(*) as appointmentsMonth FROM appointments WHERE appointmentDate >= ? AND status != ?", [monthStart, 'canceled']) as any;
    const appointmentsMonth = Number(r5[0]?.[0]?.appointmentsMonth) || 0;

    const r6 = await client.execute("SELECT COUNT(*) as completedMonth FROM appointments WHERE appointmentDate >= ? AND status = ?", [monthStart, 'completed']) as any;
    const completedMonth = Number(r6[0]?.[0]?.completedMonth) || 0;

    const r7 = await client.execute("SELECT COUNT(*) as activeSubscriptions FROM userSubscriptions WHERE status = ?", ['active']) as any;
    const activeSubscriptions = Number(r7[0]?.[0]?.activeSubscriptions) || 0;

    return { totalUsers, newUsersMonth, activeProfessionals, appointmentsToday, appointmentsMonth, completedMonth, activeSubscriptions };
  } catch (e: any) {
    console.error("[DB] getAdminMetrics error:", e?.message);
    return null;
  }
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

export async function getFeaturedProfessionals(limit = 6) {
  const db = await getDb();
  if (!db) return [];
  try {
    const rows = await db
      .select({
        id: professionals.id,
        userId: professionals.userId,
        specialtyId: professionals.specialtyId,
        bio: professionals.bio,
        yearsOfExperience: professionals.yearsOfExperience,
        profilePhoto: professionals.profilePhoto,
        averageRating: professionals.averageRating,
        totalReviews: professionals.totalReviews,
        isAvailable: professionals.isAvailable,
        name: users.name,
        profileImage: users.profileImage,
        specialtyName: specialties.name,
      })
      .from(professionals)
      .leftJoin(users, eq(professionals.userId, users.id))
      .leftJoin(specialties, eq(professionals.specialtyId, specialties.id))
      .where(eq(professionals.status, "approved"))
      .limit(limit);
    return rows;
  } catch (error) {
    console.error("[Database] getFeaturedProfessionals error:", error);
    return [];
  }
}

export async function getAdminUsers() {
  const db = await getDb();
  if (!db) return [];
  const client = (db as any).$client;
  try {
    const result = await client.execute(
      "SELECT * FROM users WHERE role = ?",
      ['admin']
    ) as any;
    const rows = Array.isArray(result) ? result[0] : [];
    return Array.isArray(rows) ? rows : [];
  } catch (e: any) {
    console.error("[DB] getAdminUsers error:", e?.message);
    return [];
  }
}
