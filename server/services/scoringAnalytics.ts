import { matchScoringService } from './matchScoringService';
import type { StudentProfile, Scholarship } from '@shared/schema';

interface CohortAnalysisResult {
  cohortSize: number;
  totalMatches: number;
  avgMatchesPerStudent: number;
  ctrProjection: number;
  distribution: {
    high: { count: number; percentage: number };
    competitive: { count: number; percentage: number };
    longShot: { count: number; percentage: number };
  };
  topImprovementLevers: Array<{
    lever: string;
    studentsAffected: number;
    potentialCtrLift: number;
    description: string;
  }>;
  costAnalysis: {
    totalAiCostCents: number;
    avgCostPerStudent: number;
    totalMillicredits: number;
  };
}

interface ValidationResult {
  testedScholarships: number;
  thresholdOnlyCount: number;
  passedValidation: boolean;
  infinityScoresFound: number;
  divisionByZeroErrors: number;
  costTelemetry: {
    totalMillicredits: number;
    totalCostUsd: number;
    avgCostPerScholarship: number;
  };
  sampleResults: Array<{
    scholarshipId: string;
    title: string;
    matchScore: number;
    isValid: boolean;
    error?: string;
  }>;
}

interface MatchPerformanceReport {
  period: string;
  matchCtr: number;
  targetCtr: number;
  ctrStatus: 'above_target' | 'on_target' | 'below_target';
  totalMatches: number;
  totalClicks: number;
  aiCostPerStudent: number;
  arpuUplift: number;
  breakdown: {
    highMatches: { count: number; ctr: number };
    competitiveMatches: { count: number; ctr: number };
    longShotMatches: { count: number; ctr: number };
  };
}

interface DiagnosticsResult {
  scanDate: string;
  totalStudents: number;
  totalMatches: number;
  anomalies: {
    invalidScores: Array<{
      matchId: number;
      studentId: number;
      scholarshipId: number;
      score: number;
      reason: string;
    }>;
    emptyMatchSets: Array<{
      studentId: number;
      profileCompleteness: number;
      reason: string;
    }>;
    extremeScores: Array<{
      matchId: number;
      score: number;
      chanceLevel: string;
      reason: string;
    }>;
  };
  sampleExplanations: Array<{
    matchId: number;
    score: number;
    chanceLevel: string;
    explanationMetadata: any;
  }>;
  recommendations: string[];
}

export const scoringAnalytics = {
  /**
   * Daily Ops: Analyze cohort scoring performance
   */
  async analyzeCohort(
    profiles: StudentProfile[],
    scholarships: Scholarship[]
  ): Promise<CohortAnalysisResult> {
    const cohortSize = profiles.length;
    let totalMatches = 0;
    let highCount = 0;
    let competitiveCount = 0;
    let longShotCount = 0;
    let totalAiCostCents = 0;

    // Track improvement opportunities per student (deduplicated)
    const studentImprovements = new Map<string, Set<string>>();
    profiles.forEach(p => {
      studentImprovements.set(p.id, new Set());
    });

    // Score all students against all scholarships - only count viable matches
    const VIABLE_MATCH_THRESHOLD = 50; // Only count Competitive+ (>=50 score)
    
    for (const profile of profiles) {
      for (const scholarship of scholarships) {
        const matchResult = matchScoringService.calculateMatch(profile, {
          title: scholarship.title,
          requirements: scholarship.requirements,
          eligibilityCriteria: scholarship.eligibilityCriteria,
          amount: scholarship.amount,
          organization: scholarship.organization,
          deadline: scholarship.deadline,
        });

        totalAiCostCents += 10; // $0.10 per analysis (cost incurred regardless)

        // Only count as match if score meets threshold (Competitive or High Chance)
        if (matchResult.matchScore >= VIABLE_MATCH_THRESHOLD) {
          totalMatches++;
          
          // Count by chance level
          if (matchResult.chanceLevel === 'High Chance') highCount++;
          else if (matchResult.chanceLevel === 'Competitive') competitiveCount++;
          else longShotCount++;
        }

        // Track improvement opportunities per student (deduplicated)
        const metadata = matchResult.explanationMetadata;
        const gpaExp = metadata.explanations.find(e => e.category === 'GPA Alignment');
        const majorExp = metadata.explanations.find(e => e.category === 'Major Match');
        const locationExp = metadata.explanations.find(e => e.category === 'Location Alignment');
        const interestsExp = metadata.explanations.find(e => e.category === 'Interest Match');
        const demographicsExp = metadata.explanations.find(e => e.category === 'Demographic Fit');
        const financialExp = metadata.explanations.find(e => e.category === 'Financial Need');
        
        const studentLevers = studentImprovements.get(profile.id);
        if (studentLevers) {
          if (gpaExp && gpaExp.score < 70) studentLevers.add('gpaImprovement');
          if (majorExp && majorExp.score < 60) studentLevers.add('majorMismatch');
          if (locationExp && locationExp.score < 60) studentLevers.add('locationMismatch');
          if (interestsExp && interestsExp.score < 50) studentLevers.add('incompleteInterests');
          if (demographicsExp && demographicsExp.score < 50) studentLevers.add('missingDemographics');
          if (financialExp && financialExp.score < 50) studentLevers.add('financialNeedUnclear');
        }
      }
    }

    // Count unique students per improvement lever
    const improvementTracker = {
      gpaImprovement: 0,
      majorMismatch: 0,
      locationMismatch: 0,
      incompleteInterests: 0,
      missingDemographics: 0,
      financialNeedUnclear: 0,
    };

    studentImprovements.forEach(levers => {
      if (levers.has('gpaImprovement')) improvementTracker.gpaImprovement++;
      if (levers.has('majorMismatch')) improvementTracker.majorMismatch++;
      if (levers.has('locationMismatch')) improvementTracker.locationMismatch++;
      if (levers.has('incompleteInterests')) improvementTracker.incompleteInterests++;
      if (levers.has('missingDemographics')) improvementTracker.missingDemographics++;
      if (levers.has('financialNeedUnclear')) improvementTracker.financialNeedUnclear++;
    });

    // Calculate CTR projection based on historical data
    // High: 55% CTR, Competitive: 35% CTR, Long Shot: 15% CTR
    const projectedClicks =
      highCount * 0.55 + competitiveCount * 0.35 + longShotCount * 0.15;
    const ctrProjection = totalMatches > 0 ? (projectedClicks / totalMatches) * 100 : 0;
    
    // Guard against division by zero in distribution percentages
    const safePercentage = (count: number) => 
      totalMatches > 0 ? Math.round((count / totalMatches) * 10000) / 100 : 0;

    // Identify top 5 improvement levers (CTR lift based on student cohort size, not match count)
    const levers = [
      {
        lever: 'GPA Profile Optimization',
        studentsAffected: improvementTracker.gpaImprovement,
        potentialCtrLift: (improvementTracker.gpaImprovement / cohortSize) * 15,
        description: 'Students below minimum GPA requirements - recommend test prep or alternative scholarships',
      },
      {
        lever: 'Major Alignment',
        studentsAffected: improvementTracker.majorMismatch,
        potentialCtrLift: (improvementTracker.majorMismatch / cohortSize) * 12,
        description: 'Students applying to scholarships outside their field - improve targeting',
      },
      {
        lever: 'Location Preference Clarification',
        studentsAffected: improvementTracker.locationMismatch,
        potentialCtrLift: (improvementTracker.locationMismatch / cohortSize) * 8,
        description: 'Geographic misalignment - surface in-state or local opportunities',
      },
      {
        lever: 'Interest Profile Completion',
        studentsAffected: improvementTracker.incompleteInterests,
        potentialCtrLift: (improvementTracker.incompleteInterests / cohortSize) * 10,
        description: 'Incomplete interest data - prompt students to add extracurriculars and hobbies',
      },
      {
        lever: 'Demographic Data Collection',
        studentsAffected: improvementTracker.missingDemographics,
        potentialCtrLift: (improvementTracker.missingDemographics / cohortSize) * 7,
        description: 'Missing demographic information - encourage optional profile completion',
      },
    ]
      .sort((a, b) => b.potentialCtrLift - a.potentialCtrLift)
      .slice(0, 5);

    return {
      cohortSize,
      totalMatches,
      avgMatchesPerStudent: cohortSize > 0 ? totalMatches / cohortSize : 0,
      ctrProjection: Math.round(ctrProjection * 100) / 100,
      distribution: {
        high: {
          count: highCount,
          percentage: safePercentage(highCount),
        },
        competitive: {
          count: competitiveCount,
          percentage: safePercentage(competitiveCount),
        },
        longShot: {
          count: longShotCount,
          percentage: safePercentage(longShotCount),
        },
      },
      topImprovementLevers: levers,
      costAnalysis: {
        totalAiCostCents,
        avgCostPerStudent: cohortSize > 0 ? totalAiCostCents / cohortSize : 0,
        totalMillicredits: totalAiCostCents * 10,
      },
    };
  },

  /**
   * Release/Validation: Test division-by-zero guard
   */
  validateThresholdScholarships(
    testProfile: StudentProfile,
    scholarships: Array<{ title: string; minGpa?: number; recommendedGpa?: number }>
  ): ValidationResult {
    const results: ValidationResult = {
      testedScholarships: scholarships.length,
      thresholdOnlyCount: 0,
      passedValidation: true,
      infinityScoresFound: 0,
      divisionByZeroErrors: 0,
      costTelemetry: {
        totalMillicredits: 0,
        totalCostUsd: 0,
        avgCostPerScholarship: 0,
      },
      sampleResults: [],
    };

    for (const scholarship of scholarships) {
      const isThresholdOnly =
        scholarship.minGpa &&
        (!scholarship.recommendedGpa || scholarship.minGpa === scholarship.recommendedGpa);

      if (isThresholdOnly) {
        results.thresholdOnlyCount++;
      }

      try {
        const matchResult = matchScoringService.calculateMatch(testProfile, {
          title: scholarship.title,
          requirements: [`Minimum GPA: ${scholarship.minGpa || 'None'}`],
          eligibilityCriteria: `Recommended GPA: ${scholarship.recommendedGpa || scholarship.minGpa || 'None'}`,
          amount: 5000,
          organization: 'Test Org',
          deadline: new Date(),
        });

        const isValid =
          isFinite(matchResult.matchScore) &&
          matchResult.matchScore >= 0 &&
          matchResult.matchScore <= 100;

        if (!isValid) {
          results.passedValidation = false;
          if (!isFinite(matchResult.matchScore)) {
            results.infinityScoresFound++;
          }
        }

        results.sampleResults.push({
          scholarshipId: `test-${scholarship.title}`,
          title: scholarship.title,
          matchScore: matchResult.matchScore,
          isValid,
          error: isValid ? undefined : 'Invalid score range or Infinity detected',
        });

        // Track cost
        results.costTelemetry.totalMillicredits += 100; // 10 cents = 100 millicredits
        results.costTelemetry.totalCostUsd += 0.1;
      } catch (error) {
        results.passedValidation = false;
        results.divisionByZeroErrors++;
        results.sampleResults.push({
          scholarshipId: `test-${scholarship.title}`,
          title: scholarship.title,
          matchScore: 0,
          isValid: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    results.costTelemetry.avgCostPerScholarship =
      results.costTelemetry.totalCostUsd / scholarships.length;

    return results;
  },

  /**
   * KPI/Reporting: Calculate match CTR performance
   */
  calculateMatchPerformance(
    matches: Array<{
      id: number;
      matchScore: number;
      chanceLevel: string;
      clicked?: boolean;
      aiCostCents?: number;
    }>,
    students: Array<{ id: number; creditsPurchased?: number }>,
    period: string = 'D0-D3'
  ): MatchPerformanceReport {
    const totalMatches = matches.length;
    const totalClicks = matches.filter((m) => m.clicked).length;
    const matchCtr = totalMatches > 0 ? (totalClicks / totalMatches) * 100 : 0;
    const targetCtr = 35;

    // Breakdown by chance level
    const highMatches = matches.filter((m) => m.chanceLevel === 'High Chance' || m.chanceLevel === 'High');
    const competitiveMatches = matches.filter((m) => m.chanceLevel === 'Competitive');
    const longShotMatches = matches.filter((m) => m.chanceLevel === 'Long Shot');

    const highCtr = highMatches.length > 0
      ? (highMatches.filter((m) => m.clicked).length / highMatches.length) * 100
      : 0;
    const competitiveCtr = competitiveMatches.length > 0
      ? (competitiveMatches.filter((m) => m.clicked).length / competitiveMatches.length) * 100
      : 0;
    const longShotCtr = longShotMatches.length > 0
      ? (longShotMatches.filter((m) => m.clicked).length / longShotMatches.length) * 100
      : 0;

    // Calculate AI cost per student
    const totalAiCost = matches.reduce((sum, m) => sum + (m.aiCostCents || 0), 0);
    const aiCostPerStudent = students.length > 0 ? totalAiCost / students.length / 100 : 0; // Convert to USD

    // Calculate ARPU uplift from match-driven credit spend
    const totalCreditsPurchased = students.reduce((sum, s) => sum + (s.creditsPurchased || 0), 0);
    const arpuUplift = students.length > 0 ? totalCreditsPurchased / students.length : 0;

    return {
      period,
      matchCtr: Math.round(matchCtr * 100) / 100,
      targetCtr,
      ctrStatus: matchCtr >= targetCtr ? 'above_target' : matchCtr >= targetCtr * 0.9 ? 'on_target' : 'below_target',
      totalMatches,
      totalClicks,
      aiCostPerStudent: Math.round(aiCostPerStudent * 100) / 100,
      arpuUplift: Math.round(arpuUplift * 100) / 100,
      breakdown: {
        highMatches: { count: highMatches.length, ctr: Math.round(highCtr * 100) / 100 },
        competitiveMatches: { count: competitiveMatches.length, ctr: Math.round(competitiveCtr * 100) / 100 },
        longShotMatches: { count: longShotMatches.length, ctr: Math.round(longShotCtr * 100) / 100 },
      },
    };
  },

  /**
   * Incident: Scan for anomalies and diagnostics
   */
  async scanForAnomalies(
    matches: Array<{
      id: number;
      studentId: number;
      scholarshipId: number;
      matchScore: number;
      chanceLevel: string;
      explanationMetadata?: any;
    }>,
    profiles: StudentProfile[]
  ): Promise<DiagnosticsResult> {
    const result: DiagnosticsResult = {
      scanDate: new Date().toISOString(),
      totalStudents: profiles.length,
      totalMatches: matches.length,
      anomalies: {
        invalidScores: [],
        emptyMatchSets: [],
        extremeScores: [],
      },
      sampleExplanations: [],
      recommendations: [],
    };

    // Scan for invalid scores
    for (const match of matches) {
      if (!isFinite(match.matchScore) || match.matchScore < 0 || match.matchScore > 100) {
        result.anomalies.invalidScores.push({
          matchId: match.id,
          studentId: match.studentId,
          scholarshipId: match.scholarshipId,
          score: match.matchScore,
          reason: 'Score outside valid range [0-100] or Infinity/NaN',
        });
      }

      // Check for extreme scores (very low matches that shouldn't exist)
      if (match.matchScore < 20 && (match.chanceLevel === 'High Chance' || match.chanceLevel === 'High')) {
        result.anomalies.extremeScores.push({
          matchId: match.id,
          score: match.matchScore,
          chanceLevel: match.chanceLevel,
          reason: 'Chance level mismatch: Low score marked as High',
        });
      }
    }

    // Scan for students with empty match sets
    const studentMatchCounts = new Map<string, number>();
    for (const match of matches) {
      const studentIdStr = String(match.studentId);
      studentMatchCounts.set(studentIdStr, (studentMatchCounts.get(studentIdStr) || 0) + 1);
    }

    for (const profile of profiles) {
      const matchCount = studentMatchCounts.get(profile.id) || 0;
      if (matchCount === 0) {
        // Calculate profile completeness
        let completeness = 0;
        if (profile.gpa) completeness += 20;
        if (profile.major) completeness += 20;
        if (profile.location) completeness += 15;
        if (profile.interests && profile.interests.length > 0) completeness += 15;
        if (profile.demographics) completeness += 15;
        if (profile.financialNeed !== null) completeness += 15;

        result.anomalies.emptyMatchSets.push({
          studentId: profile.id as any,
          profileCompleteness: completeness,
          reason:
            completeness < 50
              ? 'Incomplete profile - missing critical fields'
              : 'No matching scholarships found despite complete profile',
        });
      }
    }

    // Collect sample explanations (5 from each category)
    const highMatchesSample = matches.filter((m) => m.chanceLevel === 'High Chance' || m.chanceLevel === 'High').slice(0, 5);
    const competitiveMatchesSample = matches.filter((m) => m.chanceLevel === 'Competitive').slice(0, 5);
    const longShotMatchesSample = matches.filter((m) => m.chanceLevel === 'Long Shot').slice(0, 5);

    result.sampleExplanations = [...highMatchesSample, ...competitiveMatchesSample, ...longShotMatchesSample].map(
      (m) => ({
        matchId: m.id,
        score: m.matchScore,
        chanceLevel: m.chanceLevel,
        explanationMetadata: m.explanationMetadata,
      })
    );

    // Generate recommendations
    if (result.anomalies.invalidScores.length > 0) {
      result.recommendations.push(
        `CRITICAL: Found ${result.anomalies.invalidScores.length} invalid scores. Run validation endpoint to identify root cause.`
      );
    }

    if (result.anomalies.emptyMatchSets.length > 0) {
      result.recommendations.push(
        `Found ${result.anomalies.emptyMatchSets.length} students with no matches. ${result.anomalies.emptyMatchSets.filter((s) => s.profileCompleteness < 50).length} have incomplete profiles - trigger onboarding completion flow.`
      );
    }

    if (result.anomalies.extremeScores.length > 0) {
      result.recommendations.push(
        `Found ${result.anomalies.extremeScores.length} chance level mismatches. Review scoring thresholds in matchScoringService.`
      );
    }

    if (result.anomalies.invalidScores.length === 0 && result.anomalies.emptyMatchSets.length === 0) {
      result.recommendations.push('✅ All systems operational. No anomalies detected.');
    }

    return result;
  },
};
