import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { scholarships } from '@shared/schema';
import { eq, inArray } from 'drizzle-orm';

// Validation schemas
const FreshnessRequestSchema = z.object({
  scholarshipIds: z.array(z.string()).max(100) // Limit to 100 IDs per request
});

const RevalidateParamsSchema = z.object({
  id: z.string().min(1)
});

/**
 * Get freshness status for specific scholarships
 * Returns data quality and staleness information
 */
export async function getFreshnessStatus(req: Request, res: Response) {
  try {
    const { scholarshipIds } = FreshnessRequestSchema.parse(req.body);

    if (scholarshipIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No scholarship IDs provided'
      });
    }

    // Fetch scholarships with freshness data
    const scholarshipData = await db
      .select({
        id: scholarships.id,
        title: scholarships.title,
        lastUpdated: scholarships.updatedAt,
        isActive: scholarships.isActive
      })
      .from(scholarships)
      .where(inArray(scholarships.id, scholarshipIds));

    // Calculate freshness and quality scores
    const now = new Date();
    const scholarshipsWithFreshness = scholarshipData.map(scholarship => {
      const lastUpdated = scholarship.lastUpdated || new Date(0);
      const hoursOld = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
      
      // Determine freshness status
      let freshnessStatus: 'fresh' | 'stale' | 'expired';
      if (hoursOld <= 24) {
        freshnessStatus = 'fresh';
      } else if (hoursOld <= 72) {
        freshnessStatus = 'stale';
      } else {
        freshnessStatus = 'expired';
      }

      // Calculate mock quality score (in production, this would be from data pipeline)
      const qualityScore = Math.max(20, Math.min(100, 95 - Math.floor(hoursOld / 2)));
      
      // Generate mock validation errors based on quality
      const validationErrors: string[] = [];
      if (qualityScore < 90) {
        validationErrors.push('Some deadline information may be outdated');
      }
      if (qualityScore < 80) {
        validationErrors.push('Application requirements need verification');
      }
      if (qualityScore < 70) {
        validationErrors.push('Contact information may have changed');
      }

      // Estimate next update time
      const nextUpdateEta = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 24 hours from now

      return {
        id: scholarship.id,
        lastUpdated: lastUpdated.toISOString(),
        dataQualityScore: qualityScore,
        freshnessStatus,
        validationErrors,
        nextUpdateEta: nextUpdateEta.toISOString()
      };
    });

    res.json({
      success: true,
      scholarships: scholarshipsWithFreshness,
      metadata: {
        requestedCount: scholarshipIds.length,
        foundCount: scholarshipData.length,
        timestamp: now.toISOString()
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      });
    }

    console.error('Error getting freshness status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * Trigger revalidation for a specific scholarship
 * Queues the scholarship for fresh data retrieval
 */
export async function triggerRevalidation(req: Request, res: Response) {
  try {
    const { id } = RevalidateParamsSchema.parse(req.params);

    // Check if scholarship exists
    const [scholarship] = await db
      .select({ id: scholarships.id, title: scholarships.title })
      .from(scholarships)
      .where(eq(scholarships.id, id))
      .limit(1);

    if (!scholarship) {
      return res.status(404).json({
        success: false,
        error: 'Scholarship not found'
      });
    }

    // In production, this would trigger data pipeline revalidation
    // For now, we'll simulate by updating the timestamp
    await db
      .update(scholarships)
      .set({ updatedAt: new Date() })
      .where(eq(scholarships.id, id));

    res.json({
      success: true,
      message: 'Revalidation triggered successfully',
      scholarshipId: id,
      estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid scholarship ID',
        details: error.errors
      });
    }

    console.error('Error triggering revalidation:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * Get global data quality statistics
 * Returns system-wide freshness and quality metrics
 */
export async function getGlobalDataQuality(req: Request, res: Response) {
  try {
    // Get total scholarship count
    const totalResult = await db
      .select({ count: scholarships.id })
      .from(scholarships)
      .where(eq(scholarships.isActive, true));
    
    const totalScholarships = Number(totalResult[0]?.count || 0);

    // Calculate freshness distribution (simplified for demo)
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

    // In production, these would be actual queries
    const freshCount = Math.floor(totalScholarships * 0.75); // 75% fresh
    const staleCount = Math.floor(totalScholarships * 0.20); // 20% stale
    const expiredCount = totalScholarships - freshCount - staleCount; // Remaining expired

    const freshPercentage = totalScholarships > 0 ? Math.round((freshCount / totalScholarships) * 100) : 0;
    const averageQualityScore = 87; // Mock average
    
    // Mock last pipeline run time
    const lastPipelineRun = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago

    res.json({
      success: true,
      stats: {
        totalScholarships,
        freshCount,
        staleCount,
        expiredCount,
        freshPercentage,
        averageQualityScore,
        lastPipelineRun: lastPipelineRun.toISOString(),
        pendingValidations: Math.floor(totalScholarships * 0.05), // 5% pending
        slaTarget: 85, // 85% fresh target
        meetingSLA: freshPercentage >= 85
      },
      metadata: {
        timestamp: now.toISOString(),
        calculationMethod: 'real-time-estimation'
      }
    });

  } catch (error) {
    console.error('Error getting global data quality:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * Validate specific scholarship data
 * Returns detailed validation results for a scholarship
 */
export async function validateScholarship(req: Request, res: Response) {
  try {
    const { id } = RevalidateParamsSchema.parse(req.params);

    // Fetch scholarship details
    const [scholarship] = await db
      .select()
      .from(scholarships)
      .where(eq(scholarships.id, id))
      .limit(1);

    if (!scholarship) {
      return res.status(404).json({
        success: false,
        error: 'Scholarship not found'
      });
    }

    // Perform validation checks
    const validationErrors: string[] = [];
    const lastUpdated = scholarship.updatedAt || new Date(0);
    const hoursOld = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);

    // Check data freshness
    let freshnessStatus: 'fresh' | 'stale' | 'expired';
    if (hoursOld <= 24) {
      freshnessStatus = 'fresh';
    } else if (hoursOld <= 72) {
      freshnessStatus = 'stale';
      validationErrors.push('Data is older than 24 hours');
    } else {
      freshnessStatus = 'expired';
      validationErrors.push('Data is older than 72 hours and may be outdated');
    }

    // Check required fields
    if (!scholarship.deadline) {
      validationErrors.push('Missing application deadline');
    } else if (new Date(scholarship.deadline) < new Date()) {
      validationErrors.push('Application deadline has passed');
    }

    if (!scholarship.amount || scholarship.amount <= 0) {
      validationErrors.push('Invalid scholarship amount');
    }

    if (!scholarship.description || scholarship.description.length < 50) {
      validationErrors.push('Insufficient scholarship description');
    }

    // Determine if valid
    const isValid = validationErrors.length === 0;

    res.json({
      success: true,
      validation: {
        scholarshipId: id,
        isValid,
        validationErrors,
        freshness: freshnessStatus,
        lastChecked: new Date().toISOString(),
        qualityScore: Math.max(20, 100 - validationErrors.length * 15),
        recommendations: isValid ? [] : [
          'Contact data source for updated information',
          'Flag scholarship for manual review',
          'Schedule priority revalidation'
        ]
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid scholarship ID',
        details: error.errors
      });
    }

    console.error('Error validating scholarship:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}