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
