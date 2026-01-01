import { env } from '../environment';
import { telemetryClient } from '../telemetry/telemetryClient';

interface WonDealPayload {
  userId: string;
  amountCents: number;
  credits: number;
  packageCode: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  pageSlug?: string;
  correlationId: string;
}

interface LtvData {
  userId: string;
  totalSpentCents: number;
  totalCredits: number;
  purchaseCount: number;
  firstPurchaseAt: string;
  lastPurchaseAt: string;
  arpu30d?: number;
}

const CREDIT_PACKAGES: Record<string, { credits: number; priceCents: number }> = {
  starter: { credits: 50, priceCents: 1499 },
  pro: { credits: 150, priceCents: 3999 },
  premium: { credits: 400, priceCents: 9999 }
};

export class LearningLoopService {
  private static instance: LearningLoopService;
  private a3BaseUrl: string;
  private a7BaseUrl: string;
  private a8BaseUrl: string;
  private ltvCache: Map<string, LtvData> = new Map();

  private constructor() {
    this.a3BaseUrl = process.env.SCHOLARSHIP_AGENT_BASE_URL || 'https://scholarship-agent-jamarrlmayes.replit.app';
    this.a7BaseUrl = process.env.AUTO_PAGE_MAKER_BASE_URL || 'https://auto-page-maker-jamarrlmayes.replit.app';
    this.a8BaseUrl = env.AUTO_COM_CENTER_BASE_URL || 'https://auto-com-center-jamarrlmayes.replit.app';
  }

  static getInstance(): LearningLoopService {
    if (!LearningLoopService.instance) {
      LearningLoopService.instance = new LearningLoopService();
    }
    return LearningLoopService.instance;
  }

  async triggerWonDeal(payload: WonDealPayload): Promise<void> {
    const startTime = Date.now();
    console.log(`🎯 Learning Loop: Won Deal triggered for user ${payload.userId}`);

    try {
      await Promise.allSettled([
        this.elevateLeadScore(payload),
        this.updateRevenueByPage(payload),
        this.updateLtv(payload),
        this.emitWonDealTelemetry(payload)
      ]);

      console.log(`✅ Learning Loop: Won Deal completed in ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error('❌ Learning Loop: Won Deal failed:', error);
      telemetryClient.track('learning_loop_error', {
        automation: 'won_deal',
        userId: payload.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: payload.correlationId
      });
    }
  }

  private async elevateLeadScore(payload: WonDealPayload): Promise<void> {
    try {
      const response = await fetch(`${this.a3BaseUrl}/api/leads/won-deal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.SHARED_SECRET}`,
          'X-Correlation-ID': payload.correlationId,
          'X-Source-App': 'student_pilot'
        },
        body: JSON.stringify({
          userId: payload.userId,
          action: 'elevate_to_customer',
          leadScore: 100,
          segment: 'Customer',
          suppressReacquisition: true,
          purchaseData: {
            amountCents: payload.amountCents,
            credits: payload.credits,
            packageCode: payload.packageCode
          },
          utmAttribution: {
            source: payload.utmSource,
            medium: payload.utmMedium,
            campaign: payload.utmCampaign
          }
        })
      });

      if (response.ok) {
        console.log(`✅ A3: Lead score elevated for user ${payload.userId}`);
        telemetryClient.track('lead_score_elevated', {
          userId: payload.userId,
          newSegment: 'Customer',
          source: 'won_deal',
          correlationId: payload.correlationId
        });
      } else {
        console.warn(`⚠️ A3: Lead elevation failed (${response.status}) - continuing gracefully`);
      }
    } catch (error) {
      console.warn('⚠️ A3: Lead score elevation unavailable - continuing gracefully');
    }
  }

  private async updateRevenueByPage(payload: WonDealPayload): Promise<void> {
    if (!payload.utmSource && !payload.pageSlug) {
      console.log('ℹ️ Learning Loop: No UTM source or page slug - skipping Revenue by Page');
      return;
    }

    try {
      const response = await fetch(`${this.a7BaseUrl}/api/revenue-by-page`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.SHARED_SECRET}`,
          'X-Correlation-ID': payload.correlationId,
          'X-Source-App': 'student_pilot'
        },
        body: JSON.stringify({
          pageSlug: payload.pageSlug || 'unknown',
          amountCents: payload.amountCents,
          credits: payload.credits,
          utmSource: payload.utmSource,
          utmMedium: payload.utmMedium,
          utmCampaign: payload.utmCampaign,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        console.log(`✅ A7: Revenue by Page updated (${payload.utmSource || payload.pageSlug})`);
        telemetryClient.track('revenue_by_page_updated', {
          pageSlug: payload.pageSlug,
          utmSource: payload.utmSource,
          amountCents: payload.amountCents,
          correlationId: payload.correlationId
        });
      } else {
        console.warn(`⚠️ A7: Revenue by Page update failed (${response.status}) - continuing gracefully`);
      }
    } catch (error) {
      console.warn('⚠️ A7: Revenue by Page unavailable - continuing gracefully');
    }
  }

  private async updateLtv(payload: WonDealPayload): Promise<void> {
    const now = new Date().toISOString();
    let ltv = this.ltvCache.get(payload.userId);

    if (!ltv) {
      ltv = {
        userId: payload.userId,
        totalSpentCents: 0,
        totalCredits: 0,
        purchaseCount: 0,
        firstPurchaseAt: now,
        lastPurchaseAt: now
      };
    }

    ltv.totalSpentCents += payload.amountCents;
    ltv.totalCredits += payload.credits;
    ltv.purchaseCount += 1;
    ltv.lastPurchaseAt = now;
    ltv.arpu30d = ltv.totalSpentCents / ltv.purchaseCount;

    this.ltvCache.set(payload.userId, ltv);

    telemetryClient.track('ltv_updated', {
      userId: payload.userId,
      totalSpentCents: ltv.totalSpentCents,
      totalSpentDollars: ltv.totalSpentCents / 100,
      totalCredits: ltv.totalCredits,
      purchaseCount: ltv.purchaseCount,
      arpu30d: ltv.arpu30d,
      correlationId: payload.correlationId
    });

    console.log(`📊 LTV: User ${payload.userId} - Total: $${(ltv.totalSpentCents / 100).toFixed(2)}, Purchases: ${ltv.purchaseCount}`);
  }

  private async emitWonDealTelemetry(payload: WonDealPayload): Promise<void> {
    telemetryClient.track('won_deal', {
      userId: payload.userId,
      amountCents: payload.amountCents,
      amountDollars: payload.amountCents / 100,
      credits: payload.credits,
      packageCode: payload.packageCode,
      utmSource: payload.utmSource || 'direct',
      utmMedium: payload.utmMedium,
      utmCampaign: payload.utmCampaign,
      pageSlug: payload.pageSlug,
      timestamp: new Date().toISOString(),
      correlationId: payload.correlationId
    });

    try {
      await fetch(`${this.a8BaseUrl}/api/automations/won-deal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.SHARED_SECRET}`,
          'X-Correlation-ID': payload.correlationId,
          'X-Source-App': 'student_pilot'
        },
        body: JSON.stringify({
          eventType: 'won_deal',
          sourceApp: 'student_pilot',
          userId: payload.userId,
          revenue: {
            amountCents: payload.amountCents,
            credits: payload.credits,
            packageCode: payload.packageCode
          },
          attribution: {
            utmSource: payload.utmSource,
            utmMedium: payload.utmMedium,
            utmCampaign: payload.utmCampaign,
            pageSlug: payload.pageSlug
          },
          timestamp: new Date().toISOString()
        })
      });
      console.log('✅ A8: Won Deal automation registered');
    } catch (error) {
      console.warn('⚠️ A8: Won Deal automation endpoint unavailable - event already in telemetry');
    }
  }

  calculateCreditsToUsd(credits: number): number {
    const starterPricePerCredit = CREDIT_PACKAGES.starter.priceCents / CREDIT_PACKAGES.starter.credits;
    return (credits * starterPricePerCredit) / 100;
  }

  getLtvData(userId: string): LtvData | undefined {
    return this.ltvCache.get(userId);
  }

  getAttributionRoi(): Array<{ source: string; revenue: number; count: number }> {
    const roiBySource: Map<string, { revenue: number; count: number }> = new Map();

    const ltvValues = Array.from(this.ltvCache.values());
    for (const ltv of ltvValues) {
      const source = 'direct';
      const existing = roiBySource.get(source) || { revenue: 0, count: 0 };
      existing.revenue += ltv.totalSpentCents;
      existing.count += ltv.purchaseCount;
      roiBySource.set(source, existing);
    }

    const entries = Array.from(roiBySource.entries());
    return entries.map(([source, data]) => ({
      source,
      revenue: data.revenue / 100,
      count: data.count
    }));
  }
}

export const learningLoopService = LearningLoopService.getInstance();
