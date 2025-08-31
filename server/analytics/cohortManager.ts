import { db } from "../db";
import { 
  cohorts, 
  userCohorts, 
  users,
  ttvMilestones,
  type InsertCohort,
  type Cohort,
  type UserCohort
} from "@shared/schema";
import { eq, and, sql, desc, asc, count } from "drizzle-orm";
import { ttvTracker } from "./ttvTracker";

export class CohortManager {
  
  /**
   * Create a new cohort
   */
  async createCohort(cohortData: InsertCohort): Promise<Cohort> {
    try {
      const [cohort] = await db
        .insert(cohorts)
        .values(cohortData)
        .returning();
      
      console.log(`Created cohort: ${cohort.name} with target size ${cohort.targetSize}`);
      return cohort;
    } catch (error) {
      console.error('Failed to create cohort:', error);
      throw new Error('Failed to create cohort');
    }
  }

  /**
   * Add user to cohort
   */
  async addUserToCohort(userId: string, cohortId: string): Promise<UserCohort> {
    try {
      // Check if user is already in this cohort
      const existing = await db
        .select()
        .from(userCohorts)
        .where(and(
          eq(userCohorts.userId, userId),
          eq(userCohorts.cohortId, cohortId),
          eq(userCohorts.isActive, true)
        ))
        .limit(1);

      if (existing.length > 0) {
        return existing[0];
      }

      // Check if cohort is at capacity
      const cohort = await db
        .select()
        .from(cohorts)
        .where(eq(cohorts.id, cohortId))
        .limit(1);

      if (!cohort[0]) {
        throw new Error('Cohort not found');
      }

      if (cohort[0].currentSize >= cohort[0].targetSize) {
        throw new Error('Cohort is at capacity');
      }

      // Add user to cohort
      const [userCohort] = await db
        .insert(userCohorts)
        .values({
          userId,
          cohortId
        })
        .returning();

      // Update cohort size
      await db
        .update(cohorts)
        .set({ 
          currentSize: sql`${cohorts.currentSize} + 1`,
          activatedAt: cohort[0].activatedAt || new Date() // Set activation time on first user
        })
        .where(eq(cohorts.id, cohortId));

      // Update user's TTV milestone to include cohort
      await db
        .update(ttvMilestones)
        .set({ cohortId })
        .where(eq(ttvMilestones.userId, userId));

      console.log(`Added user ${userId} to cohort ${cohortId}`);
      return userCohort;
    } catch (error) {
      console.error('Failed to add user to cohort:', error);
      throw error;
    }
  }

  /**
   * Remove user from cohort
   */
  async removeUserFromCohort(userId: string, cohortId: string): Promise<void> {
    try {
      // Mark user cohort as inactive
      await db
        .update(userCohorts)
        .set({ isActive: false })
        .where(and(
          eq(userCohorts.userId, userId),
          eq(userCohorts.cohortId, cohortId)
        ));

      // Update cohort size
      await db
        .update(cohorts)
        .set({ currentSize: sql`${cohorts.currentSize} - 1` })
        .where(eq(cohorts.id, cohortId));

      // Remove cohort from user's TTV milestone
      await db
        .update(ttvMilestones)
        .set({ cohortId: null })
        .where(eq(ttvMilestones.userId, userId));

      console.log(`Removed user ${userId} from cohort ${cohortId}`);
    } catch (error) {
      console.error('Failed to remove user from cohort:', error);
      throw new Error('Failed to remove user from cohort');
    }
  }

  /**
   * Get active cohorts
   */
  async getActiveCohorts(): Promise<Cohort[]> {
    try {
      const activeCohorts = await db
        .select()
        .from(cohorts)
        .where(eq(cohorts.isActive, true))
        .orderBy(desc(cohorts.createdAt));

      return activeCohorts;
    } catch (error) {
      console.error('Failed to get active cohorts:', error);
      return [];
    }
  }

  /**
   * Get cohort by ID with stats
   */
  async getCohortWithStats(cohortId: string): Promise<{
    cohort: Cohort;
    userCount: number;
    analytics: any;
  } | null> {
    try {
      const [cohort] = await db
        .select()
        .from(cohorts)
        .where(eq(cohorts.id, cohortId))
        .limit(1);

      if (!cohort) {
        return null;
      }

      const userCount = await db
        .select({ count: count() })
        .from(userCohorts)
        .where(and(
          eq(userCohorts.cohortId, cohortId),
          eq(userCohorts.isActive, true)
        ));

      const analytics = await ttvTracker.getCohortAnalytics(cohortId);

      return {
        cohort,
        userCount: userCount[0].count,
        analytics
      };
    } catch (error) {
      console.error('Failed to get cohort with stats:', error);
      return null;
    }
  }

  /**
   * Auto-assign new users to available cohorts
   */
  async autoAssignUserToCohort(userId: string): Promise<string | null> {
    try {
      // Find active cohorts with space available
      const availableCohorts = await db
        .select()
        .from(cohorts)
        .where(and(
          eq(cohorts.isActive, true),
          sql`${cohorts.currentSize} < ${cohorts.targetSize}`
        ))
        .orderBy(asc(cohorts.createdAt)) // Assign to oldest cohort first
        .limit(1);

      if (availableCohorts.length === 0) {
        console.log(`No available cohorts for user ${userId}`);
        return null;
      }

      const cohort = availableCohorts[0];
      await this.addUserToCohort(userId, cohort.id);
      
      console.log(`Auto-assigned user ${userId} to cohort ${cohort.name}`);
      return cohort.id;
    } catch (error) {
      console.error('Failed to auto-assign user to cohort:', error);
      return null;
    }
  }

  /**
   * Create and launch 100-user cohort for TTV measurement
   */
  async launch100UserCohort(name?: string): Promise<Cohort> {
    const cohortName = name || `TTV-Cohort-${new Date().toISOString().split('T')[0]}`;
    
    try {
      const cohort = await this.createCohort({
        name: cohortName,
        description: "100-user cohort for Time-to-Value measurement and analytics",
        targetSize: 100,
        isActive: true
      });

      console.log(`🚀 Launched 100-user TTV cohort: ${cohort.name} (ID: ${cohort.id})`);
      
      return cohort;
    } catch (error) {
      console.error('Failed to launch 100-user cohort:', error);
      throw new Error('Failed to launch 100-user cohort');
    }
  }

  /**
   * Get users in a cohort
   */
  async getCohortUsers(cohortId: string, limit = 50, offset = 0): Promise<{
    users: Array<{
      userId: string;
      email: string;
      joinedAt: Date;
      ttvMetrics: any;
    }>;
    total: number;
  }> {
    try {
      // Get users in cohort
      const cohortUsers = await db
        .select({
          userId: userCohorts.userId,
          email: users.email,
          joinedAt: userCohorts.joinedAt,
        })
        .from(userCohorts)
        .innerJoin(users, eq(userCohorts.userId, users.id))
        .where(and(
          eq(userCohorts.cohortId, cohortId),
          eq(userCohorts.isActive, true)
        ))
        .orderBy(asc(userCohorts.joinedAt))
        .limit(limit)
        .offset(offset);

      // Get TTV metrics for each user
      const usersWithMetrics = await Promise.all(
        cohortUsers.map(async (user) => {
          const ttvMetrics = await ttvTracker.getUserTtvMetrics(user.userId);
          return {
            ...user,
            ttvMetrics
          };
        })
      );

      // Get total count
      const totalCount = await db
        .select({ count: count() })
        .from(userCohorts)
        .where(and(
          eq(userCohorts.cohortId, cohortId),
          eq(userCohorts.isActive, true)
        ));

      return {
        users: usersWithMetrics,
        total: totalCount[0].count
      };
    } catch (error) {
      console.error('Failed to get cohort users:', error);
      return { users: [], total: 0 };
    }
  }

  /**
   * Mark cohort as completed
   */
  async completeCohort(cohortId: string): Promise<void> {
    try {
      await db
        .update(cohorts)
        .set({ 
          isActive: false,
          completedAt: new Date()
        })
        .where(eq(cohorts.id, cohortId));

      console.log(`Marked cohort ${cohortId} as completed`);
    } catch (error) {
      console.error('Failed to complete cohort:', error);
      throw new Error('Failed to complete cohort');
    }
  }
}

// Export singleton instance
export const cohortManager = new CohortManager();