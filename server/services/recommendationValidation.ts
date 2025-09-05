import { db } from '../db';
import { 
  recommendationFixtures,
  recommendationValidations,
  scholarships,
  type RecommendationFixture,
  type InsertRecommendationValidation,
  type StudentProfile
} from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { recommendationEngine } from './recommendationEngine';

interface ValidationMetrics {
  precisionAtN: number;
  recallAtN: number;
  meanAverageScore: number;
  expectedFound: number;
  expectedInTopN: number;
  executionTimeMs: number;
}

interface ValidationResult {
  fixtureId: string;
  fixtureName: string;
  topNResults: string[];
  topNScores: number[];
  metrics: ValidationMetrics;
  status: 'pass' | 'fail' | 'warning';
  details: string[];
}

export class RecommendationValidationService {
  private algorithmVersion = '2.0.0-hybrid';

  /**
   * Validate all active fixtures against the recommendation engine
   */
  async validateAllFixtures(topN: number = 5): Promise<ValidationResult[]> {
    console.log('Starting recommendation validation against all fixtures...');
    
    const fixtures = await db
      .select()
      .from(recommendationFixtures)
      .where(eq(recommendationFixtures.isActive, true))
      .orderBy(desc(recommendationFixtures.createdAt));

    const results: ValidationResult[] = [];

    for (const fixture of fixtures) {
      try {
        const result = await this.validateSingleFixture(fixture, topN);
        results.push(result);

        // Store validation result in database
        await this.storeValidationResult(fixture, result);
      } catch (error) {
        console.error(`Error validating fixture ${fixture.name}:`, error);
        results.push({
          fixtureId: fixture.id,
          fixtureName: fixture.name,
          topNResults: [],
          topNScores: [],
          metrics: {
            precisionAtN: 0,
            recallAtN: 0,
            meanAverageScore: 0,
            expectedFound: 0,
            expectedInTopN: 0,
            executionTimeMs: 0
          },
          status: 'fail',
          details: [`Validation failed: ${error}`]
        });
      }
    }

    console.log(`Completed validation of ${results.length} fixtures`);
    return results;
  }

  /**
   * Validate a single fixture against the recommendation engine
   */
  async validateSingleFixture(
    fixture: RecommendationFixture, 
    topN?: number
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const testTopN = topN || fixture.topNThreshold || 5;

    // Create a temporary student profile from fixture data
    const mockStudent: StudentProfile = {
      ...(fixture.studentProfile as any),
      id: `test_${fixture.id}`,
      userId: `user_test_${fixture.id}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Generate recommendations for the mock student
    const recommendations = await recommendationEngine.generateRecommendations(
      mockStudent.id,
      { 
        topN: testTopN,
        includeInactive: true,
        minScore: 0, // Include all results for validation
        trackInteraction: false
      }
    );

    const topNResults = recommendations.slice(0, testTopN).map(r => r.scholarshipId);
    const topNScores = recommendations.slice(0, testTopN).map(r => r.matchScore ?? 0);

    // Calculate validation metrics
    const metrics = this.calculateValidationMetrics(
      fixture.expectedScholarships,
      topNResults,
      topNScores,
      fixture.minimumScore || 70,
      Date.now() - startTime
    );

    // Determine validation status
    const status = this.determineValidationStatus(fixture, metrics, topNScores);
    const details = this.generateValidationDetails(fixture, recommendations, metrics);

    return {
      fixtureId: fixture.id,
      fixtureName: fixture.name,
      topNResults,
      topNScores,
      metrics,
      status,
      details
    };
  }

  /**
   * Calculate precision, recall, and other validation metrics
   */
  private calculateValidationMetrics(
    expectedScholarships: string[],
    topNResults: string[],
    topNScores: number[],
    minimumScore: number,
    executionTimeMs: number
  ): ValidationMetrics {
    const expectedSet = new Set(expectedScholarships);
    const topNSet = new Set(topNResults);

    // Calculate intersection
    const intersection = topNResults.filter(id => expectedSet.has(id));
    const expectedFound = expectedScholarships.filter(id => topNSet.has(id)).length;
    const expectedInTopN = intersection.length;

    // Precision @ N: How many of the top N recommendations were expected?
    const precisionAtN = topNResults.length > 0 ? expectedInTopN / topNResults.length : 0;

    // Recall @ N: How many of the expected scholarships were found in top N?
    const recallAtN = expectedScholarships.length > 0 ? expectedInTopN / expectedScholarships.length : 0;

    // Mean Average Score of top N results
    const meanAverageScore = topNScores.length > 0 ? 
      topNScores.reduce((sum, score) => sum + score, 0) / topNScores.length : 0;

    return {
      precisionAtN,
      recallAtN,
      meanAverageScore,
      expectedFound,
      expectedInTopN,
      executionTimeMs
    };
  }

  /**
   * Determine if validation passed, failed, or has warnings
   */
  private determineValidationStatus(
    fixture: RecommendationFixture,
    metrics: ValidationMetrics,
    topNScores: number[]
  ): 'pass' | 'fail' | 'warning' {
    const minPrecision = 0.6;  // At least 60% of top N should be expected
    const minRecall = 0.8;     // At least 80% of expected should be in top N
    const minScore = fixture.minimumScore || 70;

    // Check for hard failures
    if (metrics.precisionAtN < minPrecision * 0.5) return 'fail'; // Very low precision
    if (metrics.recallAtN < minRecall * 0.5) return 'fail';       // Very low recall
    if (metrics.meanAverageScore < minScore * 0.8) return 'fail'; // Very low scores

    // Check for warnings
    if (metrics.precisionAtN < minPrecision) return 'warning';
    if (metrics.recallAtN < minRecall) return 'warning';
    if (metrics.meanAverageScore < minScore) return 'warning';
    if (topNScores.some(score => score < minScore * 0.9)) return 'warning';

    return 'pass';
  }

  /**
   * Generate detailed validation feedback
   */
  private generateValidationDetails(
    fixture: RecommendationFixture,
    recommendations: any[],
    metrics: ValidationMetrics
  ): string[] {
    const details: string[] = [];
    const expected = new Set(fixture.expectedScholarships);

    details.push(`Fixture: ${fixture.name}`);
    details.push(`Expected ${fixture.expectedScholarships.length} scholarships in top ${fixture.topNThreshold}`);
    details.push(`Found ${metrics.expectedInTopN} expected scholarships in top results`);
    details.push(`Precision@${fixture.topNThreshold}: ${(metrics.precisionAtN * 100).toFixed(1)}%`);
    details.push(`Recall@${fixture.topNThreshold}: ${(metrics.recallAtN * 100).toFixed(1)}%`);
    details.push(`Mean score: ${metrics.meanAverageScore.toFixed(1)}`);

    // List missing expected scholarships
    const topNIds = new Set(recommendations.slice(0, fixture.topNThreshold).map(r => r.scholarshipId));
    const missing = fixture.expectedScholarships.filter(id => !topNIds.has(id));
    if (missing.length > 0) {
      details.push(`Missing expected scholarships: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '...' : ''}`);
    }

    // List unexpected high-ranked results
    const unexpected = recommendations
      .slice(0, fixture.topNThreshold)
      .filter(r => !expected.has(r.scholarshipId))
      .slice(0, 2);
    
    if (unexpected.length > 0) {
      details.push(`Unexpected high rankings: ${unexpected.map(r => `${r.scholarshipId} (${r.matchScore})`).join(', ')}`);
    }

    details.push(`Execution time: ${metrics.executionTimeMs}ms`);

    return details;
  }

  /**
   * Store validation result in database
   */
  private async storeValidationResult(
    fixture: RecommendationFixture,
    result: ValidationResult
  ): Promise<void> {
    const validationData: InsertRecommendationValidation = {
      fixtureId: fixture.id,
      algorithmVersion: this.algorithmVersion,
      totalScholarships: await this.getTotalScholarshipsCount(),
      topNResults: result.topNResults,
      topNScores: result.topNScores,
      expectedFound: result.metrics.expectedFound,
      expectedInTopN: result.metrics.expectedInTopN,
      precisionAtN: result.metrics.precisionAtN.toString(),
      recallAtN: result.metrics.recallAtN.toString(),
      meanAverageScore: result.metrics.meanAverageScore.toString(),
      executionTimeMs: result.metrics.executionTimeMs
    };

    await db.insert(recommendationValidations).values(validationData);
  }

  /**
   * Get total number of scholarships for context
   */
  private async getTotalScholarshipsCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(scholarships);
    
    return Number(result[0].count);
  }

  /**
   * Get validation history for a specific fixture
   */
  async getValidationHistory(
    fixtureId: string,
    limit: number = 10
  ): Promise<any[]> {
    return await db
      .select()
      .from(recommendationValidations)
      .where(eq(recommendationValidations.fixtureId, fixtureId))
      .orderBy(desc(recommendationValidations.validatedAt))
      .limit(limit);
  }

  /**
   * Generate validation summary report
   */
  async generateValidationSummaryReport(): Promise<{
    totalFixtures: number;
    passedFixtures: number;
    failedFixtures: number;
    warningFixtures: number;
    averagePrecision: number;
    averageRecall: number;
    averageExecutionTime: number;
  }> {
    const results = await this.validateAllFixtures();
    
    const totalFixtures = results.length;
    const passedFixtures = results.filter(r => r.status === 'pass').length;
    const failedFixtures = results.filter(r => r.status === 'fail').length;
    const warningFixtures = results.filter(r => r.status === 'warning').length;

    const averagePrecision = results.reduce((sum, r) => sum + r.metrics.precisionAtN, 0) / totalFixtures;
    const averageRecall = results.reduce((sum, r) => sum + r.metrics.recallAtN, 0) / totalFixtures;
    const averageExecutionTime = results.reduce((sum, r) => sum + r.metrics.executionTimeMs, 0) / totalFixtures;

    return {
      totalFixtures,
      passedFixtures,
      failedFixtures,
      warningFixtures,
      averagePrecision,
      averageRecall,
      averageExecutionTime
    };
  }
}

export const recommendationValidator = new RecommendationValidationService();