import {
  users,
  studentProfiles,
  scholarships,
  applications,
  scholarshipMatches,
  documents,
  essays,
  type User,
  type UpsertUser,
  type StudentProfile,
  type InsertStudentProfile,
  type Scholarship,
  type InsertScholarship,
  type Application,
  type InsertApplication,
  type ScholarshipMatch,
  type Document,
  type InsertDocument,
  type Essay,
  type InsertEssay,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { withDatabaseErrorHandling } from "./errors/databaseErrors";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Student profile operations
  getStudentProfile(userId: string): Promise<StudentProfile | undefined>;
  createStudentProfile(profile: InsertStudentProfile): Promise<StudentProfile>;
  updateStudentProfile(userId: string, profile: Partial<InsertStudentProfile>): Promise<StudentProfile>;
  
  // Scholarship operations
  getScholarships(): Promise<Scholarship[]>;
  getScholarshipById(id: string): Promise<Scholarship | undefined>;
  createScholarship(scholarship: InsertScholarship): Promise<Scholarship>;
  
  // Application operations
  getApplicationsByStudent(studentId: string): Promise<Application[]>;
  getApplicationById(id: string): Promise<Application | undefined>;
  createApplication(application: InsertApplication): Promise<Application>;
  updateApplication(id: string, application: Partial<InsertApplication>): Promise<Application>;
  
  // Scholarship matching operations
  getScholarshipMatches(studentId: string): Promise<(ScholarshipMatch & { scholarship: Scholarship })[]>;
  createScholarshipMatch(match: Omit<ScholarshipMatch, 'id' | 'createdAt'>): Promise<ScholarshipMatch>;
  updateScholarshipMatch(id: string, match: Partial<ScholarshipMatch>): Promise<ScholarshipMatch>;
  
  // Document operations
  getDocumentsByStudent(studentId: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  deleteDocument(id: string): Promise<void>;
  
  // Essay operations
  getEssaysByStudent(studentId: string): Promise<Essay[]>;
  getEssayById(id: string): Promise<Essay | undefined>;
  createEssay(essay: InsertEssay): Promise<Essay>;
  updateEssay(id: string, essay: Partial<InsertEssay>): Promise<Essay>;
  deleteEssay(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth) - QA-011: Enhanced error handling
  async getUser(id: string): Promise<User | undefined> {
    return await withDatabaseErrorHandling(async () => {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    }, 'getUser');
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    return await withDatabaseErrorHandling(async () => {
      const [user] = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            updatedAt: new Date(),
          },
        })
        .returning();
      return user;
    }, 'upsertUser');
  }

  // Student profile operations - QA-011: Enhanced error handling
  async getStudentProfile(userId: string): Promise<StudentProfile | undefined> {
    return await withDatabaseErrorHandling(async () => {
      const [profile] = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, userId));
      return profile;
    }, 'getStudentProfile');
  }

  async createStudentProfile(profile: InsertStudentProfile): Promise<StudentProfile> {
    return await withDatabaseErrorHandling(async () => {
      const [newProfile] = await db
        .insert(studentProfiles)
        .values(profile)
        .returning();
      return newProfile;
    }, 'createStudentProfile');
  }

  async updateStudentProfile(userId: string, profile: Partial<InsertStudentProfile>): Promise<StudentProfile> {
    return await withDatabaseErrorHandling(async () => {
      const updateData = {
        ...profile,
        updatedAt: new Date(),
      };
      
      const [updatedProfile] = await db
        .update(studentProfiles)
        .set(updateData as any)
        .where(eq(studentProfiles.userId, userId))
        .returning();
      
      if (!updatedProfile) {
        throw new Error(`Student profile not found for user ${userId}`);
      }
      
      return updatedProfile;
    }, 'updateStudentProfile');
  }

  // Scholarship operations - QA-011: Enhanced error handling
  async getScholarships(): Promise<Scholarship[]> {
    return await withDatabaseErrorHandling(async () => {
      return await db
        .select()
        .from(scholarships)
        .where(eq(scholarships.isActive, true))
        .orderBy(desc(scholarships.deadline));
    }, 'getScholarships');
  }

  async getScholarshipById(id: string): Promise<Scholarship | undefined> {
    return await withDatabaseErrorHandling(async () => {
      const [scholarship] = await db
        .select()
        .from(scholarships)
        .where(eq(scholarships.id, id));
      return scholarship;
    }, 'getScholarshipById');
  }

  async createScholarship(scholarship: InsertScholarship): Promise<Scholarship> {
    return await withDatabaseErrorHandling(async () => {
      const [newScholarship] = await db
        .insert(scholarships)
        .values(scholarship)
        .returning();
      return newScholarship;
    }, 'createScholarship');
  }

  // Application operations - QA-011: Enhanced error handling
  async getApplicationsByStudent(studentId: string): Promise<Application[]> {
    return await withDatabaseErrorHandling(async () => {
      return await db
        .select()
        .from(applications)
        .where(eq(applications.studentId, studentId))
        .orderBy(desc(applications.createdAt));
    }, 'getApplicationsByStudent');
  }

  async getApplicationById(id: string): Promise<Application | undefined> {
    return await withDatabaseErrorHandling(async () => {
      const [application] = await db
        .select()
        .from(applications)
        .where(eq(applications.id, id));
      return application;
    }, 'getApplicationById');
  }

  async createApplication(application: InsertApplication): Promise<Application> {
    return await withDatabaseErrorHandling(async () => {
      const [newApplication] = await db
        .insert(applications)
        .values(application)
        .returning();
      return newApplication;
    }, 'createApplication');
  }

  async updateApplication(id: string, application: Partial<InsertApplication>): Promise<Application> {
    return await withDatabaseErrorHandling(async () => {
      const [updatedApplication] = await db
        .update(applications)
        .set({ ...application, updatedAt: new Date() })
        .where(eq(applications.id, id))
        .returning();
      
      if (!updatedApplication) {
        throw new Error(`Application not found with id ${id}`);
      }
      
      return updatedApplication;
    }, 'updateApplication');
  }

  // Scholarship matching operations - QA-011: Enhanced error handling
  async getScholarshipMatches(studentId: string): Promise<(ScholarshipMatch & { scholarship: Scholarship })[]> {
    return await withDatabaseErrorHandling(async () => {
      return await db
        .select({
          id: scholarshipMatches.id,
          studentId: scholarshipMatches.studentId,
          scholarshipId: scholarshipMatches.scholarshipId,
          matchScore: scholarshipMatches.matchScore,
          matchReason: scholarshipMatches.matchReason,
          chanceLevel: scholarshipMatches.chanceLevel,
          isBookmarked: scholarshipMatches.isBookmarked,
          isDismissed: scholarshipMatches.isDismissed,
          createdAt: scholarshipMatches.createdAt,
          scholarship: scholarships,
        })
        .from(scholarshipMatches)
        .innerJoin(scholarships, eq(scholarshipMatches.scholarshipId, scholarships.id))
        .where(
          and(
            eq(scholarshipMatches.studentId, studentId),
            eq(scholarshipMatches.isDismissed, false)
          )
        )
        .orderBy(desc(scholarshipMatches.matchScore));
    }, 'getScholarshipMatches');
  }

  async createScholarshipMatch(match: Omit<ScholarshipMatch, 'id' | 'createdAt'>): Promise<ScholarshipMatch> {
    return await withDatabaseErrorHandling(async () => {
      const [newMatch] = await db
        .insert(scholarshipMatches)
        .values(match)
        .returning();
      return newMatch;
    }, 'createScholarshipMatch');
  }

  async updateScholarshipMatch(id: string, match: Partial<ScholarshipMatch>): Promise<ScholarshipMatch> {
    return await withDatabaseErrorHandling(async () => {
      const [updatedMatch] = await db
        .update(scholarshipMatches)
        .set(match)
        .where(eq(scholarshipMatches.id, id))
        .returning();
      return updatedMatch;
    }, 'updateScholarshipMatch');
  }

  // Document operations - QA-011: Enhanced error handling
  async getDocumentsByStudent(studentId: string): Promise<Document[]> {
    return await withDatabaseErrorHandling(async () => {
      return await db
        .select()
        .from(documents)
        .where(eq(documents.studentId, studentId))
        .orderBy(desc(documents.uploadedAt));
    }, 'getDocumentsByStudent');
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    return await withDatabaseErrorHandling(async () => {
      const [newDocument] = await db
        .insert(documents)
        .values(document)
        .returning();
      return newDocument;
    }, 'createDocument');
  }

  async deleteDocument(id: string): Promise<void> {
    return await withDatabaseErrorHandling(async () => {
      await db.delete(documents).where(eq(documents.id, id));
    }, 'deleteDocument');
  }

  // Essay operations - QA-011: Enhanced error handling
  async getEssaysByStudent(studentId: string): Promise<Essay[]> {
    return await withDatabaseErrorHandling(async () => {
      return await db
        .select()
        .from(essays)
        .where(eq(essays.studentId, studentId))
        .orderBy(desc(essays.updatedAt));
    }, 'getEssaysByStudent');
  }

  async getEssayById(id: string): Promise<Essay | undefined> {
    return await withDatabaseErrorHandling(async () => {
      const [essay] = await db
        .select()
        .from(essays)
        .where(eq(essays.id, id));
      return essay;
    }, 'getEssayById');
  }

  async createEssay(essay: InsertEssay): Promise<Essay> {
    return await withDatabaseErrorHandling(async () => {
      const [newEssay] = await db
        .insert(essays)
        .values(essay)
        .returning();
      return newEssay;
    }, 'createEssay');
  }

  async updateEssay(id: string, essay: Partial<InsertEssay>): Promise<Essay> {
    return await withDatabaseErrorHandling(async () => {
      const [updatedEssay] = await db
        .update(essays)
        .set({ ...essay, updatedAt: new Date() })
        .where(eq(essays.id, id))
        .returning();
      
      if (!updatedEssay) {
        throw new Error(`Essay not found with id ${id}`);
      }
      
      return updatedEssay;
    }, 'updateEssay');
  }

  async deleteEssay(id: string): Promise<void> {
    return await withDatabaseErrorHandling(async () => {
      await db.delete(essays).where(eq(essays.id, id));
    }, 'deleteEssay');
  }
}

export const storage = new DatabaseStorage();
