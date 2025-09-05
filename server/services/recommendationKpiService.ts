import { db } from '../db';
import { 
  recommendationInteractions,
  recommendationKpis,
  scholarshipMatches,
  type InsertRecommendationKpi,
  type RecommendationInteraction
} from '@shared/schema';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';

interface DailyKpiMetrics {
  dateKey: string;
  totalRecommendations: number;
  totalClicks: number;
  totalSaves: number;
  totalApplies: number;
  clickThroughRate: number;
  saveRate: number;
  applyRate: number;
  averageRecommendationRank: number;
  topNPrecision?: number;
  topNRecall?: number;
}

interface InteractionSummary {
  totalInteractions: number;
  byType: { [key: string]: number };
  byRank: { [key: number]: number };
  averageRank: number;
  conversionFunnel: {
    views: number;
    clicks: number;
    saves: number;
    applies: number;
    clickToSave: number;
    clickToApply: number;
    saveToApply: number;
  };
}

/**
 * Service for tracking and analyzing recommendation KPIs
 */
export class RecommendationKpiService {
  
  /**
   * Record a recommendation interaction
   */
  async recordInteraction(
    userId: string,
    studentId: string,
    scholarshipId: string,
    interactionType: 'view' | 'click_details' | 'save' | 'apply' | 'dismiss',
    recommendationRank?: number,
    sessionId?: string,
    metadata?: any
  ): Promise<void> {
    try {
      // Find the match record to get the match score
      const [match] = await db
        .select()
        .from(scholarshipMatches)
        .where(
          and(
            eq(scholarshipMatches.studentId, studentId),
            eq(scholarshipMatches.scholarshipId, scholarshipId)
          )
        )
        .limit(1);

      const interaction = {
        userId,
        studentId,
        scholarshipId,
        matchId: match?.id,
        interactionType,
        recommendationRank: recommendationRank || null,
        matchScore: match?.matchScore || null,
        sessionId: sessionId || null,
        metadata: metadata || null
      };

      await db.insert(recommendationInteractions).values(interaction);
      
      console.log(`Recorded ${interactionType} interaction for user ${userId} on scholarship ${scholarshipId}`);
    } catch (error) {
      console.error('Error recording recommendation interaction:', error);
    }
  }

  /**
   * Calculate and store daily KPI metrics
   */
  async calculateDailyKpis(date: Date): Promise<DailyKpiMetrics> {
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    try {
      // Get interaction counts by type for the date
      const interactionCounts = await db
        .select({
          interactionType: recommendationInteractions.interactionType,
          count: sql<number>`count(*)`,
          avgRank: sql<number>`avg(recommendation_rank)::numeric(5,2)`
        })
        .from(recommendationInteractions)
        .where(
          and(
            gte(recommendationInteractions.timestamp, startOfDay),
            lte(recommendationInteractions.timestamp, endOfDay)
          )
        )
        .groupBy(recommendationInteractions.interactionType);

      // Initialize counters
      let totalRecommendations = 0;
      let totalClicks = 0;
      let totalSaves = 0;
      let totalApplies = 0;
      let totalRankSum = 0;
      let totalRankCount = 0;

      // Process interaction counts
      for (const row of interactionCounts) {
        const count = Number(row.count);
        const avgRank = Number(row.avgRank) || 0;
        
        switch (row.interactionType) {
          case 'view':
            totalRecommendations += count;
            break;
          case 'click_details':
            totalClicks += count;
            break;
          case 'save':
            totalSaves += count;
            break;
          case 'apply':
            totalApplies += count;
            break;
        }

        if (avgRank > 0) {
          totalRankSum += avgRank * count;
          totalRankCount += count;
        }
      }

      // Calculate rates
      const clickThroughRate = totalRecommendations > 0 ? totalClicks / totalRecommendations : 0;
      const saveRate = totalRecommendations > 0 ? totalSaves / totalRecommendations : 0;
      const applyRate = totalRecommendations > 0 ? totalApplies / totalRecommendations : 0;
      const averageRecommendationRank = totalRankCount > 0 ? totalRankSum / totalRankCount : 0;

      const metrics: DailyKpiMetrics = {
        dateKey,
        totalRecommendations,
        totalClicks,
        totalSaves,
        totalApplies,
        clickThroughRate,
        saveRate,
        applyRate,
        averageRecommendationRank
      };

      // Store or update KPI record
      await this.storeOrUpdateKpi(metrics);

      return metrics;
    } catch (error) {
      console.error('Error calculating daily KPIs:', error);
      throw error;
    }
  }

  /**
   * Store or update KPI metrics in database
   */
  private async storeOrUpdateKpi(metrics: DailyKpiMetrics): Promise<void> {
    const kpiData: InsertRecommendationKpi = {
      dateKey: metrics.dateKey,
      totalRecommendations: metrics.totalRecommendations,
      totalClicks: metrics.totalClicks,
      totalSaves: metrics.totalSaves,
      totalApplies: metrics.totalApplies,
      clickThroughRate: metrics.clickThroughRate.toString(),
      saveRate: metrics.saveRate.toString(),
      applyRate: metrics.applyRate.toString(),
      averageRecommendationRank: metrics.averageRecommendationRank.toString(),
      topNPrecision: metrics.topNPrecision?.toString() || null,
      topNRecall: metrics.topNRecall?.toString() || null
    };

    // Check if record exists
    const [existing] = await db
      .select()
      .from(recommendationKpis)
      .where(eq(recommendationKpis.dateKey, metrics.dateKey))
      .limit(1);

    if (existing) {
      // Update existing record
      await db
        .update(recommendationKpis)
        .set({ ...kpiData, updatedAt: new Date() })
        .where(eq(recommendationKpis.id, existing.id));
    } else {
      // Insert new record
      await db.insert(recommendationKpis).values(kpiData);
    }
  }

  /**
   * Get KPI trends over time
   */
  async getKpiTrends(
    startDate: Date,
    endDate: Date
  ): Promise<DailyKpiMetrics[]> {
    const startKey = startDate.toISOString().split('T')[0];
    const endKey = endDate.toISOString().split('T')[0];

    const records = await db
      .select()
      .from(recommendationKpis)
      .where(
        and(
          gte(recommendationKpis.dateKey, startKey),
          lte(recommendationKpis.dateKey, endKey)
        )
      )
      .orderBy(recommendationKpis.dateKey);

    return records.map(record => ({
      dateKey: record.dateKey,
      totalRecommendations: record.totalRecommendations,
      totalClicks: record.totalClicks,
      totalSaves: record.totalSaves,
      totalApplies: record.totalApplies,
      clickThroughRate: parseFloat(record.clickThroughRate || '0'),
      saveRate: parseFloat(record.saveRate || '0'),
      applyRate: parseFloat(record.applyRate || '0'),
      averageRecommendationRank: parseFloat(record.averageRecommendationRank || '0'),
      topNPrecision: record.topNPrecision ? parseFloat(record.topNPrecision) : undefined,
      topNRecall: record.topNRecall ? parseFloat(record.topNRecall) : undefined
    }));
  }

  /**
   * Get detailed interaction summary
   */
  async getInteractionSummary(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<InteractionSummary> {
    const whereClause = userId
      ? and(
          gte(recommendationInteractions.timestamp, startDate),
          lte(recommendationInteractions.timestamp, endDate),
          eq(recommendationInteractions.userId, userId)
        )
      : and(
          gte(recommendationInteractions.timestamp, startDate),
          lte(recommendationInteractions.timestamp, endDate)
        );

    // Get interactions
    const interactions = await db
      .select()
      .from(recommendationInteractions)
      .where(whereClause);

    const totalInteractions = interactions.length;

    // Group by type
    const byType: { [key: string]: number } = {};
    const byRank: { [key: number]: number } = {};
    let rankSum = 0;
    let rankCount = 0;

    for (const interaction of interactions) {
      const type = interaction.interactionType;
      byType[type] = (byType[type] || 0) + 1;

      if (interaction.recommendationRank) {
        const rank = interaction.recommendationRank;
        byRank[rank] = (byRank[rank] || 0) + 1;
        rankSum += rank;
        rankCount++;
      }
    }

    // Calculate conversion funnel
    const views = byType['view'] || 0;
    const clicks = byType['click_details'] || 0;
    const saves = byType['save'] || 0;
    const applies = byType['apply'] || 0;

    const conversionFunnel = {
      views,
      clicks,
      saves,
      applies,
      clickToSave: clicks > 0 ? saves / clicks : 0,
      clickToApply: clicks > 0 ? applies / clicks : 0,
      saveToApply: saves > 0 ? applies / saves : 0
    };

    return {
      totalInteractions,
      byType,
      byRank,
      averageRank: rankCount > 0 ? rankSum / rankCount : 0,
      conversionFunnel
    };
  }

  /**
   * Get top performing scholarships by interactions
   */
  async getTopScholarshipsByInteractions(
    limit: number = 10,
    days: number = 30
  ): Promise<Array<{
    scholarshipId: string;
    totalInteractions: number;
    totalClicks: number;
    totalSaves: number;
    totalApplies: number;
    averageRank: number;
  }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await db
      .select({
        scholarshipId: recommendationInteractions.scholarshipId,
        totalInteractions: sql<number>`count(*)`,
        totalClicks: sql<number>`count(case when interaction_type = 'click_details' then 1 end)`,
        totalSaves: sql<number>`count(case when interaction_type = 'save' then 1 end)`,
        totalApplies: sql<number>`count(case when interaction_type = 'apply' then 1 end)`,
        averageRank: sql<number>`avg(recommendation_rank)::numeric(5,2)`
      })
      .from(recommendationInteractions)
      .where(gte(recommendationInteractions.timestamp, startDate))
      .groupBy(recommendationInteractions.scholarshipId)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    return results.map(row => ({
      scholarshipId: row.scholarshipId,
      totalInteractions: Number(row.totalInteractions),
      totalClicks: Number(row.totalClicks),
      totalSaves: Number(row.totalSaves),
      totalApplies: Number(row.totalApplies),
      averageRank: Number(row.averageRank) || 0
    }));
  }

  /**
   * Calculate KPIs for the last N days (for dashboard)
   */
  async calculateRecentKpis(days: number = 7): Promise<DailyKpiMetrics[]> {
    const results: DailyKpiMetrics[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const metrics = await this.calculateDailyKpis(date);
      results.push(metrics);
    }

    return results;
  }

  /**
   * Get overall KPI summary
   */
  async getKpiSummary(days: number = 30): Promise<{
    totalRecommendations: number;
    totalClicks: number;
    totalSaves: number;
    totalApplies: number;
    overallCtr: number;
    overallSaveRate: number;
    overallApplyRate: number;
    averageRank: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [summary] = await db
      .select({
        totalInteractions: sql<number>`count(*)`,
        totalClicks: sql<number>`count(case when interaction_type = 'click_details' then 1 end)`,
        totalSaves: sql<number>`count(case when interaction_type = 'save' then 1 end)`,
        totalApplies: sql<number>`count(case when interaction_type = 'apply' then 1 end)`,
        totalViews: sql<number>`count(case when interaction_type = 'view' then 1 end)`,
        averageRank: sql<number>`avg(recommendation_rank)::numeric(5,2)`
      })
      .from(recommendationInteractions)
      .where(gte(recommendationInteractions.timestamp, startDate));

    const totalViews = Number(summary.totalViews);
    const totalClicks = Number(summary.totalClicks);
    const totalSaves = Number(summary.totalSaves);
    const totalApplies = Number(summary.totalApplies);

    return {
      totalRecommendations: totalViews,
      totalClicks,
      totalSaves,
      totalApplies,
      overallCtr: totalViews > 0 ? totalClicks / totalViews : 0,
      overallSaveRate: totalViews > 0 ? totalSaves / totalViews : 0,
      overallApplyRate: totalViews > 0 ? totalApplies / totalViews : 0,
      averageRank: Number(summary.averageRank) || 0
    };
  }
}

export const kpiService = new RecommendationKpiService();