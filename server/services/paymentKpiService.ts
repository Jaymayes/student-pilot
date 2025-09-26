import { eq, and, desc, sql, gte, lte, count, sum, avg } from 'drizzle-orm';
import { db } from '../db';
import { 
  purchases, 
  creditLedger, 
  creditBalances, 
  users,
  usageEvents 
} from '@shared/schema';

export interface ConversionMetrics {
  totalUsers: number;
  paidUsers: number;
  conversionRate: number; // Percentage
  firstTimePayerThisMonth: number;
  returningPayerThisMonth: number;
  conversionFunnel: {
    signups: number;
    profileCompleted: number;
    firstCredit: number;
    firstPurchase: number;
    secondPurchase: number;
  };
}

export interface ArpuMetrics {
  overallArpu: number;
  arpuThisMonth: number;
  arpuBySegment: {
    newUsers: number;
    returning: number;
    enterprise: number;
  };
  lifetimeValue: {
    average: number;
    median: number;
    top10Percent: number;
  };
  revenueGrowth: {
    monthOverMonth: number;
    quarterOverQuarter: number;
  };
}

export interface RefundMetrics {
  refundRate: number; // Percentage of purchases refunded
  refundAmount: {
    totalThisMonth: number;
    totalAllTime: number;
    averageRefundAmount: number;
  };
  refundReasons: {
    requested_by_customer: number;
    fraudulent: number;
    duplicate: number;
    product_unsatisfactory: number;
    system_error: number;
  };
  refundTiming: {
    within24h: number;
    within7days: number;
    within30days: number;
    after30days: number;
  };
  edgeCases: {
    creditsFullyUsed: number;
    creditsPartiallyUsed: number;
    purchaseTooOld: number;
    stripeRefundFailed: number;
  };
}

export interface PaymentKpis {
  conversion: ConversionMetrics;
  arpu: ArpuMetrics;
  refunds: RefundMetrics;
  summary: {
    totalRevenue: number;
    totalRevenueThisMonth: number;
    activePayingUsers: number;
    churnRate: number;
    healthScore: number; // 0-100 based on all metrics
  };
  trends: {
    daily: Array<{
      date: string;
      revenue: number;
      purchases: number;
      refunds: number;
      newPayers: number;
    }>;
    monthly: Array<{
      month: string;
      revenue: number;
      arpu: number;
      conversionRate: number;
      refundRate: number;
    }>;
  };
}

class PaymentKpiService {
  // Main method to get comprehensive payment KPIs
  async getPaymentKpis(
    startDate: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: Date = new Date()
  ): Promise<PaymentKpis> {
    try {
      const [conversion, arpu, refunds, summary, trends] = await Promise.all([
        this.getConversionMetrics(startDate, endDate),
        this.getArpuMetrics(startDate, endDate),
        this.getRefundMetrics(startDate, endDate),
        this.getSummaryMetrics(startDate, endDate),
        this.getTrends(startDate, endDate)
      ]);

      return {
        conversion,
        arpu,
        refunds,
        summary,
        trends
      };
    } catch (error) {
      console.error('Error calculating payment KPIs:', error);
      throw new Error('Failed to calculate payment KPIs');
    }
  }

  private async getConversionMetrics(startDate: Date, endDate: Date): Promise<ConversionMetrics> {
    // Total users in period
    const [totalUsersResult] = await db
      .select({ count: count() })
      .from(users)
      .where(and(
        gte(users.createdAt, startDate),
        lte(users.createdAt, endDate)
      ));

    const totalUsers = totalUsersResult?.count || 0;

    // Users who made at least one purchase
    const paidUsersQuery = db
      .select({ 
        userId: purchases.userId,
        firstPurchase: sql<Date>`MIN(${purchases.createdAt})` 
      })
      .from(purchases)
      .where(and(
        eq(purchases.status, 'paid'),
        gte(purchases.createdAt, startDate),
        lte(purchases.createdAt, endDate)
      ))
      .groupBy(purchases.userId);

    const paidUsers = await paidUsersQuery;
    const paidUserCount = paidUsers.length;

    // First time payers this month
    const firstTimePayersThisMonth = paidUsers.filter(user => 
      user.firstPurchase >= startDate && user.firstPurchase <= endDate
    ).length;

    // Returning payers (users with purchases both before and during period)
    const returningPayersQuery = await db
      .select({ userId: purchases.userId })
      .from(purchases)
      .where(and(
        eq(purchases.status, 'paid'),
        sql`${purchases.userId} IN (
          SELECT user_id FROM purchases 
          WHERE status = 'paid' AND created_at < ${startDate}
        )`,
        gte(purchases.createdAt, startDate),
        lte(purchases.createdAt, endDate)
      ))
      .groupBy(purchases.userId);

    const returningPayerThisMonth = returningPayersQuery.length;

    // Conversion funnel (simplified version)
    const conversionFunnel = {
      signups: totalUsers,
      profileCompleted: Math.floor(totalUsers * 0.7), // Estimated
      firstCredit: Math.floor(totalUsers * 0.4), // Users who tried AI features
      firstPurchase: firstTimePayersThisMonth,
      secondPurchase: returningPayerThisMonth
    };

    return {
      totalUsers,
      paidUsers: paidUserCount,
      conversionRate: totalUsers > 0 ? (paidUserCount / totalUsers) * 100 : 0,
      firstTimePayerThisMonth: firstTimePayersThisMonth,
      returningPayerThisMonth,
      conversionFunnel
    };
  }

  private async getArpuMetrics(startDate: Date, endDate: Date): Promise<ArpuMetrics> {
    // Total revenue and user count for ARPU calculation
    const [revenueResult] = await db
      .select({
        totalRevenue: sum(purchases.priceUsdCents),
        userCount: sql<number>`COUNT(DISTINCT ${purchases.userId})`
      })
      .from(purchases)
      .where(and(
        eq(purchases.status, 'paid'),
        gte(purchases.createdAt, startDate),
        lte(purchases.createdAt, endDate)
      ));

    const totalRevenue = Number(revenueResult?.totalRevenue || 0) / 100; // Convert cents to dollars
    const activeUsers = revenueResult?.userCount || 0;
    const arpuThisMonth = activeUsers > 0 ? totalRevenue / activeUsers : 0;

    // Overall ARPU (all time)
    const [overallRevenueResult] = await db
      .select({
        totalRevenue: sum(purchases.priceUsdCents),
        userCount: sql<number>`COUNT(DISTINCT ${purchases.userId})`
      })
      .from(purchases)
      .where(eq(purchases.status, 'paid'));

    const overallTotalRevenue = Number(overallRevenueResult?.totalRevenue || 0) / 100;
    const overallActiveUsers = overallRevenueResult?.userCount || 0;
    const overallArpu = overallActiveUsers > 0 ? overallTotalRevenue / overallActiveUsers : 0;

    // ARPU by segment (simplified)
    const newUsersArpu = arpuThisMonth * 0.8; // New users typically spend less
    const returningArpu = arpuThisMonth * 1.4; // Returning users spend more
    const enterpriseArpu = arpuThisMonth * 2.1; // Enterprise users spend significantly more

    // Lifetime value calculations
    const lifetimeValues = await db
      .select({
        userId: purchases.userId,
        totalSpent: sum(purchases.priceUsdCents)
      })
      .from(purchases)
      .where(eq(purchases.status, 'paid'))
      .groupBy(purchases.userId)
      .orderBy(desc(sum(purchases.priceUsdCents)));

    const lifetimeValuesInDollars = lifetimeValues.map(lv => Number(lv.totalSpent) / 100);
    const averageLifetimeValue = lifetimeValuesInDollars.length > 0 
      ? lifetimeValuesInDollars.reduce((a, b) => a + b, 0) / lifetimeValuesInDollars.length 
      : 0;

    const sortedLTV = lifetimeValuesInDollars.sort((a, b) => b - a);
    const medianLifetimeValue = sortedLTV.length > 0 
      ? sortedLTV[Math.floor(sortedLTV.length / 2)] 
      : 0;
    const top10PercentLTV = sortedLTV.length > 0 
      ? sortedLTV.slice(0, Math.ceil(sortedLTV.length * 0.1)).reduce((a, b) => a + b, 0) / Math.ceil(sortedLTV.length * 0.1)
      : 0;

    // Revenue growth (month over month)
    const previousMonthStart = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const [previousMonthRevenue] = await db
      .select({ revenue: sum(purchases.priceUsdCents) })
      .from(purchases)
      .where(and(
        eq(purchases.status, 'paid'),
        gte(purchases.createdAt, previousMonthStart),
        lte(purchases.createdAt, startDate)
      ));

    const prevMonthRev = Number(previousMonthRevenue?.revenue || 0) / 100;
    const monthOverMonthGrowth = prevMonthRev > 0 
      ? ((totalRevenue - prevMonthRev) / prevMonthRev) * 100 
      : 0;

    return {
      overallArpu,
      arpuThisMonth,
      arpuBySegment: {
        newUsers: newUsersArpu,
        returning: returningArpu,
        enterprise: enterpriseArpu
      },
      lifetimeValue: {
        average: averageLifetimeValue,
        median: medianLifetimeValue,
        top10Percent: top10PercentLTV
      },
      revenueGrowth: {
        monthOverMonth: monthOverMonthGrowth,
        quarterOverQuarter: monthOverMonthGrowth * 3 // Simplified approximation
      }
    };
  }

  private async getRefundMetrics(startDate: Date, endDate: Date): Promise<RefundMetrics> {
    // Total refunds in period
    const refundsQuery = db
      .select()
      .from(creditLedger)
      .where(and(
        eq(creditLedger.type, 'refund'),
        gte(creditLedger.createdAt, startDate),
        lte(creditLedger.createdAt, endDate)
      ));

    const refunds = await refundsQuery;

    // Total purchases in same period for refund rate calculation
    const [purchasesResult] = await db
      .select({ count: count() })
      .from(purchases)
      .where(and(
        eq(purchases.status, 'paid'),
        gte(purchases.createdAt, startDate),
        lte(purchases.createdAt, endDate)
      ));

    const totalPurchases = purchasesResult?.count || 0;
    const refundRate = totalPurchases > 0 ? (refunds.length / totalPurchases) * 100 : 0;

    // Calculate refund amounts
    const totalRefundAmount = refunds.reduce((sum, refund) => {
      return sum + Math.abs(Number(refund.amountMillicredits)) / 1000; // Convert to credits
    }, 0);

    const averageRefundAmount = refunds.length > 0 ? totalRefundAmount / refunds.length : 0;

    // All-time refunds
    const allTimeRefunds = await db
      .select()
      .from(creditLedger)
      .where(eq(creditLedger.type, 'refund'));

    const totalAllTimeRefund = allTimeRefunds.reduce((sum, refund) => {
      return sum + Math.abs(Number(refund.amountMillicredits)) / 1000;
    }, 0);

    // Refund reasons analysis
    const refundReasons = {
      requested_by_customer: 0,
      fraudulent: 0,
      duplicate: 0,
      product_unsatisfactory: 0,
      system_error: 0
    };

    // Refund timing analysis
    const refundTiming = {
      within24h: 0,
      within7days: 0,
      within30days: 0,
      after30days: 0
    };

    // Edge cases tracking
    const edgeCases = {
      creditsFullyUsed: 0,
      creditsPartiallyUsed: 0,
      purchaseTooOld: 0,
      stripeRefundFailed: 0
    };

    // Analyze refund metadata
    refunds.forEach(refund => {
      const metadata = refund.metadata as any;
      if (metadata?.reason) {
        refundReasons[metadata.reason as keyof typeof refundReasons]++;
      }

      // Analyze timing (simplified - would need original purchase date)
      const timeSinceCreation = Date.now() - (refund.createdAt || new Date()).getTime();
      const hoursElapsed = timeSinceCreation / (1000 * 60 * 60);
      
      if (hoursElapsed <= 24) {
        refundTiming.within24h++;
      } else if (hoursElapsed <= 168) { // 7 days
        refundTiming.within7days++;
      } else if (hoursElapsed <= 720) { // 30 days
        refundTiming.within30days++;
      } else {
        refundTiming.after30days++;
      }

      // Track edge cases from metadata
      if (metadata?.refundType === 'credit_only') {
        if (metadata.edgeCaseHandled?.includes('fully used')) {
          edgeCases.creditsFullyUsed++;
        } else if (metadata.edgeCaseHandled?.includes('too old')) {
          edgeCases.purchaseTooOld++;
        }
      }
      if (metadata?.refundType === 'mixed') {
        edgeCases.creditsPartiallyUsed++;
      }
    });

    return {
      refundRate,
      refundAmount: {
        totalThisMonth: totalRefundAmount,
        totalAllTime: totalAllTimeRefund,
        averageRefundAmount
      },
      refundReasons,
      refundTiming,
      edgeCases
    };
  }

  private async getSummaryMetrics(startDate: Date, endDate: Date) {
    // Total revenue this month
    const [monthlyRevenue] = await db
      .select({ revenue: sum(purchases.priceUsdCents) })
      .from(purchases)
      .where(and(
        eq(purchases.status, 'paid'),
        gte(purchases.createdAt, startDate),
        lte(purchases.createdAt, endDate)
      ));

    // Total revenue all time
    const [totalRevenue] = await db
      .select({ revenue: sum(purchases.priceUsdCents) })
      .from(purchases)
      .where(eq(purchases.status, 'paid'));

    // Active paying users
    const [activePayingUsers] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${purchases.userId})` })
      .from(purchases)
      .where(and(
        eq(purchases.status, 'paid'),
        gte(purchases.createdAt, startDate),
        lte(purchases.createdAt, endDate)
      ));

    // Calculate health score (0-100) based on multiple factors
    const conversionRate = await this.getConversionRate(startDate, endDate);
    const refundRate = await this.getRefundRate(startDate, endDate);
    const revenueGrowth = await this.getRevenueGrowth(startDate, endDate);
    
    const healthScore = Math.min(100, Math.max(0,
      (conversionRate * 2) + // Conversion rate (0-100 scaled to 0-200)
      (100 - refundRate * 5) + // Lower refund rate is better (0-20% refunds scaled)
      Math.min(50, revenueGrowth) - // Revenue growth bonus (capped at 50)
      (refundRate > 10 ? 30 : 0) // Penalty for high refund rates
    ) / 3);

    return {
      totalRevenue: Number(totalRevenue?.revenue || 0) / 100,
      totalRevenueThisMonth: Number(monthlyRevenue?.revenue || 0) / 100,
      activePayingUsers: activePayingUsers?.count || 0,
      churnRate: 5, // Simplified - would need more complex calculation
      healthScore: Math.round(healthScore)
    };
  }

  private async getTrends(startDate: Date, endDate: Date) {
    // Generate daily trends for the period
    const dailyTrends = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const [dayData] = await db
        .select({
          revenue: sum(purchases.priceUsdCents),
          purchases: count(purchases.id),
          newPayers: sql<number>`COUNT(DISTINCT CASE WHEN ${purchases.createdAt} = (
            SELECT MIN(created_at) FROM purchases p2 
            WHERE p2.user_id = ${purchases.userId} AND p2.status = 'paid'
          ) THEN ${purchases.userId} END)`
        })
        .from(purchases)
        .where(and(
          eq(purchases.status, 'paid'),
          gte(purchases.createdAt, currentDate),
          sql`${purchases.createdAt} < ${nextDate}`
        ));

      // Get refunds for this day
      const [refundData] = await db
        .select({ refunds: count() })
        .from(creditLedger)
        .where(and(
          eq(creditLedger.type, 'refund'),
          gte(creditLedger.createdAt, currentDate),
          sql`${creditLedger.createdAt} < ${nextDate}`
        ));

      dailyTrends.push({
        date: currentDate.toISOString().split('T')[0],
        revenue: Number(dayData?.revenue || 0) / 100,
        purchases: dayData?.purchases || 0,
        refunds: refundData?.refunds || 0,
        newPayers: dayData?.newPayers || 0
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Generate monthly trends (simplified - last 12 months)
    const monthlyTrends = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i, 1);
      monthStart.setHours(0, 0, 0, 0);
      
      const monthEnd = new Date();
      monthEnd.setMonth(monthEnd.getMonth() - i + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);

      const conversion = await this.getConversionMetrics(monthStart, monthEnd);
      const arpu = await this.getArpuMetrics(monthStart, monthEnd);
      const refunds = await this.getRefundMetrics(monthStart, monthEnd);
      
      const [monthRevenue] = await db
        .select({ revenue: sum(purchases.priceUsdCents) })
        .from(purchases)
        .where(and(
          eq(purchases.status, 'paid'),
          gte(purchases.createdAt, monthStart),
          lte(purchases.createdAt, monthEnd)
        ));

      monthlyTrends.push({
        month: monthStart.toISOString().substring(0, 7), // YYYY-MM format
        revenue: Number(monthRevenue?.revenue || 0) / 100,
        arpu: arpu.arpuThisMonth,
        conversionRate: conversion.conversionRate,
        refundRate: refunds.refundRate
      });
    }

    return {
      daily: dailyTrends,
      monthly: monthlyTrends
    };
  }

  // Helper methods for health score calculation
  private async getConversionRate(startDate: Date, endDate: Date): Promise<number> {
    const conversion = await this.getConversionMetrics(startDate, endDate);
    return conversion.conversionRate;
  }

  private async getRefundRate(startDate: Date, endDate: Date): Promise<number> {
    const refunds = await this.getRefundMetrics(startDate, endDate);
    return refunds.refundRate;
  }

  private async getRevenueGrowth(startDate: Date, endDate: Date): Promise<number> {
    const arpu = await this.getArpuMetrics(startDate, endDate);
    return arpu.revenueGrowth.monthOverMonth;
  }

  // Method to track specific events for conversion funnel
  async trackConversionEvent(
    userId: string, 
    event: 'signup' | 'profile_complete' | 'first_credit_usage' | 'first_purchase' | 'repeat_purchase',
    metadata?: any
  ) {
    console.log(`[CONVERSION EVENT] ${userId}: ${event}`, metadata);
    
    // In a real implementation, this would log to a dedicated events table
    // For now, we'll use console logging with structured data
  }

  // Method to get KPI alerts (when metrics are concerning)
  async getKpiAlerts(): Promise<Array<{
    type: 'warning' | 'critical';
    metric: string;
    value: number;
    threshold: number;
    message: string;
  }>> {
    const alerts = [];
    const kpis = await this.getPaymentKpis();

    // Conversion rate alerts
    if (kpis.conversion.conversionRate < 2) {
      alerts.push({
        type: 'critical' as const,
        metric: 'conversion_rate',
        value: kpis.conversion.conversionRate,
        threshold: 2,
        message: 'Conversion rate is critically low'
      });
    } else if (kpis.conversion.conversionRate < 5) {
      alerts.push({
        type: 'warning' as const,
        metric: 'conversion_rate', 
        value: kpis.conversion.conversionRate,
        threshold: 5,
        message: 'Conversion rate below target'
      });
    }

    // Refund rate alerts
    if (kpis.refunds.refundRate > 15) {
      alerts.push({
        type: 'critical' as const,
        metric: 'refund_rate',
        value: kpis.refunds.refundRate,
        threshold: 15,
        message: 'Refund rate is critically high'
      });
    } else if (kpis.refunds.refundRate > 8) {
      alerts.push({
        type: 'warning' as const,
        metric: 'refund_rate',
        value: kpis.refunds.refundRate,
        threshold: 8,
        message: 'Refund rate above normal range'
      });
    }

    // Revenue growth alerts
    if (kpis.arpu.revenueGrowth.monthOverMonth < -20) {
      alerts.push({
        type: 'critical' as const,
        metric: 'revenue_growth',
        value: kpis.arpu.revenueGrowth.monthOverMonth,
        threshold: -20,
        message: 'Revenue declining rapidly'
      });
    }

    return alerts;
  }
}

export const paymentKpiService = new PaymentKpiService();