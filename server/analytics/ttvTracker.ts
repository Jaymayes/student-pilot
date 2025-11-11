import { db } from "../db";
import { 
  ttvEvents, 
  ttvMilestones, 
  userCohorts,
  cohorts,
  users,
  studentProfiles,
  scholarshipMatches,
  applications,
  essays,
  usageEvents,
  purchases,
  type InsertTtvEvent,
  type TtvEvent,
  type TtvMilestone
} from "@shared/schema";
import { eq, and, sql, desc, asc, isNull, count, avg } from "drizzle-orm";

export type TtvEventType = 
  | "signup"
  | "profile_complete" 
  | "first_match_generated"
  | "first_match_viewed"
  | "first_scholarship_saved"
  | "first_application_started"
  | "first_essay_assistance"
  | "first_ai_usage"
  | "first_credit_purchase"
  | "first_application_submitted";

interface TtvEventContext {
  sessionId?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

export class TtvTracker {
  
  /**
   * Track a TTV event for a user
   */
  async trackEvent(
    userId: string, 
    eventType: TtvEventType, 
    context: TtvEventContext = {}
  ): Promise<void> {
    try {
      // Get user's cohort if they're in one
      const userCohort = await db
        .select({ cohortId: userCohorts.cohortId })
        .from(userCohorts)
        .where(and(
          eq(userCohorts.userId, userId),
          eq(userCohorts.isActive, true)
        ))
        .limit(1);

      const cohortId = userCohort[0]?.cohortId || null;

      // Insert the event
      await db.insert(ttvEvents).values({
        userId,
        cohortId,
        eventType,
        sessionId: context.sessionId,
        correlationId: context.correlationId,
        metadata: context.metadata,
      });

      // Update milestone tracking
      await this.updateMilestone(userId, eventType, cohortId);

      console.log(`TTV Event tracked: ${eventType} for user ${userId}`);
    } catch (error) {
      console.error(`Failed to track TTV event ${eventType} for user ${userId}:`, error);
      // Don't throw - analytics shouldn't break user flow
    }
  }

  /**
   * Update user's TTV milestone record
   */
  private async updateMilestone(
    userId: string, 
    eventType: TtvEventType, 
    cohortId: string | null
  ): Promise<void> {
    const now = new Date();

    // Get existing milestone or create new one
    let milestone = await db
      .select()
      .from(ttvMilestones)
      .where(eq(ttvMilestones.userId, userId))
      .limit(1);

    if (milestone.length === 0) {
      // Create new milestone record
      await db.insert(ttvMilestones).values({
        userId,
        cohortId,
        signupAt: eventType === 'signup' ? now : null,
        profileCompleteAt: eventType === 'profile_complete' ? now : null,
        firstMatchAt: eventType === 'first_match_generated' ? now : null,
        firstMatchViewAt: eventType === 'first_match_viewed' ? now : null,
        firstScholarshipSavedAt: eventType === 'first_scholarship_saved' ? now : null,
        firstApplicationAt: eventType === 'first_application_started' ? now : null,
        firstEssayAt: eventType === 'first_essay_assistance' ? now : null,
        firstAiUsageAt: eventType === 'first_ai_usage' ? now : null,
        firstPurchaseAt: eventType === 'first_credit_purchase' ? now : null,
        firstSubmissionAt: eventType === 'first_application_submitted' ? now : null,
      });
    } else {
      // Update existing milestone - only if this milestone hasn't been reached yet
      const existing = milestone[0];
      const updates: Partial<TtvMilestone> = { updatedAt: now };

      // Only update if this is the first time hitting this milestone
      if (eventType === 'signup' && !existing.signupAt) {
        updates.signupAt = now;
      }
      if (eventType === 'profile_complete' && !existing.profileCompleteAt) {
        updates.profileCompleteAt = now;
        // Calculate time to profile complete
        if (existing.signupAt) {
          updates.timeToProfileComplete = Math.floor((now.getTime() - existing.signupAt.getTime()) / 1000);
        }
      }
      if (eventType === 'first_match_generated' && !existing.firstMatchAt) {
        updates.firstMatchAt = now;
        // Calculate time to first match
        if (existing.signupAt) {
          updates.timeToFirstMatch = Math.floor((now.getTime() - existing.signupAt.getTime()) / 1000);
        }
        // This could be considered "first value"
        if (!existing.timeToFirstValue && existing.signupAt) {
          updates.timeToFirstValue = Math.floor((now.getTime() - existing.signupAt.getTime()) / 1000);
        }
      }
      if (eventType === 'first_match_viewed' && !existing.firstMatchViewAt) {
        updates.firstMatchViewAt = now;
      }
      if (eventType === 'first_scholarship_saved' && !existing.firstScholarshipSavedAt) {
        updates.firstScholarshipSavedAt = now;
      }
      if (eventType === 'first_application_started' && !existing.firstApplicationAt) {
        updates.firstApplicationAt = now;
        // This could be considered "first value" if no match yet
        if (!existing.timeToFirstValue && existing.signupAt) {
          updates.timeToFirstValue = Math.floor((now.getTime() - existing.signupAt.getTime()) / 1000);
        }
      }
      if (eventType === 'first_essay_assistance' && !existing.firstEssayAt) {
        updates.firstEssayAt = now;
      }
      if (eventType === 'first_ai_usage' && !existing.firstAiUsageAt) {
        updates.firstAiUsageAt = now;
      }
      if (eventType === 'first_credit_purchase' && !existing.firstPurchaseAt) {
        updates.firstPurchaseAt = now;
        // Calculate time to monetization
        if (existing.signupAt) {
          updates.timeToMonetization = Math.floor((now.getTime() - existing.signupAt.getTime()) / 1000);
        }
      }
      if (eventType === 'first_application_submitted' && !existing.firstSubmissionAt) {
        updates.firstSubmissionAt = now;
      }

      if (Object.keys(updates).length > 1) { // More than just updatedAt
        await db
          .update(ttvMilestones)
          .set(updates)
          .where(eq(ttvMilestones.userId, userId));
      }
    }
  }

  /**
   * Auto-track signup event when user is created
   */
  async trackSignup(userId: string, context: TtvEventContext = {}): Promise<void> {
    await this.trackEvent(userId, "signup", context);
  }

  /**
   * Auto-detect and track profile completion
   */
  async checkAndTrackProfileCompletion(userId: string): Promise<void> {
    try {
      // Get user's profile completion percentage
      const profile = await db
        .select({ completionPercentage: studentProfiles.completionPercentage })
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, userId))
        .limit(1);

      const completionPercentage = profile[0]?.completionPercentage || 0;

      // Update milestone with max completion percentage
      await db
        .update(ttvMilestones)
        .set({ 
          maxProfileCompletion: sql`GREATEST(COALESCE(${ttvMilestones.maxProfileCompletion}, 0), ${completionPercentage})`,
          updatedAt: new Date()
        })
        .where(eq(ttvMilestones.userId, userId));

      // Track completion event if profile is >= 80% complete
      if (completionPercentage >= 80) {
        const existingMilestone = await db
          .select({ profileCompleteAt: ttvMilestones.profileCompleteAt })
          .from(ttvMilestones)
          .where(eq(ttvMilestones.userId, userId))
          .limit(1);

        if (!existingMilestone[0]?.profileCompleteAt) {
          await this.trackEvent(userId, "profile_complete", {
            metadata: { completionPercentage }
          });
        }
      }
    } catch (error) {
      console.error(`Failed to check profile completion for user ${userId}:`, error);
    }
  }

  /**
   * Auto-detect and track first match generation
   */
  async checkAndTrackFirstMatch(userId: string): Promise<void> {
    try {
      // Check if user has any matches
      const matches = await db
        .select({ id: scholarshipMatches.id })
        .from(scholarshipMatches)
        .innerJoin(studentProfiles, eq(scholarshipMatches.studentId, studentProfiles.id))
        .where(eq(studentProfiles.userId, userId))
        .limit(1);

      if (matches.length > 0) {
        const existingMilestone = await db
          .select({ firstMatchAt: ttvMilestones.firstMatchAt })
          .from(ttvMilestones)
          .where(eq(ttvMilestones.userId, userId))
          .limit(1);

        if (!existingMilestone[0]?.firstMatchAt) {
          await this.trackEvent(userId, "first_match_generated");
        }
      }
    } catch (error) {
      console.error(`Failed to check first match for user ${userId}:`, error);
    }
  }

  /**
   * Auto-detect and track first scholarship saved
   */
  async checkAndTrackFirstScholarshipSaved(userId: string): Promise<void> {
    try {
      // Check if user has any bookmarked scholarships
      const bookmarked = await db
        .select({ id: scholarshipMatches.id })
        .from(scholarshipMatches)
        .innerJoin(studentProfiles, eq(scholarshipMatches.studentId, studentProfiles.id))
        .where(and(
          eq(studentProfiles.userId, userId),
          eq(scholarshipMatches.isBookmarked, true)
        ))
        .limit(1);

      if (bookmarked.length > 0) {
        const existingMilestone = await db
          .select({ firstScholarshipSavedAt: ttvMilestones.firstScholarshipSavedAt })
          .from(ttvMilestones)
          .where(eq(ttvMilestones.userId, userId))
          .limit(1);

        if (!existingMilestone[0]?.firstScholarshipSavedAt) {
          await this.trackEvent(userId, "first_scholarship_saved");
        }
      }
    } catch (error) {
      console.error(`Failed to check first scholarship saved for user ${userId}:`, error);
    }
  }

  /**
   * Auto-detect and track first application
   */
  async checkAndTrackFirstApplication(userId: string): Promise<void> {
    try {
      // Check if user has any applications
      const apps = await db
        .select({ id: applications.id })
        .from(applications)
        .innerJoin(studentProfiles, eq(applications.studentId, studentProfiles.id))
        .where(eq(studentProfiles.userId, userId))
        .limit(1);

      if (apps.length > 0) {
        const existingMilestone = await db
          .select({ firstApplicationAt: ttvMilestones.firstApplicationAt })
          .from(ttvMilestones)
          .where(eq(ttvMilestones.userId, userId))
          .limit(1);

        if (!existingMilestone[0]?.firstApplicationAt) {
          await this.trackEvent(userId, "first_application_started");
        }
      }
    } catch (error) {
      console.error(`Failed to check first application for user ${userId}:`, error);
    }
  }

  /**
   * Auto-detect and track first AI usage
   */
  async checkAndTrackFirstAiUsage(userId: string): Promise<void> {
    try {
      // Check if user has any AI usage events
      const usage = await db
        .select({ id: usageEvents.id })
        .from(usageEvents)
        .where(eq(usageEvents.userId, userId))
        .limit(1);

      if (usage.length > 0) {
        const existingMilestone = await db
          .select({ firstAiUsageAt: ttvMilestones.firstAiUsageAt })
          .from(ttvMilestones)
          .where(eq(ttvMilestones.userId, userId))
          .limit(1);

        if (!existingMilestone[0]?.firstAiUsageAt) {
          await this.trackEvent(userId, "first_ai_usage");
        }
      }
    } catch (error) {
      console.error(`Failed to check first AI usage for user ${userId}:`, error);
    }
  }

  /**
   * Auto-detect and track first purchase
   */
  async checkAndTrackFirstPurchase(userId: string): Promise<void> {
    try {
      // Check if user has any successful purchases
      const purchase = await db
        .select({ id: purchases.id })
        .from(purchases)
        .where(and(
          eq(purchases.userId, userId),
          eq(purchases.status, "fulfilled")
        ))
        .limit(1);

      if (purchase.length > 0) {
        const existingMilestone = await db
          .select({ firstPurchaseAt: ttvMilestones.firstPurchaseAt })
          .from(ttvMilestones)
          .where(eq(ttvMilestones.userId, userId))
          .limit(1);

        if (!existingMilestone[0]?.firstPurchaseAt) {
          await this.trackEvent(userId, "first_credit_purchase");
        }
      }
    } catch (error) {
      console.error(`Failed to check first purchase for user ${userId}:`, error);
    }
  }

  /**
   * Get TTV metrics for a user
   */
  async getUserTtvMetrics(userId: string): Promise<TtvMilestone | null> {
    try {
      const milestone = await db
        .select()
        .from(ttvMilestones)
        .where(eq(ttvMilestones.userId, userId))
        .limit(1);

      return milestone[0] || null;
    } catch (error) {
      console.error(`Failed to get TTV metrics for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get cohort TTV analytics
   */
  async getCohortAnalytics(cohortId: string): Promise<{
    userCount: number;
    avgTimeToProfileComplete: number | null;
    avgTimeToFirstMatch: number | null;
    avgTimeToFirstValue: number | null;
    avgTimeToMonetization: number | null;
    conversionRates: {
      profileComplete: number;
      firstMatch: number;
      firstApplication: number;
      firstPurchase: number;
    };
  }> {
    try {
      // Get basic stats
      const basicStats = await db
        .select({
          userCount: count(),
          avgTimeToProfileComplete: avg(ttvMilestones.timeToProfileComplete),
          avgTimeToFirstMatch: avg(ttvMilestones.timeToFirstMatch),
          avgTimeToFirstValue: avg(ttvMilestones.timeToFirstValue),
          avgTimeToMonetization: avg(ttvMilestones.timeToMonetization),
        })
        .from(ttvMilestones)
        .where(eq(ttvMilestones.cohortId, cohortId));

      // Get conversion rates
      const conversionStats = await db
        .select({
          profileCompleteCount: sql<number>`COUNT(CASE WHEN ${ttvMilestones.profileCompleteAt} IS NOT NULL THEN 1 END)`,
          firstMatchCount: sql<number>`COUNT(CASE WHEN ${ttvMilestones.firstMatchAt} IS NOT NULL THEN 1 END)`,
          firstApplicationCount: sql<number>`COUNT(CASE WHEN ${ttvMilestones.firstApplicationAt} IS NOT NULL THEN 1 END)`,
          firstPurchaseCount: sql<number>`COUNT(CASE WHEN ${ttvMilestones.firstPurchaseAt} IS NOT NULL THEN 1 END)`,
        })
        .from(ttvMilestones)
        .where(eq(ttvMilestones.cohortId, cohortId));

      const stats = basicStats[0];
      const conversions = conversionStats[0];
      const userCount = stats.userCount || 0;

      return {
        userCount,
        avgTimeToProfileComplete: stats.avgTimeToProfileComplete ? Number(stats.avgTimeToProfileComplete) : null,
        avgTimeToFirstMatch: stats.avgTimeToFirstMatch ? Number(stats.avgTimeToFirstMatch) : null,
        avgTimeToFirstValue: stats.avgTimeToFirstValue ? Number(stats.avgTimeToFirstValue) : null,
        avgTimeToMonetization: stats.avgTimeToMonetization ? Number(stats.avgTimeToMonetization) : null,
        conversionRates: {
          profileComplete: userCount > 0 ? (conversions.profileCompleteCount / userCount) * 100 : 0,
          firstMatch: userCount > 0 ? (conversions.firstMatchCount / userCount) * 100 : 0,
          firstApplication: userCount > 0 ? (conversions.firstApplicationCount / userCount) * 100 : 0,
          firstPurchase: userCount > 0 ? (conversions.firstPurchaseCount / userCount) * 100 : 0,
        },
      };
    } catch (error) {
      console.error(`Failed to get cohort analytics for ${cohortId}:`, error);
      return {
        userCount: 0,
        avgTimeToProfileComplete: null,
        avgTimeToFirstMatch: null,
        avgTimeToFirstValue: null,
        avgTimeToMonetization: null,
        conversionRates: {
          profileComplete: 0,
          firstMatch: 0,
          firstApplication: 0,
          firstPurchase: 0,
        },
      };
    }
  }

  /**
   * Get raw TTV metrics for median/P95 calculation
   */
  async getCohortTtvMetrics(cohortId: string): Promise<number[]> {
    try {
      const metrics = await db
        .select({
          timeToFirstValue: ttvMilestones.timeToFirstValue
        })
        .from(ttvMilestones)
        .where(and(
          eq(ttvMilestones.cohortId, cohortId),
          sql`${ttvMilestones.timeToFirstValue} IS NOT NULL`
        ));

      return metrics
        .map(m => m.timeToFirstValue)
        .filter((time): time is number => time !== null);
    } catch (error) {
      console.error(`Failed to get TTV metrics for cohort ${cohortId}:`, error);
      return [];
    }
  }
}

// Export singleton instance
export const ttvTracker = new TtvTracker();