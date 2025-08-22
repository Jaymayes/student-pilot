import { Request, Response } from 'express';
import { z } from 'zod';
import { isAuthenticated } from '../replitAuth';

// Validation schemas for A/B testing
const ExperimentAssignmentSchema = z.object({
  experimentId: z.string(),
  variantId: z.string(),
  userId: z.string(),
  assignedAt: z.string().datetime()
});

const ExperimentExposureSchema = z.object({
  experimentId: z.string(),
  variantId: z.string(),
  exposedAt: z.string().datetime(),
  context: z.object({}).passthrough()
});

const ExperimentConversionSchema = z.object({
  experimentId: z.string(),
  variantId: z.string(),
  conversionType: z.string(),
  value: z.number().optional(),
  metadata: z.object({}).passthrough().optional(),
  convertedAt: z.string().datetime()
});

/**
 * Get experiment configuration
 * Returns experiment setup and variants for A/B testing
 */
export async function getExperiment(req: Request, res: Response) {
  try {
    const { experimentId } = req.params;

    if (!experimentId) {
      return res.status(400).json({
        success: false,
        error: 'Experiment ID is required'
      });
    }

    // Mock experiment configurations for matching squad A/B tests
    const experiments = {
      'match-explanation-test': {
        id: 'match-explanation-test',
        name: 'Enhanced Match Explanation Test',
        description: 'Test baseline vs. explained predictive ranking with confidence intervals',
        variants: [
          {
            id: 'control',
            name: 'Baseline Matching',
            weight: 50,
            config: {
              showExplanation: false,
              showConfidenceInterval: false,
              showCompetitionAnalysis: false,
              matchDisplayType: 'simple'
            }
          },
          {
            id: 'enhanced_explanation',
            name: 'Enhanced Explanation',
            weight: 50,
            config: {
              showExplanation: true,
              showConfidenceInterval: true,
              showCompetitionAnalysis: true,
              matchDisplayType: 'detailed',
              enableDetailedFactors: true,
              showImplicitFit: true
            }
          }
        ],
        isActive: process.env.FEATURE_MATCH_EXPLANATION_TEST === 'true',
        trafficAllocation: 100, // 100% of users
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Started 7 days ago
        endDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString(), // Runs for 30 days total
        metrics: {
          primary: 'application_click_through_rate',
          secondary: ['scholarship_detail_views', 'match_engagement_time', 'explanation_helpful_rating']
        },
        minimumDetectableEffect: 0.05, // 5% relative improvement
        sampleSizePlan: {
          totalRequired: 2000,
          perVariant: 1000,
          powerLevel: 0.8,
          significanceLevel: 0.05
        }
      },
      'partner-promotion-display': {
        id: 'partner-promotion-display',
        name: 'Partner Promotion Display Test',
        description: 'Test different partner promotion rendering styles',
        variants: [
          {
            id: 'control',
            name: 'Standard Display',
            weight: 33,
            config: {
              promotionStyle: 'standard',
              showPartnerBranding: false,
              highlightLevel: 'minimal'
            }
          },
          {
            id: 'enhanced_branding',
            name: 'Enhanced Partner Branding',
            weight: 33,
            config: {
              promotionStyle: 'enhanced',
              showPartnerBranding: true,
              highlightLevel: 'moderate',
              showPartnerLogo: true
            }
          },
          {
            id: 'premium_highlight',
            name: 'Premium Highlighting',
            weight: 34,
            config: {
              promotionStyle: 'premium',
              showPartnerBranding: true,
              highlightLevel: 'high',
              showPartnerLogo: true,
              addPromotionBadge: true
            }
          }
        ],
        isActive: process.env.FEATURE_PARTNER_PROMOTION_TEST === 'true',
        trafficAllocation: 50, // 50% of users for partner features
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        metrics: {
          primary: 'partner_promotion_click_rate',
          secondary: ['partner_deep_link_conversions', 'promotion_engagement_time']
        },
        minimumDetectableEffect: 0.03,
        sampleSizePlan: {
          totalRequired: 1500,
          perVariant: 500,
          powerLevel: 0.8,
          significanceLevel: 0.05
        }
      }
    };

    const experiment = experiments[experimentId as keyof typeof experiments];
    
    if (!experiment) {
      return res.status(404).json({
        success: false,
        error: 'Experiment not found'
      });
    }

    res.json({
      success: true,
      experiment
    });

  } catch (error) {
    console.error('Error getting experiment:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * Record experiment assignment
 * Logs when a user is assigned to an experiment variant
 */
export async function recordExperimentAssignment(req: Request, res: Response) {
  try {
    const validatedAssignment = ExperimentAssignmentSchema.parse(req.body);
    
    // Log assignment (in production, this would store in database)
    console.log('Experiment assignment:', {
      experimentId: validatedAssignment.experimentId,
      variantId: validatedAssignment.variantId,
      userId: validatedAssignment.userId,
      assignedAt: validatedAssignment.assignedAt,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Assignment recorded successfully',
      assignmentId: `assignment_${Date.now()}_${Math.random().toString(36).substring(7)}`
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid assignment data',
        details: error.errors
      });
    }

    console.error('Error recording experiment assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * Record experiment exposure
 * Logs when a user is actually exposed to an experiment variant
 */
export async function recordExperimentExposure(req: Request, res: Response) {
  try {
    const validatedExposure = ExperimentExposureSchema.parse(req.body);
    
    // Log exposure (in production, this would store in database)
    console.log('Experiment exposure:', {
      experimentId: validatedExposure.experimentId,
      variantId: validatedExposure.variantId,
      exposedAt: validatedExposure.exposedAt,
      context: validatedExposure.context,
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer')
    });

    res.json({
      success: true,
      message: 'Exposure recorded successfully',
      exposureId: `exposure_${Date.now()}_${Math.random().toString(36).substring(7)}`
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid exposure data',
        details: error.errors
      });
    }

    console.error('Error recording experiment exposure:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * Record experiment conversion
 * Logs conversion events for experiment analysis
 */
export async function recordExperimentConversion(req: Request, res: Response) {
  try {
    const validatedConversion = ExperimentConversionSchema.parse(req.body);
    
    // Log conversion (in production, this would store in database)
    console.log('Experiment conversion:', {
      experimentId: validatedConversion.experimentId,
      variantId: validatedConversion.variantId,
      conversionType: validatedConversion.conversionType,
      value: validatedConversion.value,
      metadata: validatedConversion.metadata,
      convertedAt: validatedConversion.convertedAt,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Conversion recorded successfully',
      conversionId: `conversion_${Date.now()}_${Math.random().toString(36).substring(7)}`
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversion data',
        details: error.errors
      });
    }

    console.error('Error recording experiment conversion:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * Get experiment analytics
 * Returns current experiment performance metrics
 */
export async function getExperimentAnalytics(req: Request, res: Response) {
  try {
    const { experimentId } = req.params;

    if (!experimentId) {
      return res.status(400).json({
        success: false,
        error: 'Experiment ID is required'
      });
    }

    // Mock analytics data (in production, this would query actual metrics)
    const mockAnalytics = {
      experimentId,
      status: 'running',
      durationDays: 7,
      totalParticipants: 1247,
      variantPerformance: [
        {
          variantId: 'control',
          participants: 623,
          exposures: 589,
          conversions: 47,
          conversionRate: 0.0798, // 7.98%
          confidenceInterval: [0.0621, 0.0975],
          isStatisticallySignificant: false
        },
        {
          variantId: 'enhanced_explanation',
          participants: 624,
          exposures: 598,
          conversions: 62,
          conversionRate: 0.1036, // 10.36%
          confidenceInterval: [0.0825, 0.1247],
          isStatisticallySignificant: true
        }
      ],
      overallMetrics: {
        relativeUplift: 0.298, // 29.8% improvement
        pValue: 0.0234,
        confidence: 97.66,
        recommendedAction: 'continue_test',
        estimatedTimeToSignificance: '3-5 days'
      },
      secondaryMetrics: {
        scholarship_detail_views: {
          control: 1.23,
          enhanced_explanation: 1.47,
          uplift: 0.195 // 19.5% increase
        },
        match_engagement_time: {
          control: 24.3, // seconds
          enhanced_explanation: 31.7,
          uplift: 0.304 // 30.4% increase
        },
        explanation_helpful_rating: {
          control: null, // Not shown in control
          enhanced_explanation: 4.2, // out of 5
          uplift: null
        }
      }
    };

    res.json({
      success: true,
      analytics: mockAnalytics,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting experiment analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * List all active experiments
 * Returns overview of running experiments
 */
export async function listActiveExperiments(req: Request, res: Response) {
  try {
    const activeExperiments = [
      {
        id: 'match-explanation-test',
        name: 'Enhanced Match Explanation Test',
        status: 'running',
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        participants: 1247,
        primaryMetric: 'application_click_through_rate',
        currentUplift: 0.298,
        isSignificant: true
      },
      {
        id: 'partner-promotion-display',
        name: 'Partner Promotion Display Test',
        status: 'ramping',
        startDate: new Date().toISOString(),
        participants: 156,
        primaryMetric: 'partner_promotion_click_rate',
        currentUplift: 0.087,
        isSignificant: false
      }
    ];

    res.json({
      success: true,
      experiments: activeExperiments,
      metadata: {
        totalActive: activeExperiments.length,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error listing active experiments:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}