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
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
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
  }

  // Student profile operations
  async getStudentProfile(userId: string): Promise<StudentProfile | undefined> {
    const [profile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, userId));
    return profile;
  }

  async createStudentProfile(profile: InsertStudentProfile): Promise<StudentProfile> {
    const [newProfile] = await db
      .insert(studentProfiles)
      .values(profile)
      .returning();
    return newProfile;
  }

  async updateStudentProfile(userId: string, profile: Partial<InsertStudentProfile>): Promise<StudentProfile> {
    const [updatedProfile] = await db
      .update(studentProfiles)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(studentProfiles.userId, userId))
      .returning();
    
    if (!updatedProfile) {
      throw new Error(`Student profile not found for user ${userId}`);
    }
    
    return updatedProfile;
  }

  // Scholarship operations
  async getScholarships(): Promise<Scholarship[]> {
    return await db
      .select()
      .from(scholarships)
      .where(eq(scholarships.isActive, true))
      .orderBy(desc(scholarships.deadline));
  }

  async getScholarshipById(id: string): Promise<Scholarship | undefined> {
    const [scholarship] = await db
      .select()
      .from(scholarships)
      .where(eq(scholarships.id, id));
    return scholarship;
  }

  async createScholarship(scholarship: InsertScholarship): Promise<Scholarship> {
    const [newScholarship] = await db
      .insert(scholarships)
      .values(scholarship)
      .returning();
    return newScholarship;
  }

  // Application operations
  async getApplicationsByStudent(studentId: string): Promise<Application[]> {
    return await db
      .select()
      .from(applications)
      .where(eq(applications.studentId, studentId))
      .orderBy(desc(applications.createdAt));
  }

  async getApplicationById(id: string): Promise<Application | undefined> {
    const [application] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, id));
    return application;
  }

  async createApplication(application: InsertApplication): Promise<Application> {
    const [newApplication] = await db
      .insert(applications)
      .values(application)
      .returning();
    return newApplication;
  }

  async updateApplication(id: string, application: Partial<InsertApplication>): Promise<Application> {
    const [updatedApplication] = await db
      .update(applications)
      .set({ ...application, updatedAt: new Date() })
      .where(eq(applications.id, id))
      .returning();
    
    if (!updatedApplication) {
      throw new Error(`Application not found with id ${id}`);
    }
    
    return updatedApplication;
  }

  // Scholarship matching operations
  async getScholarshipMatches(studentId: string): Promise<(ScholarshipMatch & { scholarship: Scholarship })[]> {
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
  }

  async createScholarshipMatch(match: Omit<ScholarshipMatch, 'id' | 'createdAt'>): Promise<ScholarshipMatch> {
    const [newMatch] = await db
      .insert(scholarshipMatches)
      .values(match)
      .returning();
    return newMatch;
  }

  async updateScholarshipMatch(id: string, match: Partial<ScholarshipMatch>): Promise<ScholarshipMatch> {
    const [updatedMatch] = await db
      .update(scholarshipMatches)
      .set(match)
      .where(eq(scholarshipMatches.id, id))
      .returning();
    return updatedMatch;
  }

  // Document operations
  async getDocumentsByStudent(studentId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.studentId, studentId))
      .orderBy(desc(documents.uploadedAt));
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db
      .insert(documents)
      .values(document)
      .returning();
    return newDocument;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // Essay operations
  async getEssaysByStudent(studentId: string): Promise<Essay[]> {
    return await db
      .select()
      .from(essays)
      .where(eq(essays.studentId, studentId))
      .orderBy(desc(essays.updatedAt));
  }

  async getEssayById(id: string): Promise<Essay | undefined> {
    const [essay] = await db
      .select()
      .from(essays)
      .where(eq(essays.id, id));
    return essay;
  }

  async createEssay(essay: InsertEssay): Promise<Essay> {
    const [newEssay] = await db
      .insert(essays)
      .values(essay)
      .returning();
    return newEssay;
  }

  async updateEssay(id: string, essay: Partial<InsertEssay>): Promise<Essay> {
    const [updatedEssay] = await db
      .update(essays)
      .set({ ...essay, updatedAt: new Date() })
      .where(eq(essays.id, id))
      .returning();
    
    if (!updatedEssay) {
      throw new Error(`Essay not found with id ${id}`);
    }
    
    return updatedEssay;
  }

  async deleteEssay(id: string): Promise<void> {
    await db.delete(essays).where(eq(essays.id, id));
  }
}

export const storage = new DatabaseStorage();
