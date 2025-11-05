import { db } from "../db";
import { users, studentProfiles, documents, businessEvents } from "@shared/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

export interface CohortMetrics {
  cohortWeek: string;
  cohortStartDate: string;
  cohortEndDate: string;
  totalUsers: number;
  activatedUsers: number;
  activationRate: number;
  medianTimeToActivation: number | null;
  p25TimeToActivation: number | null;
  p75TimeToActivation: number | null;
  documentTypeDistribution: Record<string, number>;
  activationsByDay: number[];
}

export interface WeeklyCohortReport {
  reportDate: string;
  reportWeek: string;
  summary: {
    totalCohorts: number;
    overallActivationRate: number;
    bestPerformingCohort: string;
    worstPerformingCohort: string;
  };
  cohorts: CohortMetrics[];
  trends: {
    activationRateTrend: 'improving' | 'declining' | 'stable';
    medianActivationTimeTrend: 'improving' | 'declining' | 'stable';
  };
}

class CohortReportingService {
  /**
   * Get the start of the week (Monday) for a given date
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Get cohort week label (e.g., "2025-W45")
   */
  private getWeekLabel(date: Date): string {
    const weekStart = this.getWeekStart(date);
    const year = weekStart.getFullYear();
    const weekNum = this.getWeekNumber(weekStart);
    return `${year}-W${weekNum.toString().padStart(2, '0')}`;
  }

  /**
   * Get ISO week number
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Calculate time difference in hours
   */
  private hoursBetween(date1: Date, date2: Date): number {
    return Math.abs(date2.getTime() - date1.getTime()) / (1000 * 60 * 60);
  }

  /**
   * Get cohort metrics for a specific week
   */
  async getCohortMetrics(weekStart: Date): Promise<CohortMetrics> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Get all users who joined in this cohort week
    const cohortUsers = await db
      .select({
        userId: users.id,
        userCreatedAt: users.createdAt,
        profileId: studentProfiles.id,
      })
      .from(users)
      .leftJoin(studentProfiles, eq(users.id, studentProfiles.userId))
      .where(
        and(
          gte(users.createdAt, weekStart),
          lte(users.createdAt, weekEnd)
        )
      );

    const totalUsers = cohortUsers.length;

    if (totalUsers === 0) {
      return {
        cohortWeek: this.getWeekLabel(weekStart),
        cohortStartDate: weekStart.toISOString().split('T')[0],
        cohortEndDate: weekEnd.toISOString().split('T')[0],
        totalUsers: 0,
        activatedUsers: 0,
        activationRate: 0,
        medianTimeToActivation: null,
        p25TimeToActivation: null,
        p75TimeToActivation: null,
        documentTypeDistribution: {},
        activationsByDay: [0, 0, 0, 0, 0, 0, 0],
      };
    }

    // Get first document upload events for these users
    const activationEvents = await db
      .select({
        userId: businessEvents.actorId,
        eventTime: businessEvents.createdAt,
        documentType: sql<string>`${businessEvents.properties}->>'documentType'`,
      })
      .from(businessEvents)
      .where(
        and(
          eq(businessEvents.eventName, 'first_document_upload'),
          sql`${businessEvents.actorId} IN (${sql.join(cohortUsers.map(u => sql.raw(`'${u.userId}'`)), sql`, `)})`
        )
      );

    const activatedUsers = activationEvents.length;
    const activationRate = totalUsers > 0 ? (activatedUsers / totalUsers) * 100 : 0;

    // Calculate time-to-activation for activated users
    const timeToActivations: number[] = [];
    const documentTypes: Record<string, number> = {};
    const activationsByDay: number[] = [0, 0, 0, 0, 0, 0, 0];

    for (const event of activationEvents) {
      const user = cohortUsers.find(u => u.userId === event.userId);
      if (user && user.userCreatedAt && event.eventTime) {
        const hours = this.hoursBetween(user.userCreatedAt, event.eventTime);
        timeToActivations.push(hours);

        // Track document type
        const docType = event.documentType || 'unknown';
        documentTypes[docType] = (documentTypes[docType] || 0) + 1;

        // Track activations by day of week
        const dayOfWeek = event.eventTime.getDay();
        activationsByDay[dayOfWeek]++;
      }
    }

    // Calculate percentiles
    timeToActivations.sort((a, b) => a - b);
    const medianTimeToActivation = timeToActivations.length > 0
      ? timeToActivations[Math.floor(timeToActivations.length / 2)]
      : null;
    const p25TimeToActivation = timeToActivations.length > 0
      ? timeToActivations[Math.floor(timeToActivations.length * 0.25)]
      : null;
    const p75TimeToActivation = timeToActivations.length > 0
      ? timeToActivations[Math.floor(timeToActivations.length * 0.75)]
      : null;

    return {
      cohortWeek: this.getWeekLabel(weekStart),
      cohortStartDate: weekStart.toISOString().split('T')[0],
      cohortEndDate: weekEnd.toISOString().split('T')[0],
      totalUsers,
      activatedUsers,
      activationRate: Math.round(activationRate * 100) / 100,
      medianTimeToActivation: medianTimeToActivation ? Math.round(medianTimeToActivation * 10) / 10 : null,
      p25TimeToActivation: p25TimeToActivation ? Math.round(p25TimeToActivation * 10) / 10 : null,
      p75TimeToActivation: p75TimeToActivation ? Math.round(p75TimeToActivation * 10) / 10 : null,
      documentTypeDistribution: documentTypes,
      activationsByDay,
    };
  }

  /**
   * Generate weekly cohort report for the last N weeks
   */
  async generateWeeklyReport(weeksBack: number = 8): Promise<WeeklyCohortReport> {
    const today = new Date();
    const cohorts: CohortMetrics[] = [];

    // Generate cohort metrics for each week
    for (let i = weeksBack; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - (i * 7));
      const cohortWeekStart = this.getWeekStart(weekStart);

      const metrics = await this.getCohortMetrics(cohortWeekStart);
      cohorts.push(metrics);
    }

    // Calculate summary statistics
    const validCohorts = cohorts.filter(c => c.totalUsers > 0);
    const totalCohorts = validCohorts.length;
    const overallActivationRate = validCohorts.length > 0
      ? validCohorts.reduce((sum, c) => sum + c.activationRate, 0) / validCohorts.length
      : 0;

    let bestPerformingCohort = 'N/A';
    let worstPerformingCohort = 'N/A';
    if (validCohorts.length > 0) {
      const sortedByActivation = [...validCohorts].sort((a, b) => b.activationRate - a.activationRate);
      bestPerformingCohort = sortedByActivation[0].cohortWeek;
      worstPerformingCohort = sortedByActivation[sortedByActivation.length - 1].cohortWeek;
    }

    // Calculate trends (compare recent 4 weeks vs previous 4 weeks)
    const recentCohorts = validCohorts.slice(-4);
    const previousCohorts = validCohorts.slice(-8, -4);

    let activationRateTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (recentCohorts.length > 0 && previousCohorts.length > 0) {
      const recentAvg = recentCohorts.reduce((sum, c) => sum + c.activationRate, 0) / recentCohorts.length;
      const previousAvg = previousCohorts.reduce((sum, c) => sum + c.activationRate, 0) / previousCohorts.length;
      const diff = recentAvg - previousAvg;
      if (diff > 5) activationRateTrend = 'improving';
      else if (diff < -5) activationRateTrend = 'declining';
    }

    let medianActivationTimeTrend: 'improving' | 'declining' | 'stable' = 'stable';
    const recentMedians = recentCohorts.filter(c => c.medianTimeToActivation !== null);
    const previousMedians = previousCohorts.filter(c => c.medianTimeToActivation !== null);
    if (recentMedians.length > 0 && previousMedians.length > 0) {
      const recentAvg = recentMedians.reduce((sum, c) => sum + c.medianTimeToActivation!, 0) / recentMedians.length;
      const previousAvg = previousMedians.reduce((sum, c) => sum + c.medianTimeToActivation!, 0) / previousMedians.length;
      const diff = previousAvg - recentAvg;
      if (diff > 12) medianActivationTimeTrend = 'improving';
      else if (diff < -12) medianActivationTimeTrend = 'declining';
    }

    return {
      reportDate: today.toISOString().split('T')[0],
      reportWeek: this.getWeekLabel(today),
      summary: {
        totalCohorts,
        overallActivationRate: Math.round(overallActivationRate * 100) / 100,
        bestPerformingCohort,
        worstPerformingCohort,
      },
      cohorts,
      trends: {
        activationRateTrend,
        medianActivationTimeTrend,
      },
    };
  }

  /**
   * Generate markdown report for CEO distribution
   */
  async generateMarkdownReport(): Promise<string> {
    const report = await this.generateWeeklyReport();

    let markdown = `# Weekly Cohort Report - First Document Upload Activation\n\n`;
    markdown += `**Report Date:** ${report.reportDate}  \n`;
    markdown += `**Report Week:** ${report.reportWeek}  \n`;
    markdown += `**APP_NAME:** student_pilot | **APP_BASE_URL:** https://student-pilot-jamarrlmayes.replit.app\n\n`;
    
    markdown += `---\n\n`;
    markdown += `## Executive Summary\n\n`;
    markdown += `**North-Star Activation Metric:** First Document Upload  \n`;
    markdown += `**Tracking Period:** Last ${report.cohorts.length} weeks  \n\n`;

    markdown += `### Key Metrics\n\n`;
    markdown += `| Metric | Value | Trend |\n`;
    markdown += `|--------|-------|-------|\n`;
    markdown += `| **Overall Activation Rate** | ${report.summary.overallActivationRate.toFixed(2)}% | ${this.getTrendEmoji(report.trends.activationRateTrend)} ${report.trends.activationRateTrend.toUpperCase()} |\n`;
    markdown += `| **Median Time-to-Activation** | Varies by cohort | ${this.getTrendEmoji(report.trends.medianActivationTimeTrend)} ${report.trends.medianActivationTimeTrend.toUpperCase()} |\n`;
    markdown += `| **Total Cohorts Analyzed** | ${report.summary.totalCohorts} | - |\n`;
    markdown += `| **Best Performing Cohort** | ${report.summary.bestPerformingCohort} | - |\n`;
    markdown += `| **Worst Performing Cohort** | ${report.summary.worstPerformingCohort} | - |\n\n`;

    markdown += `---\n\n`;
    markdown += `## Cohort Details\n\n`;

    for (const cohort of report.cohorts) {
      if (cohort.totalUsers === 0) continue;

      markdown += `### ${cohort.cohortWeek}\n`;
      markdown += `**Period:** ${cohort.cohortStartDate} to ${cohort.cohortEndDate}  \n\n`;

      markdown += `**Activation Metrics:**\n`;
      markdown += `- Total Users: ${cohort.totalUsers}\n`;
      markdown += `- Activated Users: ${cohort.activatedUsers}\n`;
      markdown += `- **Activation Rate: ${cohort.activationRate.toFixed(2)}%**\n`;

      if (cohort.medianTimeToActivation !== null) {
        markdown += `\n**Time-to-Activation:**\n`;
        markdown += `- Median: ${cohort.medianTimeToActivation.toFixed(1)} hours\n`;
        markdown += `- P25: ${cohort.p25TimeToActivation?.toFixed(1)} hours\n`;
        markdown += `- P75: ${cohort.p75TimeToActivation?.toFixed(1)} hours\n`;

        const targetHours = 24;
        const percentMeetingTarget = cohort.medianTimeToActivation <= targetHours ? '✅ PASS' : '⚠️ BELOW TARGET';
        markdown += `- **Target (<24h): ${percentMeetingTarget}**\n`;
      } else {
        markdown += `\n**Time-to-Activation:** No activations yet\n`;
      }

      if (Object.keys(cohort.documentTypeDistribution).length > 0) {
        markdown += `\n**Document Type Distribution:**\n`;
        const sortedTypes = Object.entries(cohort.documentTypeDistribution)
          .sort((a, b) => b[1] - a[1]);
        for (const [type, count] of sortedTypes) {
          const percentage = ((count / cohort.activatedUsers) * 100).toFixed(1);
          markdown += `- ${type}: ${count} (${percentage}%)\n`;
        }
      }

      markdown += `\n`;
    }

    markdown += `---\n\n`;
    markdown += `## Interpretation & Recommendations\n\n`;

    markdown += `### Activation Rate Trend: ${report.trends.activationRateTrend.toUpperCase()}\n`;
    if (report.trends.activationRateTrend === 'improving') {
      markdown += `✅ Activation rate is improving. Recent cohorts are converting at higher rates.\n\n`;
    } else if (report.trends.activationRateTrend === 'declining') {
      markdown += `⚠️ Activation rate is declining. Investigate onboarding friction or user expectations mismatch.\n\n`;
    } else {
      markdown += `➡️ Activation rate is stable. Monitor for changes and test optimization experiments.\n\n`;
    }

    markdown += `### Time-to-Activation Trend: ${report.trends.medianActivationTimeTrend.toUpperCase()}\n`;
    if (report.trends.medianActivationTimeTrend === 'improving') {
      markdown += `✅ Users are activating faster. Onboarding improvements are working.\n\n`;
    } else if (report.trends.medianActivationTimeTrend === 'declining') {
      markdown += `⚠️ Users are taking longer to activate. Review onboarding flow for friction points.\n\n`;
    } else {
      markdown += `➡️ Time-to-activation is stable. Continue monitoring.\n\n`;
    }

    markdown += `### CEO Action Items\n\n`;
    const cohortsWithData = report.cohorts.filter(c => c.totalUsers > 0);
    const recentCohort = cohortsWithData[cohortsWithData.length - 1];
    
    if (recentCohort && recentCohort.activationRate < 50) {
      markdown += `- 🚨 **PRIORITY:** Activation rate below 50% (${recentCohort.activationRate.toFixed(2)}%). Investigate onboarding barriers.\n`;
    }
    if (recentCohort && recentCohort.medianTimeToActivation && recentCohort.medianTimeToActivation > 24) {
      markdown += `- ⚠️ **ATTENTION:** Median time-to-activation exceeds 24-hour target (${recentCohort.medianTimeToActivation.toFixed(1)}h). Streamline document upload flow.\n`;
    }
    if (report.trends.activationRateTrend === 'declining') {
      markdown += `- 📉 **MONITOR:** Activation rate declining. Run A/B tests on onboarding variations.\n`;
    }
    if (cohortsWithData.length === 0) {
      markdown += `- 📊 **BASELINE:** No cohort data yet. Continue tracking as users sign up.\n`;
    }

    markdown += `\n---\n\n`;
    markdown += `**Next Report:** ${this.getNextReportDate(new Date())}  \n`;
    markdown += `**Report Frequency:** Weekly (every Monday)  \n`;
    markdown += `**Metric Owner:** student_pilot DRI  \n`;

    return markdown;
  }

  private getTrendEmoji(trend: 'improving' | 'declining' | 'stable'): string {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      case 'stable': return '➡️';
    }
  }

  private getNextReportDate(date: Date): string {
    const next = new Date(date);
    next.setDate(next.getDate() + 7);
    const nextMonday = this.getWeekStart(next);
    return nextMonday.toISOString().split('T')[0];
  }
}

export const cohortReportingService = new CohortReportingService();
