import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  datetime,
  longtext,
  json,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with additional fields for telemedicine platform.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).notNull().unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "professional", "admin"]).default("user").notNull(),
  phone: varchar("phone", { length: 20 }),
  profileImage: text("profileImage"),
  bio: longtext("bio"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Specialties table
 */
export const specialties = mysqlTable("specialties", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: longtext("description"),
  icon: text("icon"),
  imageUrl: text("imageUrl"),
  color: varchar("color", { length: 7 }),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Specialty = typeof specialties.$inferSelect;
export type InsertSpecialty = typeof specialties.$inferInsert;

/**
 * Professional profiles table
 */
export const professionals = mysqlTable("professionals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  specialtyId: int("specialtyId").notNull(),
  licenseNumber: varchar("licenseNumber", { length: 255 }).notNull().unique(),
  licenseDocument: text("licenseDocument"),
  yearsOfExperience: int("yearsOfExperience"),
  education: longtext("education"),
  certifications: longtext("certifications"),
  bio: longtext("bio"),
  profilePhoto: text("profilePhoto"),
  hourlyRate: decimal("hourlyRate", { precision: 10, scale: 2 }),
  languages: text("languages"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  rejectionReason: longtext("rejectionReason"),
  averageRating: decimal("averageRating", { precision: 3, scale: 2 }).default("0"),
  totalReviews: int("totalReviews").default(0),
  isAvailable: boolean("isAvailable").default(true),
  tier: mysqlEnum("tier", ["basic", "pro"]).default("basic").notNull(),
  identityDocUrl: text("identityDocUrl"),
  documentNationality: varchar("documentNationality", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Professional = typeof professionals.$inferSelect;
export type InsertProfessional = typeof professionals.$inferInsert;

/**
 * Subscription plans table
 */
export const subscriptionPlans = mysqlTable("subscriptionPlans", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: longtext("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("MXN"),
  billingPeriod: mysqlEnum("billingPeriod", ["monthly", "yearly"]).notNull(),
  maxAppointmentsPerMonth: int("maxAppointmentsPerMonth"),
  maxMinutesPerAppointment: int("maxMinutesPerAppointment"),
  features: json("features"),
  stripePriceId: varchar("stripePriceId", { length: 255 }),
  isActive: boolean("isActive").default(true),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;

/**
 * User subscriptions table
 */
export const userSubscriptions = mysqlTable("userSubscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  planId: int("planId").notNull(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  status: mysqlEnum("status", ["active", "canceled", "paused", "expired"]).default("active").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  appointmentsUsedThisMonth: int("appointmentsUsedThisMonth").default(0),
  canceledAt: timestamp("canceledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = typeof userSubscriptions.$inferInsert;

/**
 * Professional availability table
 */
export const professionalAvailability = mysqlTable("professionalAvailability", {
  id: int("id").autoincrement().primaryKey(),
  professionalId: int("professionalId").notNull(),
  dayOfWeek: int("dayOfWeek").notNull(), // 0-6 (Sunday-Saturday)
  startTime: varchar("startTime", { length: 5 }).notNull(), // HH:MM format
  endTime: varchar("endTime", { length: 5 }).notNull(), // HH:MM format
  isAvailable: boolean("isAvailable").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProfessionalAvailability = typeof professionalAvailability.$inferSelect;
export type InsertProfessionalAvailability = typeof professionalAvailability.$inferInsert;

/**
 * Appointments table
 */
export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  professionalId: int("professionalId").notNull(),
  specialtyId: int("specialtyId").notNull(),
  appointmentDate: datetime("appointmentDate").notNull(),
  durationMinutes: int("durationMinutes").notNull(),
  status: mysqlEnum("status", ["scheduled", "in_progress", "completed", "canceled", "no-show", "pending_review"]).default("scheduled").notNull(),
  videoCallType: mysqlEnum("videoCallType", ["zoom", "google_meet", "daily"]).default("daily").notNull(),
  videoCallLink: text("videoCallLink"),
  videoCallId: varchar("videoCallId", { length: 255 }),
  notes: longtext("notes"),
  canceledAt: timestamp("canceledAt"),
  canceledBy: mysqlEnum("canceledBy", ["user", "professional", "admin"]),
  cancellationReason: longtext("cancellationReason"),
  penaltyAmount: int("penaltyAmount").default(0),
  penaltyType: mysqlEnum("penaltyType", ["none", "partial", "full", "credits_lost"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

/**
 * Reviews and ratings table
 */
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  appointmentId: int("appointmentId"),
  userId: int("userId").notNull(),
  professionalId: int("professionalId").notNull(),
  rating: int("rating").notNull(), // 1-5
  comment: longtext("comment"),
  isVerified: boolean("isVerified").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

/**
 * Documents table for storing professional credentials and appointment files
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  documentType: mysqlEnum("documentType", ["license", "certificate", "credential", "appointment_file"]).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"),
  appointmentId: int("appointmentId"),
  verificationStatus: mysqlEnum("verificationStatus", ["pending", "approved", "rejected"]).default("pending"),
  verificationNotes: longtext("verificationNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Email logs table for tracking sent emails
 */
export const emailLogs = mysqlTable("emailLogs", {
  id: int("id").autoincrement().primaryKey(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  emailType: mysqlEnum("emailType", [
    "confirmation",
    "reminder_24h",
    "reminder_1h",
    "professional_approval",
    "appointment_canceled",
    "subscription_changed",
  ]).notNull(),
  appointmentId: int("appointmentId"),
  userId: int("userId"),
  subject: varchar("subject", { length: 255 }),
  status: mysqlEnum("status", ["sent", "failed", "pending"]).default("pending"),
  errorMessage: longtext("errorMessage"),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = typeof emailLogs.$inferInsert;

/**
 * Payment records table
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stripePaymentId: varchar("stripePaymentId", { length: 255 }).notNull().unique(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("MXN"),
  status: mysqlEnum("status", ["pending", "succeeded", "failed", "canceled"]).default("pending"),
  paymentType: mysqlEnum("paymentType", ["subscription", "appointment"]).notNull(),
  appointmentId: int("appointmentId"),
  subscriptionId: int("subscriptionId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * Credit batches table — each purchase (plan or individual) creates a batch
 * with a 60-day expiration. FIFO consumption: oldest batch first.
 */
export const creditBatches = mysqlTable("creditBatches", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: int("amount").notNull(),       // original credits in this batch
  remaining: int("remaining").notNull(), // credits still available
  source: mysqlEnum("source", ["plan_basic", "plan_pro", "individual_basic", "individual_premium", "test_20"]).notNull(),
  expiresAt: timestamp("expiresAt").notNull(), // now + 60 days
  expiredEarly: boolean("expiredEarly").default(false), // true if cancelled subscription
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreditBatch = typeof creditBatches.$inferSelect;
export type InsertCreditBatch = typeof creditBatches.$inferInsert;

/**
 * Credit transactions table — audit trail for every credit movement
 */
export const creditTransactions = mysqlTable("creditTransactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  batchId: int("batchId"),  // which batch was affected (null for summary ops)
  delta: int("delta").notNull(), // positive = added, negative = consumed/expired
  reason: mysqlEnum("reason", ["purchase", "consume", "expire", "refund"]).notNull(),
  appointmentId: int("appointmentId"),
  description: varchar("description", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = typeof creditTransactions.$inferInsert;

/**
 * Blocked days table — specific dates a professional is unavailable (vacations, personal days)
 */
export const blockedDays = mysqlTable("blockedDays", {
  id: int("id").autoincrement().primaryKey(),
  professionalId: int("professionalId").notNull(),
  blockedDate: varchar("blockedDate", { length: 10 }).notNull(), // YYYY-MM-DD format
  reason: varchar("reason", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BlockedDay = typeof blockedDays.$inferSelect;
export type InsertBlockedDay = typeof blockedDays.$inferInsert;

/**
 * Payment queue — reliable processing with retry logic
 */
export const paymentQueue = mysqlTable("paymentQueue", {
  id:              int("id").autoincrement().primaryKey(),
  stripeSessionId: varchar("stripeSessionId", { length: 255 }).notNull().unique(),
  userId:          int("userId").notNull(),
  productType:     varchar("productType", { length: 64 }).notNull(),
  credits:         int("credits").notNull(),
  amount:          decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency:        varchar("currency", { length: 3 }).default("MXN"),
  status:          mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending"),
  attempts:        int("attempts").default(0),
  lastError:       text("lastError"),
  processedAt:     timestamp("processedAt"),
  createdAt:       timestamp("createdAt").defaultNow().notNull(),
  updatedAt:       timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PaymentQueueItem = typeof paymentQueue.$inferSelect;

/**
 * Professional penalties — multas por cancelaciones tardías o no-shows
 */
export const professionalPenalties = mysqlTable("professionalPenalties", {
  id: int("id").autoincrement().primaryKey(),
  professionalId: int("professionalId").notNull(),
  appointmentId: int("appointmentId"),
  amount: int("amount").notNull(),
  penaltyType: mysqlEnum("penaltyType", ["partial", "full"]).notNull(),
  reason: varchar("reason", { length: 255 }),
  status: mysqlEnum("status", ["pending", "collected", "waived"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProfessionalPenalty = typeof professionalPenalties.$inferSelect;
export type InsertProfessionalPenalty = typeof professionalPenalties.$inferInsert;
export type InsertPaymentQueueItem = typeof paymentQueue.$inferInsert;

/**
 * Professional wallet — one balance row per professional
 */
export const professionalWallet = mysqlTable("professionalWallet", {
  id: int("id").autoincrement().primaryKey(),
  professionalId: int("professionalId").notNull().unique(),
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0").notNull(),
  pendingWithdrawal: decimal("pendingWithdrawal", { precision: 10, scale: 2 }).default("0").notNull(),
  totalEarned: decimal("totalEarned", { precision: 10, scale: 2 }).default("0").notNull(),
  totalWithdrawn: decimal("totalWithdrawn", { precision: 10, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ProfessionalWallet = typeof professionalWallet.$inferSelect;

/**
 * Professional earnings — one row per completed appointment
 */
export const professionalEarnings = mysqlTable("professionalEarnings", {
  id: int("id").autoincrement().primaryKey(),
  professionalId: int("professionalId").notNull(),
  appointmentId: int("appointmentId").notNull().unique(),
  grossAmount: decimal("grossAmount", { precision: 10, scale: 2 }).notNull(),
  commissionRate: decimal("commissionRate", { precision: 5, scale: 4 }).notNull(),
  commissionAmount: decimal("commissionAmount", { precision: 10, scale: 2 }).notNull(),
  netAmount: decimal("netAmount", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "credited", "reversed"]).default("credited").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ProfessionalEarning = typeof professionalEarnings.$inferSelect;

/**
 * Withdrawal requests
 */
export const withdrawalRequests = mysqlTable("withdrawalRequests", {
  id: int("id").autoincrement().primaryKey(),
  professionalId: int("professionalId").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  clabe: varchar("clabe", { length: 18 }).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "paid"]).default("pending").notNull(),
  adminNotes: longtext("adminNotes"),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;

/**
 * In-app notifications table
 */
export const notifications = mysqlTable("notifications", {
  id:        int("id").autoincrement().primaryKey(),
  userId:    int("userId").notNull(),
  type:      mysqlEnum("type", ["info", "success", "warning", "error", "professional_approved", "professional_rejected", "appointment_confirmed", "appointment_cancelled", "withdrawal_approved", "withdrawal_rejected", "new_earning"]).notNull(),
  title:     varchar("title", { length: 255 }).notNull(),
  message:   text("message").notNull(),
  link:      varchar("link", { length: 512 }),
  isRead:    boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
