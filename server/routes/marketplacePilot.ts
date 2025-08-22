import { Request, Response } from 'express';
import { z } from 'zod';
import { isAuthenticated } from '../replitAuth';

// Validation schemas for production pilot
const PilotCohortSchema = z.object({
  userId: z.string(),
  cohortId: z.string(),
  enrolledAt: z.string().datetime(),
  trafficAllocation: z.number().min(0).max(1), // 0-1 percentage
  features: z.array(z.enum(['promoted_listings', 'partner_branding', 'deep_links', 'analytics_access']))
});

const PromotionActivationSchema = z.object({
  scholarshipId: z.string(),
  partnerId: z.string(),
  promotionLevel: z.enum(['standard', 'featured', 'premium']),
  budgetLimit: z.number().min(0),
  targetAudience: z.object({
    academicLevels: z.array(z.string()).optional(),
    fieldsOfStudy: z.array(z.string()).optional(),
    states: z.array(z.string()).optional(),
    gpaRange: z.tuple([z.number(), z.number()]).optional()
  }).optional(),
  isActive: z.boolean(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional()
});

/**
 * Production pilot management for marketplace features
 * Limited cohort with feature flags and guardrails
 */
export class MarketplacePilotService {
  private pilotCohorts = new Map<string, any>();
  private activePromotions = new Map<string, any>();

  /**
   * Enroll user in production pilot cohort
   * Controls access to marketplace features behind flags
   */
  async enrollInPilotCohort(userId: string, cohortConfig: {
    trafficAllocation: number;
    features: string[];
    experimentId?: string;
  }): Promise<{ success: boolean; cohortId: string; features: string[] }> {
    // Generate cohort assignment
    const cohortId = `pilot_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Validate traffic allocation (gradual rollout)
    const maxAllocation = process.env.PILOT_MAX_TRAFFIC_ALLOCATION ? 
      parseFloat(process.env.PILOT_MAX_TRAFFIC_ALLOCATION) : 0.10; // Default 10%
    
    if (cohortConfig.trafficAllocation > maxAllocation) {
      throw new Error(`Traffic allocation ${cohortConfig.trafficAllocation} exceeds limit ${maxAllocation}`);
    }

    // Check if user qualifies for pilot
    const userHash = this.generateUserHash(userId);
    const isQualified = userHash < cohortConfig.trafficAllocation;

    if (!isQualified) {
      return {
        success: false,
        cohortId: '',
        features: []
      };
    }

    const enrollment = {
      userId,
      cohortId,
      enrolledAt: new Date().toISOString(),
      trafficAllocation: cohortConfig.trafficAllocation,
      features: cohortConfig.features,
      experimentId: cohortConfig.experimentId
    };

    this.pilotCohorts.set(userId, enrollment);

    return {
      success: true,
      cohortId,
      features: cohortConfig.features
    };
  }

  /**
   * Check if user has access to marketplace features
   */
  async getUserPilotStatus(userId: string): Promise<{
    isInPilot: boolean;
    cohortId?: string;
    features: string[];
    enrolledAt?: string;
  }> {
    const enrollment = this.pilotCohorts.get(userId);
    
    if (!enrollment) {
      return {
        isInPilot: false,
        features: []
      };
    }

    return {
      isInPilot: true,
      cohortId: enrollment.cohortId,
      features: enrollment.features,
      enrolledAt: enrollment.enrolledAt
    };
  }

  /**
   * Activate partner promotion in production
   * With guardrails and budget controls
   */
  async activatePromotion(promotionData: z.infer<typeof PromotionActivationSchema>): Promise<{
    success: boolean;
    promotionId: string;
    guardrails: {
      budgetGuard: boolean;
      qualityThreshold: boolean;
      complianceCheck: boolean;
    };
  }> {
    const validatedPromotion = PromotionActivationSchema.parse(promotionData);
    
    // Apply guardrails
    const guardrails = {
      budgetGuard: validatedPromotion.budgetLimit <= 5000, // Max $5000 per promotion
      qualityThreshold: await this.checkPartnerQuality(validatedPromotion.partnerId),
      complianceCheck: await this.checkCompliance(validatedPromotion)
    };

    if (!Object.values(guardrails).every(check => check)) {
      return {
        success: false,
        promotionId: '',
        guardrails
      };
    }

    const promotionId = `promo_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    this.activePromotions.set(promotionId, {
      ...validatedPromotion,
      promotionId,
      createdAt: new Date().toISOString(),
      spentBudget: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0
    });

    return {
      success: true,
      promotionId,
      guardrails
    };
  }

  /**
   * Get live promotion metrics for pilot
   */
  async getPromotionMetrics(promotionId: string): Promise<{
    promotionId: string;
    status: 'active' | 'paused' | 'completed' | 'budget_exceeded';
    metrics: {
      impressions: number;
      clicks: number;
      conversions: number;
      ctr: number;
      cvr: number;
      spentBudget: number;
      remainingBudget: number;
    };
    attribution: {
      totalEvents: number;
      lastEventAt?: string;
      deepLinkClicks: number;
      partnerConversions: number;
    };
  }> {
    const promotion = this.activePromotions.get(promotionId);
    
    if (!promotion) {
      throw new Error('Promotion not found');
    }

    // Mock metrics - in production would query actual data
    const metrics = {
      impressions: Math.floor(Math.random() * 1000) + 100,
      clicks: Math.floor(Math.random() * 50) + 5,
      conversions: Math.floor(Math.random() * 10) + 1,
      ctr: 0,
      cvr: 0,
      spentBudget: Math.floor(Math.random() * promotion.budgetLimit * 0.7),
      remainingBudget: 0
    };

    metrics.ctr = metrics.clicks / metrics.impressions;
    metrics.cvr = metrics.conversions / metrics.clicks;
    metrics.remainingBudget = promotion.budgetLimit - metrics.spentBudget;

    const status = metrics.spentBudget >= promotion.budgetLimit ? 'budget_exceeded' : 'active';

    return {
      promotionId,
      status,
      metrics,
      attribution: {
        totalEvents: metrics.clicks + metrics.conversions,
        lastEventAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        deepLinkClicks: Math.floor(metrics.clicks * 0.8), // 80% follow deep links
        partnerConversions: metrics.conversions
      }
    };
  }

  /**
   * Monitor pilot health and safety metrics
   */
  async getPilotHealthMetrics(): Promise<{
    pilotStatus: 'healthy' | 'warning' | 'critical';
    cohortSize: number;
    trafficAllocation: number;
    activePromotions: number;
    averageCTR: number;
    attributionReliability: number;
    safeguards: {
      budgetOverruns: number;
      qualityViolations: number;
      attributionFailures: number;
    };
  }> {
    const cohortSize = this.pilotCohorts.size;
    const activePromotionCount = Array.from(this.activePromotions.values())
      .filter(p => p.isActive).length;

    // Calculate aggregate metrics
    const promotionMetrics = await Promise.all(
      Array.from(this.activePromotions.keys()).map(id => this.getPromotionMetrics(id))
    );

    const totalClicks = promotionMetrics.reduce((sum, m) => sum + m.metrics.clicks, 0);
    const totalImpressions = promotionMetrics.reduce((sum, m) => sum + m.metrics.impressions, 0);
    const averageCTR = totalClicks / totalImpressions || 0;

    // Attribution reliability (percentage of events successfully tracked)
    const attributionReliability = 0.94; // Mock 94% reliability

    // Safety metrics
    const budgetOverruns = promotionMetrics.filter(m => m.status === 'budget_exceeded').length;
    const qualityViolations = 0; // Mock - no quality violations
    const attributionFailures = Math.floor(promotionMetrics.length * 0.06); // 6% failure rate

    // Determine pilot health
    let pilotStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (budgetOverruns > 2 || attributionReliability < 0.90) {
      pilotStatus = 'critical';
    } else if (budgetOverruns > 0 || attributionReliability < 0.95) {
      pilotStatus = 'warning';
    }

    return {
      pilotStatus,
      cohortSize,
      trafficAllocation: cohortSize > 0 ? 0.05 : 0, // 5% traffic allocation
      activePromotions: activePromotionCount,
      averageCTR,
      attributionReliability,
      safeguards: {
        budgetOverruns,
        qualityViolations,
        attributionFailures
      }
    };
  }

  private generateUserHash(userId: string): number {
    // Consistent hash for user assignment
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) / Math.pow(2, 31); // Normalize to 0-1
  }

  private async checkPartnerQuality(partnerId: string): Promise<boolean> {
    // Mock partner quality check
    const qualityScores: Record<string, number> = {
      'partner-edu-corp': 0.95,
      'partner-stem-alliance': 0.88,
      'partner-diversity-fund': 0.92
    };
    
    return (qualityScores[partnerId] || 0.5) >= 0.80; // 80% quality threshold
  }

  private async checkCompliance(promotion: any): Promise<boolean> {
    // Mock compliance checks
    const checks = [
      promotion.budgetLimit <= 5000, // Budget limit
      promotion.scholarshipId && promotion.scholarshipId.length > 0, // Valid scholarship
      promotion.partnerId && promotion.partnerId.length > 0, // Valid partner
      new Date(promotion.startDate) <= new Date(), // Valid dates
      !promotion.endDate || new Date(promotion.endDate) > new Date()
    ];
    
    return checks.every(check => check);
  }
}

const pilotService = new MarketplacePilotService();

/**
 * Enroll user in production pilot
 */
export async function enrollUserInPilot(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const userId = (req.user as any)?.claims?.sub;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID not found' });
    }

    // Check feature flag
    const isPilotEnabled = process.env.FEATURE_MARKETPLACE_PILOT === 'true';
    if (!isPilotEnabled) {
      return res.json({
        success: false,
        message: 'Marketplace pilot is not currently active'
      });
    }

    const cohortConfig = {
      trafficAllocation: 0.05, // 5% of users
      features: ['promoted_listings', 'partner_branding', 'deep_links'],
      experimentId: 'marketplace-pilot-v1'
    };

    const result = await pilotService.enrollInPilotCohort(userId, cohortConfig);
    res.json(result);

  } catch (error) {
    console.error('Error enrolling user in pilot:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * Get user's pilot status
 */
export async function getUserPilotStatus(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const userId = (req.user as any)?.claims?.sub;
    const status = await pilotService.getUserPilotStatus(userId);
    
    res.json({ success: true, pilot: status });

  } catch (error) {
    console.error('Error getting pilot status:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * Activate partner promotion in pilot
 */
export async function activatePartnerPromotion(req: Request, res: Response) {
  try {
    const validatedData = PromotionActivationSchema.parse(req.body);
    
    // Check partner authorization
    const isAuthorized = await checkPartnerAuthorization(req, validatedData.partnerId);
    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: 'Partner not authorized' });
    }

    const result = await pilotService.activatePromotion(validatedData);
    res.json(result);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid promotion data',
        details: error.errors
      });
    }

    console.error('Error activating promotion:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * Get promotion metrics for pilot monitoring
 */
export async function getPromotionMetrics(req: Request, res: Response) {
  try {
    const { promotionId } = req.params;
    
    if (!promotionId) {
      return res.status(400).json({ success: false, error: 'Promotion ID required' });
    }

    const metrics = await pilotService.getPromotionMetrics(promotionId);
    res.json({ success: true, metrics });

  } catch (error) {
    console.error('Error getting promotion metrics:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * Get overall pilot health metrics
 */
export async function getPilotHealthDashboard(req: Request, res: Response) {
  try {
    const health = await pilotService.getPilotHealthMetrics();
    res.json({ success: true, health });

  } catch (error) {
    console.error('Error getting pilot health:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function checkPartnerAuthorization(req: Request, partnerId: string): Promise<boolean> {
  // Mock partner authorization check
  const authorizedPartners = ['partner-edu-corp', 'partner-stem-alliance', 'partner-diversity-fund'];
  return authorizedPartners.includes(partnerId);
}