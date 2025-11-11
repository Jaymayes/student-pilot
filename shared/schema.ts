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
  birthdate: timestamp("birthdate"), // For COPPA compliance
  ageVerified: boolean("age_verified").default(false), // Confirmed 13+
  parentalConsent: boolean("parental_consent").default(false), // For users under 13
  parentalConsentDate: timestamp("parental_consent_date"),
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
}, (table) => [
  index("IDX_scholarships_is_active").on(table.isActive),
  index("IDX_scholarships_deadline").on(table.deadline),
]);

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
}, (table) => [
  index("IDX_applications_student_id").on(table.studentId),
  index("IDX_applications_scholarship_id").on(table.scholarshipId),
]);

// Scholarship matches with scoring
export const scholarshipMatches = pgTable("scholarship_matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => studentProfiles.id),
  scholarshipId: varchar("scholarship_id").notNull().references(() => scholarships.id),
  matchScore: integer("match_score"), // 0-100
  matchReason: text("match_reason").array(),
  chanceLevel: varchar("chance_level"), // "High Chance", "Competitive", "Long Shot"
  explanationMetadata: jsonb("explanation_metadata"), // Detailed scoring breakdown
  aiCostCents: integer("ai_cost_cents"), // Cost in cents for AI analysis
  isBookmarked: boolean("is_bookmarked").default(false),
  isDismissed: boolean("is_dismissed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_scholarship_matches_student_id").on(table.studentId),
  index("IDX_scholarship_matches_dismissed").on(table.isDismissed),
  index("IDX_scholarship_matches_score").on(table.matchScore),
]);

// Documents
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => studentProfiles.id),
  type: varchar("type").notNull(), // transcript, resume, essay, letter_of_recommendation
  title: varchar("title").notNull(),
  fileName: varchar("file_name").notNull(),
  filePath: varchar("file_path").notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type"),
  category: varchar("category"), // academic, personal, financial, other
  tags: text("tags").array(), // For search and organization
  usageCount: integer("usage_count").default(0), // Track reuse
  description: text("description"), // User-added notes
  uploadedAt: timestamp("uploaded_at").defaultNow(),
}, (table) => [
  index("IDX_documents_student_id").on(table.studentId),
  index("IDX_documents_type").on(table.type),
  index("IDX_documents_category").on(table.category),
]);

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
}, (table) => [
  index("IDX_essays_student_id").on(table.studentId),
]);

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
  // Enhanced validation for critical fields (VAL-001)
  // Use coerce to handle form data (strings) and convert to numbers
  gpa: z.coerce.number().min(0).max(4.0).nullable().optional(),
  graduationYear: z.coerce.number()
    .int()
    .min(new Date().getFullYear())
    .max(new Date().getFullYear() + 10)
    .nullable()
    .optional(),
  major: z.string().min(1).max(100).nullable().optional(),
  school: z.string().min(1).max(200).nullable().optional(),
  // Enhanced array validation with sanitization (VAL-001)
  interests: z.array(
    z.string()
      .min(1, "Interest cannot be empty")
      .max(50, "Interest too long")
      .regex(/^[a-zA-Z0-9\s\-&.]+$/, "Interest contains invalid characters")
      .transform(s => s.trim())
  ).max(20, "Too many interests").nullable().optional(),
  extracurriculars: z.array(
    z.string()
      .min(1, "Activity cannot be empty")
      .max(100, "Activity name too long")
      .regex(/^[a-zA-Z0-9\s\-&.,()]+$/, "Activity contains invalid characters")
      .transform(s => s.trim())
  ).max(15, "Too many extracurriculars").nullable().optional(),
  achievements: z.array(
    z.string()
      .min(1, "Achievement cannot be empty")
      .max(200, "Achievement description too long")
      .transform(s => s.trim())
  ).max(10, "Too many achievements").nullable().optional(),
});

export const updateStudentProfileSchema = insertStudentProfileSchema.partial().extend({
  // Additional validation for updates - prevent injection attacks
  userId: z.string().uuid().optional(),
});

export const insertScholarshipSchema = createInsertSchema(scholarships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Enhanced validation for scholarship requirements (VAL-001)
  requirements: z.array(
    z.string()
      .min(1, "Requirement cannot be empty")
      .max(500, "Requirement too long")
      .transform(s => s.trim())
  ).max(20, "Too many requirements").nullable().optional(),
  amount: z.number().min(1, "Amount must be positive").max(1000000, "Amount too large"),
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  organization: z.string().min(1, "Organization is required").max(200, "Organization name too long"),
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
}).extend({
  // Enhanced validation for essay feedback (VAL-001)
  feedback: z.array(
    z.string()
      .min(1, "Feedback cannot be empty")
      .max(1000, "Feedback too long")
      .transform(s => s.trim())
  ).max(50, "Too much feedback").nullable().optional(),
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  wordCount: z.number().min(0).max(10000).optional(),
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

// ========== FERPA CONSENT MANAGEMENT SCHEMA ==========

// Consent category types
export const consentCategoryEnum = pgEnum("consent_category", [
  "ferpa_directory_info",    // FERPA directory information disclosure
  "ferpa_educational_records", // FERPA educational records access
  "data_processing",         // General data processing consent
  "marketing_communications", // Marketing and promotional communications
  "analytics_tracking",      // Usage analytics and behavior tracking
  "third_party_sharing",     // Sharing data with scholarship providers
  "ai_processing"           // AI-powered essay analysis and matching
]);

// Consent status types
export const consentStatusEnum = pgEnum("consent_status", [
  "granted",     // User explicitly granted consent
  "denied",      // User explicitly denied consent
  "withdrawn",   // User previously granted but later withdrew
  "expired"      // Consent expired based on retention policy
]);

// Data use categories for transparency
export const dataUseCategoryEnum = pgEnum("data_use_category", [
  "scholarship_matching",    // Core scholarship matching functionality
  "application_assistance",  // Essay writing and application help
  "platform_improvement",   // Product analytics and improvements
  "communications",         // Email notifications and updates
  "compliance_reporting",   // Legal and compliance requirements
  "fraud_prevention",       // Security and fraud detection
  "customer_support"       // Help desk and user support
]);

// Consent categories - defines what we need consent for
export const consentCategories = pgTable("consent_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: consentCategoryEnum("category").notNull().unique(),
  title: varchar("title").notNull(), // Human-readable title
  description: text("description").notNull(), // Detailed explanation
  isRequired: boolean("is_required").default(false), // Required for service
  isFerpaRegulated: boolean("is_ferpa_regulated").default(false), // FERPA compliance flag
  retentionMonths: integer("retention_months"), // Data retention period
  effectiveFrom: timestamp("effective_from").defaultNow(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Data use disclosures - what we tell users about data usage
export const dataUseDisclosures = pgTable("data_use_disclosures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: dataUseCategoryEnum("category").notNull(),
  purpose: varchar("purpose").notNull(), // Primary purpose statement
  dataTypes: text("data_types").array().notNull(), // Types of data used
  thirdParties: text("third_parties").array(), // Third parties who receive data
  retentionPeriod: varchar("retention_period"), // How long we keep data
  userRights: text("user_rights").array().notNull(), // User rights (access, delete, etc.)
  legalBasis: varchar("legal_basis"), // Legal basis for processing
  version: integer("version").default(1),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_data_disclosures_category_active").on(table.category, table.isActive),
  index("idx_data_disclosures_effective").on(table.effectiveFrom),
]);

// User consent records - tracks individual consent decisions
export const userConsents = pgTable("user_consents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  categoryId: varchar("category_id").notNull().references(() => consentCategories.id),
  status: consentStatusEnum("status").notNull(),
  consentTimestamp: timestamp("consent_timestamp").notNull(),
  expiresAt: timestamp("expires_at"), // When consent expires (if applicable)
  ipAddress: varchar("ip_address"), // IP address when consent was given
  userAgent: text("user_agent"), // Browser/device info
  consentMethod: varchar("consent_method").notNull(), // "web_form", "api", "implied"
  consentVersion: integer("consent_version").default(1), // Version of consent text
  metadata: jsonb("metadata"), // Additional context
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_user_consents_user_category").on(table.userId, table.categoryId),
  index("idx_user_consents_status").on(table.status),
  index("idx_user_consents_expires").on(table.expiresAt),
  index("idx_user_consents_timestamp").on(table.consentTimestamp),
]);

// Consent audit log - immutable record of all consent changes
export const consentAuditLog = pgTable("consent_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  categoryId: varchar("category_id").notNull().references(() => consentCategories.id),
  oldStatus: consentStatusEnum("old_status"),
  newStatus: consentStatusEnum("new_status").notNull(),
  changeReason: varchar("change_reason"), // "user_action", "expiration", "admin_action"
  changeDetails: text("change_details"), // Additional context
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  correlationId: varchar("correlation_id"), // Request tracking
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_consent_audit_user_category").on(table.userId, table.categoryId),
  index("idx_consent_audit_created").on(table.createdAt),
  index("idx_consent_audit_correlation").on(table.correlationId),
]);

// Onboarding progress tracking
export const onboardingProgress = pgTable("onboarding_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  consentCompleted: boolean("consent_completed").default(false),
  consentCompletedAt: timestamp("consent_completed_at"),
  profileStarted: boolean("profile_started").default(false),
  profileStartedAt: timestamp("profile_started_at"),
  profileCompleted: boolean("profile_completed").default(false),
  profileCompletedAt: timestamp("profile_completed_at"),
  onboardingCompletedAt: timestamp("onboarding_completed_at"),
  currentStep: varchar("current_step").default("consent"), // "consent", "profile", "completed"
  stepData: jsonb("step_data"), // Step-specific progress data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_onboarding_progress_step").on(table.currentStep),
  index("idx_onboarding_progress_completed").on(table.onboardingCompletedAt),
]);

// FERPA consent relations
export const consentCategoriesRelations = relations(consentCategories, ({ many }) => ({
  userConsents: many(userConsents),
  auditLogs: many(consentAuditLog),
}));

export const userConsentsRelations = relations(userConsents, ({ one }) => ({
  user: one(users, {
    fields: [userConsents.userId],
    references: [users.id],
  }),
  category: one(consentCategories, {
    fields: [userConsents.categoryId],
    references: [consentCategories.id],
  }),
}));

export const consentAuditLogRelations = relations(consentAuditLog, ({ one }) => ({
  user: one(users, {
    fields: [consentAuditLog.userId],
    references: [users.id],
  }),
  category: one(consentCategories, {
    fields: [consentAuditLog.categoryId],
    references: [consentCategories.id],
  }),
}));

export const onboardingProgressRelations = relations(onboardingProgress, ({ one }) => ({
  user: one(users, {
    fields: [onboardingProgress.userId],
    references: [users.id],
  }),
}));

// FERPA consent schemas
export const insertConsentCategorySchema = createInsertSchema(consentCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDataUseDisclosureSchema = createInsertSchema(dataUseDisclosures).omit({
  id: true,
  createdAt: true,
});

export const insertUserConsentSchema = createInsertSchema(userConsents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConsentAuditLogSchema = createInsertSchema(consentAuditLog).omit({
  id: true,
  createdAt: true,
});

export const insertOnboardingProgressSchema = createInsertSchema(onboardingProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// FERPA consent types
export type ConsentCategory = typeof consentCategories.$inferSelect;
export type InsertConsentCategory = z.infer<typeof insertConsentCategorySchema>;
export type DataUseDisclosure = typeof dataUseDisclosures.$inferSelect;
export type InsertDataUseDisclosure = z.infer<typeof insertDataUseDisclosureSchema>;
export type UserConsent = typeof userConsents.$inferSelect;
export type InsertUserConsent = z.infer<typeof insertUserConsentSchema>;
export type ConsentAuditLogEntry = typeof consentAuditLog.$inferSelect;
export type InsertConsentAuditLogEntry = z.infer<typeof insertConsentAuditLogSchema>;
export type OnboardingProgress = typeof onboardingProgress.$inferSelect;
export type InsertOnboardingProgress = z.infer<typeof insertOnboardingProgressSchema>;

// ========== TTV ANALYTICS SCHEMA ==========

// TTV event types enum
export const ttvEventTypeEnum = pgEnum("ttv_event_type", [
  "signup",
  "profile_complete",
  "first_match_generated", 
  "first_match_viewed",
  "first_scholarship_saved",
  "first_application_started",
  "first_essay_assistance",
  "first_ai_usage",
  "first_credit_purchase",
  "first_application_submitted"
]);

// Cohort table for tracking user groups
export const cohorts = pgTable("cohorts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  targetSize: integer("target_size").notNull(),
  currentSize: integer("current_size").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  activatedAt: timestamp("activated_at"),
  completedAt: timestamp("completed_at"),
});

// User cohort membership
export const userCohorts = pgTable("user_cohorts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  cohortId: varchar("cohort_id").notNull().references(() => cohorts.id),
  joinedAt: timestamp("joined_at").defaultNow(),
  isActive: boolean("is_active").default(true),
}, (table) => [
  index("idx_user_cohorts_user_cohort").on(table.userId, table.cohortId),
  index("idx_user_cohorts_cohort_active").on(table.cohortId, table.isActive),
]);

// TTV events tracking
export const ttvEvents = pgTable("ttv_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  cohortId: varchar("cohort_id").references(() => cohorts.id),
  eventType: ttvEventTypeEnum("event_type").notNull(),
  metadata: jsonb("metadata"), // Additional context about the event
  sessionId: varchar("session_id"), // Browser session for attribution
  correlationId: varchar("correlation_id"), // Request correlation for debugging
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_ttv_events_user_type").on(table.userId, table.eventType),
  index("idx_ttv_events_cohort_type").on(table.cohortId, table.eventType),
  index("idx_ttv_events_created").on(table.createdAt),
]);

// TTV milestone tracking - calculated metrics for each user
export const ttvMilestones = pgTable("ttv_milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  cohortId: varchar("cohort_id").references(() => cohorts.id),
  
  // Milestone timestamps (null means not reached yet)
  signupAt: timestamp("signup_at"),
  profileCompleteAt: timestamp("profile_complete_at"), 
  firstMatchAt: timestamp("first_match_at"),
  firstMatchViewAt: timestamp("first_match_view_at"),
  firstScholarshipSavedAt: timestamp("first_scholarship_saved_at"),
  firstApplicationAt: timestamp("first_application_at"),
  firstEssayAt: timestamp("first_essay_at"),
  firstAiUsageAt: timestamp("first_ai_usage_at"),
  firstPurchaseAt: timestamp("first_purchase_at"),
  firstSubmissionAt: timestamp("first_submission_at"),
  
  // Calculated TTV metrics (in seconds)
  timeToProfileComplete: integer("time_to_profile_complete"), // signup -> profile
  timeToFirstMatch: integer("time_to_first_match"), // signup -> first match
  timeToFirstValue: integer("time_to_first_value"), // signup -> first meaningful action
  timeToMonetization: integer("time_to_monetization"), // signup -> first purchase
  
  // Profile completion percentage snapshot
  maxProfileCompletion: integer("max_profile_completion").default(0),
  
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_ttv_milestones_cohort").on(table.cohortId),
  index("idx_ttv_milestones_signup").on(table.signupAt),
]);

// TTV analytics schemas
export const insertCohortSchema = createInsertSchema(cohorts).omit({
  id: true,
  createdAt: true,
  currentSize: true,
});

export const insertUserCohortSchema = createInsertSchema(userCohorts).omit({
  id: true,
  joinedAt: true,
});

export const insertTtvEventSchema = createInsertSchema(ttvEvents).omit({
  id: true,
  createdAt: true,
});

export const insertTtvMilestoneSchema = createInsertSchema(ttvMilestones).omit({
  id: true,
  updatedAt: true,
});

// TTV relations
export const cohortsRelations = relations(cohorts, ({ many }) => ({
  userCohorts: many(userCohorts),
  ttvEvents: many(ttvEvents),
  ttvMilestones: many(ttvMilestones),
}));

export const userCohortsRelations = relations(userCohorts, ({ one }) => ({
  user: one(users, {
    fields: [userCohorts.userId],
    references: [users.id],
  }),
  cohort: one(cohorts, {
    fields: [userCohorts.cohortId],
    references: [cohorts.id],
  }),
}));

export const ttvEventsRelations = relations(ttvEvents, ({ one }) => ({
  user: one(users, {
    fields: [ttvEvents.userId],
    references: [users.id],
  }),
  cohort: one(cohorts, {
    fields: [ttvEvents.cohortId],
    references: [cohorts.id],
  }),
}));

export const ttvMilestonesRelations = relations(ttvMilestones, ({ one }) => ({
  user: one(users, {
    fields: [ttvMilestones.userId],
    references: [users.id],
  }),
  cohort: one(cohorts, {
    fields: [ttvMilestones.cohortId],
    references: [cohorts.id],
  }),
}));

// TTV types
export type Cohort = typeof cohorts.$inferSelect;
export type InsertCohort = z.infer<typeof insertCohortSchema>;
export type UserCohort = typeof userCohorts.$inferSelect;
export type InsertUserCohort = z.infer<typeof insertUserCohortSchema>;
export type TtvEvent = typeof ttvEvents.$inferSelect;
export type InsertTtvEvent = z.infer<typeof insertTtvEventSchema>;
export type TtvMilestone = typeof ttvMilestones.$inferSelect;
export type InsertTtvMilestone = z.infer<typeof insertTtvMilestoneSchema>;

// ========== RECOMMENDATION RELEVANCE & VALIDATION SCHEMA ==========

// Ground-truth fixtures for recommendation validation
export const recommendationFixtures = pgTable("recommendation_fixtures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(), // Test case name (e.g. "Engineering Student - High GPA")
  description: text("description"),
  studentProfile: jsonb("student_profile").notNull(), // Mock student profile
  expectedScholarships: text("expected_scholarships").array().notNull(), // Array of scholarship IDs that should match
  topNThreshold: integer("top_n_threshold").default(5), // Expected to appear in top N results
  minimumScore: integer("minimum_score").default(70), // Minimum expected match score
  tags: text("tags").array(), // Test categorization (e.g. ["high-gpa", "engineering", "first-generation"])
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Recommendation interaction tracking for KPIs
export const recommendationInteractions = pgTable("recommendation_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  studentId: varchar("student_id").notNull().references(() => studentProfiles.id),
  scholarshipId: varchar("scholarship_id").notNull().references(() => scholarships.id),
  matchId: varchar("match_id").references(() => scholarshipMatches.id),
  interactionType: varchar("interaction_type").notNull(), // "view", "click_details", "save", "apply", "dismiss"
  recommendationRank: integer("recommendation_rank"), // Position in recommendation list (1-N)
  matchScore: integer("match_score"), // Score at time of interaction
  sessionId: varchar("session_id"), // For session-based analysis
  timestamp: timestamp("timestamp").defaultNow(),
  metadata: jsonb("metadata"), // Additional context (search filters, etc.)
}, (table) => [
  index("idx_rec_interactions_user_type").on(table.userId, table.interactionType),
  index("idx_rec_interactions_scholarship").on(table.scholarshipId),
  index("idx_rec_interactions_rank").on(table.recommendationRank),
  index("idx_rec_interactions_timestamp").on(table.timestamp),
]);

// Recommendation validation results 
export const recommendationValidations = pgTable("recommendation_validations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fixtureId: varchar("fixture_id").notNull().references(() => recommendationFixtures.id),
  algorithmVersion: varchar("algorithm_version").notNull(), // Version of scoring algorithm used
  totalScholarships: integer("total_scholarships").notNull(), // Number of scholarships evaluated
  topNResults: text("top_n_results").array().notNull(), // Array of scholarship IDs in ranked order
  topNScores: integer("top_n_scores").array().notNull(), // Corresponding scores
  expectedFound: integer("expected_found").notNull(), // How many expected scholarships were found
  expectedInTopN: integer("expected_in_top_n").notNull(), // How many expected scholarships in top N
  precisionAtN: decimal("precision_at_n", { precision: 5, scale: 4 }), // Precision @ N metric
  recallAtN: decimal("recall_at_n", { precision: 5, scale: 4 }), // Recall @ N metric
  meanAverageScore: decimal("mean_average_score", { precision: 5, scale: 2 }), // Average score of top N
  executionTimeMs: integer("execution_time_ms"), // Performance metric
  validatedAt: timestamp("validated_at").defaultNow(),
});

// KPI aggregation table for dashboard performance
export const recommendationKpis = pgTable("recommendation_kpis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dateKey: varchar("date_key").notNull(), // YYYY-MM-DD format
  totalRecommendations: integer("total_recommendations").notNull().default(0),
  totalClicks: integer("total_clicks").notNull().default(0),
  totalSaves: integer("total_saves").notNull().default(0),
  totalApplies: integer("total_applies").notNull().default(0),
  clickThroughRate: decimal("click_through_rate", { precision: 5, scale: 4 }), // CTR
  saveRate: decimal("save_rate", { precision: 5, scale: 4 }), // Save rate
  applyRate: decimal("apply_rate", { precision: 5, scale: 4 }), // Apply rate
  averageRecommendationRank: decimal("avg_recommendation_rank", { precision: 5, scale: 2 }), // Avg position clicked
  topNPrecision: decimal("top_n_precision", { precision: 5, scale: 4 }), // Precision from validation
  topNRecall: decimal("top_n_recall", { precision: 5, scale: 4 }), // Recall from validation
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_rec_kpis_date").on(table.dateKey),
  index("idx_rec_kpis_updated").on(table.updatedAt),
]);

// Enhanced match scoring factors for algorithm transparency
export const matchScoringFactors = pgTable("match_scoring_factors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar("match_id").notNull().references(() => scholarshipMatches.id),
  gpaWeight: decimal("gpa_weight", { precision: 5, scale: 4 }), // Weight contributed by GPA match
  majorWeight: decimal("major_weight", { precision: 5, scale: 4 }), // Weight from major alignment
  demographicsWeight: decimal("demographics_weight", { precision: 5, scale: 4 }), // Demographics factors
  geographyWeight: decimal("geography_weight", { precision: 5, scale: 4 }), // Location factors
  extracurricularsWeight: decimal("extracurriculars_weight", { precision: 5, scale: 4 }), // Activities match
  aiConfidenceScore: decimal("ai_confidence_score", { precision: 5, scale: 4 }), // GPT confidence
  algorithmVersion: varchar("algorithm_version").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations for new tables
export const recommendationFixturesRelations = relations(recommendationFixtures, ({ many }) => ({
  validations: many(recommendationValidations),
}));

export const recommendationInteractionsRelations = relations(recommendationInteractions, ({ one }) => ({
  user: one(users, {
    fields: [recommendationInteractions.userId],
    references: [users.id],
  }),
  student: one(studentProfiles, {
    fields: [recommendationInteractions.studentId],
    references: [studentProfiles.id],
  }),
  scholarship: one(scholarships, {
    fields: [recommendationInteractions.scholarshipId],
    references: [scholarships.id],
  }),
  match: one(scholarshipMatches, {
    fields: [recommendationInteractions.matchId],
    references: [scholarshipMatches.id],
  }),
}));

export const recommendationValidationsRelations = relations(recommendationValidations, ({ one }) => ({
  fixture: one(recommendationFixtures, {
    fields: [recommendationValidations.fixtureId],
    references: [recommendationFixtures.id],
  }),
}));

export const matchScoringFactorsRelations = relations(matchScoringFactors, ({ one }) => ({
  match: one(scholarshipMatches, {
    fields: [matchScoringFactors.matchId],
    references: [scholarshipMatches.id],
  }),
}));

// Actor type enum for business events
export const actorTypeEnum = pgEnum("actor_type", [
  "student",
  "provider",
  "system",
  "admin"
]);

// Business events table for KPI tracking and executive dashboard
export const businessEvents = pgTable("business_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").notNull(),
  app: varchar("app").notNull(), // student_pilot, provider_register, scholarship_api, etc.
  env: varchar("env").notNull(), // development, production
  eventName: varchar("event_name").notNull(), // student_signup, match_viewed, etc.
  ts: timestamp("ts").notNull().defaultNow(),
  actorType: actorTypeEnum("actor_type").notNull(),
  actorId: varchar("actor_id"), // User/student/provider ID
  orgId: varchar("org_id"), // For B2B provider events
  sessionId: varchar("session_id"), // Session tracking
  properties: jsonb("properties"), // Event-specific data
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_business_events_app").on(table.app),
  index("IDX_business_events_event_name").on(table.eventName),
  index("IDX_business_events_ts").on(table.ts),
  index("IDX_business_events_actor_id").on(table.actorId),
]);

// Insert schemas for new tables
export const insertRecommendationFixtureSchema = createInsertSchema(recommendationFixtures).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecommendationInteractionSchema = createInsertSchema(recommendationInteractions).omit({
  id: true,
  timestamp: true,
});

export const insertRecommendationValidationSchema = createInsertSchema(recommendationValidations).omit({
  id: true,
  validatedAt: true,
});

export const insertRecommendationKpiSchema = createInsertSchema(recommendationKpis).omit({
  id: true,
  updatedAt: true,
});

export const insertMatchScoringFactorsSchema = createInsertSchema(matchScoringFactors).omit({
  id: true,
  createdAt: true,
});

export const insertBusinessEventSchema = createInsertSchema(businessEvents).omit({
  id: true,
  createdAt: true,
});

// Types for new tables
export type RecommendationFixture = typeof recommendationFixtures.$inferSelect;
export type InsertRecommendationFixture = z.infer<typeof insertRecommendationFixtureSchema>;
export type RecommendationInteraction = typeof recommendationInteractions.$inferSelect;
export type InsertRecommendationInteraction = z.infer<typeof insertRecommendationInteractionSchema>;
export type RecommendationValidation = typeof recommendationValidations.$inferSelect;
export type InsertRecommendationValidation = z.infer<typeof insertRecommendationValidationSchema>;
export type RecommendationKpi = typeof recommendationKpis.$inferSelect;
export type InsertRecommendationKpi = z.infer<typeof insertRecommendationKpiSchema>;
export type MatchScoringFactors = typeof matchScoringFactors.$inferSelect;
export type InsertMatchScoringFactors = z.infer<typeof insertMatchScoringFactorsSchema>;
export type BusinessEvent = typeof businessEvents.$inferSelect;
export type InsertBusinessEvent = z.infer<typeof insertBusinessEventSchema>;
