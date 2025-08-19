import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  pgEnum,
  boolean,
  bigint,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Student profiles
export const studentProfiles = pgTable("student_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  gpa: decimal("gpa", { precision: 3, scale: 2 }),
  major: varchar("major"),
  academicLevel: varchar("academic_level"), // freshman, sophomore, junior, senior, graduate
  graduationYear: integer("graduation_year"),
  school: varchar("school"),
  location: varchar("location"),
  demographics: jsonb("demographics"), // ethnicity, gender, etc.
  interests: text("interests").array(),
  extracurriculars: text("extracurriculars").array(),
  achievements: text("achievements").array(),
  financialNeed: boolean("financial_need").default(false),
  completionPercentage: integer("completion_percentage").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Scholarships/opportunities
export const scholarships = pgTable("scholarships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  organization: varchar("organization").notNull(),
  amount: integer("amount").notNull(),
  description: text("description"),
  requirements: text("requirements").array(),
  eligibilityCriteria: jsonb("eligibility_criteria"),
  deadline: timestamp("deadline").notNull(),
  applicationUrl: varchar("application_url"),
  estimatedApplicants: integer("estimated_applicants"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Application status enum
export const applicationStatusEnum = pgEnum("application_status", [
  "draft",
  "in_progress", 
  "submitted",
  "under_review",
  "accepted",
  "rejected"
]);

// Student applications
export const applications = pgTable("applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => studentProfiles.id),
  scholarshipId: varchar("scholarship_id").notNull().references(() => scholarships.id),
  status: applicationStatusEnum("status").default("draft"),
  progressPercentage: integer("progress_percentage").default(0),
  submittedAt: timestamp("submitted_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Scholarship matches with scoring
export const scholarshipMatches = pgTable("scholarship_matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => studentProfiles.id),
  scholarshipId: varchar("scholarship_id").notNull().references(() => scholarships.id),
  matchScore: integer("match_score"), // 0-100
  matchReason: text("match_reason").array(),
  chanceLevel: varchar("chance_level"), // "High Chance", "Competitive", "Long Shot"
  isBookmarked: boolean("is_bookmarked").default(false),
  isDismissed: boolean("is_dismissed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Documents
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => studentProfiles.id),
  type: varchar("type").notNull(), // transcript, resume, essay, letter_of_recommendation
  title: varchar("title").notNull(),
  fileName: varchar("file_name").notNull(),
  filePath: varchar("file_path").notNull(),
  fileSize: integer("file_size"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Essay assistance
export const essays = pgTable("essays", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => studentProfiles.id),
  title: varchar("title").notNull(),
  prompt: text("prompt"),
  content: text("content"),
  outline: jsonb("outline"),
  feedback: text("feedback").array(),
  wordCount: integer("word_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  profile: one(studentProfiles, {
    fields: [users.id],
    references: [studentProfiles.userId],
  }),
}));

export const studentProfilesRelations = relations(studentProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [studentProfiles.userId],
    references: [users.id],
  }),
  applications: many(applications),
  matches: many(scholarshipMatches),
  documents: many(documents),
  essays: many(essays),
}));

export const scholarshipsRelations = relations(scholarships, ({ many }) => ({
  applications: many(applications),
  matches: many(scholarshipMatches),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  student: one(studentProfiles, {
    fields: [applications.studentId],
    references: [studentProfiles.id],
  }),
  scholarship: one(scholarships, {
    fields: [applications.scholarshipId],
    references: [scholarships.id],
  }),
}));

export const scholarshipMatchesRelations = relations(scholarshipMatches, ({ one }) => ({
  student: one(studentProfiles, {
    fields: [scholarshipMatches.studentId],
    references: [studentProfiles.id],
  }),
  scholarship: one(scholarships, {
    fields: [scholarshipMatches.scholarshipId],
    references: [scholarships.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  student: one(studentProfiles, {
    fields: [documents.studentId],
    references: [studentProfiles.id],
  }),
}));

export const essaysRelations = relations(essays, ({ one }) => ({
  student: one(studentProfiles, {
    fields: [essays.studentId],
    references: [studentProfiles.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStudentProfileSchema = createInsertSchema(studentProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Enhanced validation for critical fields (fixes QA-003)
  gpa: z.number().min(0).max(4.0).nullable().optional(),
  graduationYear: z.number()
    .int()
    .min(new Date().getFullYear())
    .max(new Date().getFullYear() + 10)
    .nullable()
    .optional(),
  major: z.string().min(1).max(100).nullable().optional(),
  school: z.string().min(1).max(200).nullable().optional(),
  interests: z.array(z.string().min(1).max(50)).max(10).nullable().optional(),
});

export const updateStudentProfileSchema = insertStudentProfileSchema.partial().extend({
  // Additional validation for updates - prevent injection attacks
  userId: z.string().uuid().optional(),
});

export const insertScholarshipSchema = createInsertSchema(scholarships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
});

export const insertEssaySchema = createInsertSchema(essays).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertStudentProfile = z.infer<typeof insertStudentProfileSchema>;
export type StudentProfile = typeof studentProfiles.$inferSelect;
export type InsertScholarship = z.infer<typeof insertScholarshipSchema>;
export type Scholarship = typeof scholarships.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applications.$inferSelect;
export type ScholarshipMatch = typeof scholarshipMatches.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Essay = typeof essays.$inferSelect;
export type InsertEssay = z.infer<typeof insertEssaySchema>;

// ========== BILLING SYSTEM SCHEMA ==========

// Enums for billing system
export const ledgerTypeEnum = pgEnum("ledger_type", [
  "purchase",
  "deduction", 
  "refund",
  "adjustment"
]);

export const referenceTypeEnum = pgEnum("reference_type", [
  "stripe",
  "openai",
  "admin", 
  "system"
]);

export const purchaseStatusEnum = pgEnum("purchase_status", [
  "created",
  "paid",
  "fulfilled", 
  "canceled",
  "failed"
]);

export const packageCodeEnum = pgEnum("package_code", [
  "starter",
  "basic",
  "pro",
  "business"
]);

// Credit balance table - tracks user's current credit balance in millicredits
export const creditBalances = pgTable("credit_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  balanceMillicredits: bigint("balance_millicredits", { mode: "bigint" }).default(sql`0`),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Credit ledger - immutable audit trail of all credit transactions
export const creditLedger = pgTable("credit_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: ledgerTypeEnum("type").notNull(),
  amountMillicredits: bigint("amount_millicredits", { mode: "bigint" }).notNull(), // positive for additions, negative for deductions
  balanceAfterMillicredits: bigint("balance_after_millicredits", { mode: "bigint" }).notNull(),
  referenceType: referenceTypeEnum("reference_type").notNull(),
  referenceId: varchar("reference_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_credit_ledger_user_created").on(table.userId, table.createdAt),
  index("idx_credit_ledger_reference").on(table.referenceType, table.referenceId),
]);

// Purchase records for credit packages
export const purchases = pgTable("purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  packageCode: packageCodeEnum("package_code").notNull(),
  priceUsdCents: integer("price_usd_cents").notNull(), // price charged in cents
  baseCredits: integer("base_credits").notNull(), // base credits without bonus
  bonusCredits: integer("bonus_credits").notNull().default(0), // bonus credits
  totalCredits: integer("total_credits").notNull(), // total credits (base + bonus)
  status: purchaseStatusEnum("status").default("created"),
  stripeSessionId: varchar("stripe_session_id").unique(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_purchases_user_created").on(table.userId, table.createdAt),
  index("idx_purchases_stripe_session").on(table.stripeSessionId),
  index("idx_purchases_stripe_payment").on(table.stripePaymentIntentId),
]);

// Rate card for OpenAI model pricing
export const rateCard = pgTable("rate_card", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  model: varchar("model").notNull(), // must match OpenAI model ID
  inputCreditsPer1k: decimal("input_credits_per_1k", { precision: 10, scale: 4 }).notNull(),
  outputCreditsPer1k: decimal("output_credits_per_1k", { precision: 10, scale: 4 }).notNull(),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_rate_card_model_active").on(table.model, table.active),
  index("idx_rate_card_effective").on(table.effectiveFrom),
]);

// Usage events - tracks all OpenAI API usage and charges
export const usageEvents = pgTable("usage_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  model: varchar("model").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  appliedInputCreditsPer1k: decimal("applied_input_credits_per_1k", { precision: 10, scale: 4 }).notNull(),
  appliedOutputCreditsPer1k: decimal("applied_output_credits_per_1k", { precision: 10, scale: 4 }).notNull(),
  chargedMillicredits: bigint("charged_millicredits", { mode: "bigint" }).notNull(),
  openaiRequestId: varchar("openai_request_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_usage_events_user_created").on(table.userId, table.createdAt),
  index("idx_usage_events_model").on(table.model),
  index("idx_usage_events_openai_request").on(table.openaiRequestId),
]);

// Billing system relations
export const creditBalancesRelations = relations(creditBalances, ({ one }) => ({
  user: one(users, {
    fields: [creditBalances.userId],
    references: [users.id],
  }),
}));

export const creditLedgerRelations = relations(creditLedger, ({ one }) => ({
  user: one(users, {
    fields: [creditLedger.userId],
    references: [users.id],
  }),
}));

export const purchasesRelations = relations(purchases, ({ one }) => ({
  user: one(users, {
    fields: [purchases.userId],
    references: [users.id],
  }),
}));

export const usageEventsRelations = relations(usageEvents, ({ one }) => ({
  user: one(users, {
    fields: [usageEvents.userId],
    references: [users.id],
  }),
}));

// Update users relations to include billing
export const usersRelationsUpdated = relations(users, ({ one, many }) => ({
  profile: one(studentProfiles, {
    fields: [users.id],
    references: [studentProfiles.userId],
  }),
  creditBalance: one(creditBalances, {
    fields: [users.id],
    references: [creditBalances.userId],
  }),
  creditLedger: many(creditLedger),
  purchases: many(purchases),
  usageEvents: many(usageEvents),
}));

// Billing insert schemas
export const insertCreditBalanceSchema = createInsertSchema(creditBalances).omit({
  id: true,
  updatedAt: true,
});

export const insertCreditLedgerSchema = createInsertSchema(creditLedger).omit({
  id: true,
  createdAt: true,
});

export const insertPurchaseSchema = createInsertSchema(purchases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRateCardSchema = createInsertSchema(rateCard).omit({
  id: true,
  createdAt: true,
});

export const insertUsageEventSchema = createInsertSchema(usageEvents).omit({
  id: true,
  createdAt: true,
});

// Billing types
export type CreditBalance = typeof creditBalances.$inferSelect;
export type InsertCreditBalance = z.infer<typeof insertCreditBalanceSchema>;
export type CreditLedgerEntry = typeof creditLedger.$inferSelect;
export type InsertCreditLedgerEntry = z.infer<typeof insertCreditLedgerSchema>;
export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type RateCardEntry = typeof rateCard.$inferSelect;
export type InsertRateCardEntry = z.infer<typeof insertRateCardSchema>;
export type UsageEvent = typeof usageEvents.$inferSelect;
export type InsertUsageEvent = z.infer<typeof insertUsageEventSchema>;
