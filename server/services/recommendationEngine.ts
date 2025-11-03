import { db } from '../db';
import { 
  scholarships, 
  scholarshipMatches, 
  studentProfiles, 
  matchScoringFactors,
  recommendationInteractions,
  type StudentProfile,
  type Scholarship,
  type ScholarshipMatch,
  type InsertMatchScoringFactors
} from '@shared/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { openaiService } from '../openai';

interface ScoringWeights {
  gpa: number;
  major: number;
  demographics: number;
  geography: number;
  extracurriculars: number;
  financialNeed: number;
  academicLevel: number;
  aiAnalysis: number;
}

interface DetailedMatchScore {
  totalScore: number;
  factors: {
    gpaWeight: number;
    majorWeight: number;
    demographicsWeight: number;
    geographyWeight: number;
    extracurricularsWeight: number;
    aiConfidenceScore: number;
  };
  reasoning: string[];
  chanceLevel: 'High Chance' | 'Competitive' | 'Long Shot';
}

interface RecommendationOptions {
  topN?: number;
  includeInactive?: boolean;
  minScore?: number;
  trackInteraction?: boolean;
  sessionId?: string;
}

export class RecommendationEngine {
  private algorithmVersion = '2.0.0-hybrid';
  
  private defaultWeights: ScoringWeights = {
    gpa: 0.25,           // 25% weight for GPA match
    major: 0.20,         // 20% weight for major/field alignment  
    demographics: 0.15,  // 15% weight for demographic requirements
    geography: 0.10,     // 10% weight for location requirements
    extracurriculars: 0.10, // 10% weight for activities/interests
    financialNeed: 0.05,    // 5% weight for financial need
    academicLevel: 0.05,    // 5% weight for academic level
    aiAnalysis: 0.10     // 10% weight for AI comprehensive analysis
  };

  /**
   * Generate top-N scholarship recommendations for a student
   */
  async generateRecommendations(
    studentId: string,
    options: RecommendationOptions = {}
  ): Promise<ScholarshipMatch[]> {
    const startTime = Date.now();
    const { topN = 10, includeInactive = false, minScore = 30, trackInteraction = false, sessionId } = options;

    try {
      // Get student profile
      const [student] = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.id, studentId));

      // Return empty recommendations if student profile doesn't exist
      // This allows new users to see empty state gracefully
      if (!student) {
        console.log(`No student profile found for ${studentId}, returning empty recommendations`);
        return [];
      }

      // Get available scholarships
      const availableScholarships = await db
        .select()
        .from(scholarships)
        .where(
          includeInactive ? sql`1=1` : eq(scholarships.isActive, true)
        )
        .orderBy(desc(scholarships.deadline));

      // Generate detailed scores for all scholarships
      const scoredMatches: (ScholarshipMatch & { detailedScore: DetailedMatchScore })[] = [];

      for (const scholarship of availableScholarships) {
        const detailedScore = await this.calculateDetailedScore(student, scholarship);
        
        if (detailedScore.totalScore >= minScore) {
          const match: ScholarshipMatch & { detailedScore: DetailedMatchScore } = {
            id: `${studentId}_${scholarship.id}`,
            studentId: student.id,
            scholarshipId: scholarship.id,
            matchScore: Math.round(detailedScore.totalScore),
            matchReason: detailedScore.reasoning,
            chanceLevel: detailedScore.chanceLevel,
            explanationMetadata: detailedScore.factors,
            aiCostCents: null,
            isBookmarked: false,
            isDismissed: false,
            createdAt: new Date(),
            detailedScore
          };

          scoredMatches.push(match);
        }
      }

      // Sort by score and take top N
      const topMatches = scoredMatches
        .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
        .slice(0, topN);

      // Store matches in database
      const matchInserts = topMatches.map(match => ({
        studentId: match.studentId,
        scholarshipId: match.scholarshipId,
        matchScore: match.matchScore,
        matchReason: match.matchReason,
        chanceLevel: match.chanceLevel,
        isBookmarked: false,
        isDismissed: false
      }));

      // Upsert matches (insert or update existing)
      for (const matchData of matchInserts) {
        const [existingMatch] = await db
          .select()
          .from(scholarshipMatches)
          .where(
            and(
              eq(scholarshipMatches.studentId, matchData.studentId),
              eq(scholarshipMatches.scholarshipId, matchData.scholarshipId)
            )
          );

        if (existingMatch) {
          // Update existing match
          await db
            .update(scholarshipMatches)
            .set({
              matchScore: matchData.matchScore,
              matchReason: matchData.matchReason,
              chanceLevel: matchData.chanceLevel,
            })
            .where(eq(scholarshipMatches.id, existingMatch.id));
        } else {
          // Insert new match
          const [newMatch] = await db
            .insert(scholarshipMatches)
            .values(matchData)
            .returning();

          // Store detailed scoring factors
          const matchDetail = topMatches.find(m => m.scholarshipId === matchData.scholarshipId);
          const factors: InsertMatchScoringFactors = {
            matchId: newMatch.id,
            gpaWeight: matchDetail?.detailedScore.factors.gpaWeight.toString() || "0",
            majorWeight: matchDetail?.detailedScore.factors.majorWeight.toString() || "0",
            demographicsWeight: matchDetail?.detailedScore.factors.demographicsWeight.toString() || "0",
            geographyWeight: matchDetail?.detailedScore.factors.geographyWeight.toString() || "0",
            extracurricularsWeight: matchDetail?.detailedScore.factors.extracurricularsWeight.toString() || "0",
            aiConfidenceScore: matchDetail?.detailedScore.factors.aiConfidenceScore.toString() || "0",
            algorithmVersion: this.algorithmVersion
          };

          await db.insert(matchScoringFactors).values(factors);
        }
      }

      // Track recommendation view interaction
      if (trackInteraction && student.userId && sessionId) {
        await this.trackRecommendationInteraction(
          student.userId,
          studentId,
          topMatches.map(m => m.scholarshipId),
          'view',
          sessionId
        );
      }

      console.log(`Generated ${topMatches.length} recommendations for student ${studentId} in ${Date.now() - startTime}ms`);
      
      // Return the matches without detailed score data
      return topMatches.map(({ detailedScore, ...match }) => match);

    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }

  /**
   * Calculate detailed match score with factor breakdown
   */
  private async calculateDetailedScore(
    student: StudentProfile,
    scholarship: Scholarship
  ): Promise<DetailedMatchScore> {
    let totalScore = 0;
    const reasoning: string[] = [];
    const factors = {
      gpaWeight: 0,
      majorWeight: 0,
      demographicsWeight: 0,
      geographyWeight: 0,
      extracurricularsWeight: 0,
      aiConfidenceScore: 0
    };

    // 1. GPA Scoring (25% weight)
    const gpaScore = this.scoreGPA(student, scholarship);
    factors.gpaWeight = gpaScore * this.defaultWeights.gpa;
    totalScore += factors.gpaWeight;
    if (gpaScore > 70) reasoning.push(`Strong GPA match (${student.gpa})`);

    // 2. Major/Field Alignment (20% weight)
    const majorScore = this.scoreMajorAlignment(student, scholarship);
    factors.majorWeight = majorScore * this.defaultWeights.major;
    totalScore += factors.majorWeight;
    if (majorScore > 70) reasoning.push(`Major alignment: ${student.major}`);

    // 3. Demographics Scoring (15% weight)
    const demographicsScore = this.scoreDemographics(student, scholarship);
    factors.demographicsWeight = demographicsScore * this.defaultWeights.demographics;
    totalScore += factors.demographicsWeight;
    if (demographicsScore > 70) reasoning.push('Demographics requirements met');

    // 4. Geography Scoring (10% weight)
    const geoScore = this.scoreGeography(student, scholarship);
    factors.geographyWeight = geoScore * this.defaultWeights.geography;
    totalScore += factors.geographyWeight;
    if (geoScore > 70) reasoning.push(`Location match: ${student.location}`);

    // 5. Extracurriculars/Activities (10% weight)
    const activitiesScore = this.scoreExtracurriculars(student, scholarship);
    factors.extracurricularsWeight = activitiesScore * this.defaultWeights.extracurriculars;
    totalScore += factors.extracurricularsWeight;
    if (activitiesScore > 70) reasoning.push('Strong extracurricular alignment');

    // 6. AI Analysis (10% weight) - Use existing OpenAI analysis
    try {
      const aiAnalysis = await openaiService.analyzeScholarshipMatch(student, scholarship);
      const aiScore = aiAnalysis.matchScore;
      factors.aiConfidenceScore = aiScore * this.defaultWeights.aiAnalysis / 100; // Normalize to weight
      totalScore += factors.aiConfidenceScore;
      
      // Add AI reasoning to our reasoning
      if (aiAnalysis.matchReason && aiAnalysis.matchReason.length > 0) {
        reasoning.push(...aiAnalysis.matchReason.slice(0, 2)); // Limit to top 2 AI reasons
      }
    } catch (error) {
      console.warn('AI analysis failed, using rule-based scoring only:', error);
      factors.aiConfidenceScore = 0;
    }

    // Determine chance level based on total score
    let chanceLevel: 'High Chance' | 'Competitive' | 'Long Shot';
    if (totalScore >= 80) chanceLevel = 'High Chance';
    else if (totalScore >= 60) chanceLevel = 'Competitive';
    else chanceLevel = 'Long Shot';

    // Cap total score at 100
    totalScore = Math.min(100, totalScore);

    return {
      totalScore,
      factors,
      reasoning: reasoning.slice(0, 5), // Limit to top 5 reasons
      chanceLevel
    };
  }

  /**
   * Score GPA match against scholarship requirements
   */
  private scoreGPA(student: StudentProfile, scholarship: Scholarship): number {
    if (!student.gpa) return 50; // Neutral score if no GPA

    const gpa = parseFloat(student.gpa.toString());
    const criteria = scholarship.eligibilityCriteria as any;
    
    if (criteria?.minGpa) {
      const minGpa = parseFloat(criteria.minGpa);
      if (gpa >= minGpa + 0.5) return 100; // Well above minimum
      if (gpa >= minGpa + 0.2) return 85;  // Above minimum
      if (gpa >= minGpa) return 70;        // Meets minimum
      if (gpa >= minGpa - 0.2) return 40;  // Close to minimum
      return 20; // Below minimum
    }

    // Default GPA scoring if no specific requirement
    if (gpa >= 3.8) return 90;
    if (gpa >= 3.5) return 80;
    if (gpa >= 3.2) return 70;
    if (gpa >= 2.8) return 60;
    return 50;
  }

  /**
   * Score major/field alignment
   */
  private scoreMajorAlignment(student: StudentProfile, scholarship: Scholarship): number {
    if (!student.major) return 50;

    const studentMajor = student.major.toLowerCase();
    const criteria = scholarship.eligibilityCriteria as any;
    
    // Check if scholarship has major requirements
    if (criteria?.allowedMajors && Array.isArray(criteria.allowedMajors)) {
      const allowedMajors = criteria.allowedMajors.map((m: string) => m.toLowerCase());
      const exactMatch = allowedMajors.some((m: string) => m.includes(studentMajor) || studentMajor.includes(m));
      if (exactMatch) return 100;
      
      // Check for field alignment (STEM, Business, etc.)
      const fieldAlignment = this.checkFieldAlignment(studentMajor, allowedMajors);
      if (fieldAlignment) return 75;
    }

    // Check scholarship title/description for major keywords
    const titleDesc = `${scholarship.title} ${scholarship.description}`.toLowerCase();
    if (titleDesc.includes(studentMajor) || studentMajor.split(' ').some(word => titleDesc.includes(word))) {
      return 85;
    }

    return 60; // Neutral if no specific major requirements
  }

  /**
   * Score demographics match
   */
  private scoreDemographics(student: StudentProfile, scholarship: Scholarship): number {
    const studentDemo = student.demographics as any;
    const criteria = scholarship.eligibilityCriteria as any;
    
    if (!studentDemo || !criteria) return 60; // Neutral if no demographics data

    let score = 60;
    let matches = 0;
    let requirements = 0;

    // Check various demographic criteria
    const demoFields = ['ethnicity', 'gender', 'firstGeneration', 'veteran', 'disability'];
    
    demoFields.forEach(field => {
      if (criteria[field]) {
        requirements++;
        if (studentDemo[field] === criteria[field] || 
            (Array.isArray(criteria[field]) && criteria[field].includes(studentDemo[field]))) {
          matches++;
        }
      }
    });

    if (requirements > 0) {
      score = 40 + (matches / requirements) * 60; // Scale 40-100 based on match rate
    }

    return Math.round(score);
  }

  /**
   * Score geography/location match
   */
  private scoreGeography(student: StudentProfile, scholarship: Scholarship): number {
    if (!student.location) return 60;

    const criteria = scholarship.eligibilityCriteria as any;
    const studentLocation = student.location.toLowerCase();

    if (criteria?.allowedStates && Array.isArray(criteria.allowedStates)) {
      const allowedStates = criteria.allowedStates.map((s: string) => s.toLowerCase());
      const stateMatch = allowedStates.some((state: string) => studentLocation.includes(state));
      if (stateMatch) return 100;
    }

    if (criteria?.allowedRegions && Array.isArray(criteria.allowedRegions)) {
      const allowedRegions = criteria.allowedRegions.map((r: string) => r.toLowerCase());
      const regionMatch = allowedRegions.some((region: string) => studentLocation.includes(region));
      if (regionMatch) return 90;
    }

    // Check for any location mention in scholarship details
    const titleDesc = `${scholarship.title} ${scholarship.description}`.toLowerCase();
    const locationKeywords = studentLocation.split(',').map(l => l.trim());
    const hasLocationMention = locationKeywords.some(keyword => titleDesc.includes(keyword));
    
    if (hasLocationMention) return 80;
    
    return 70; // Neutral if no specific location requirements
  }

  /**
   * Score extracurricular activities alignment
   */
  private scoreExtracurriculars(student: StudentProfile, scholarship: Scholarship): number {
    if (!student.extracurriculars || student.extracurriculars.length === 0) return 50;

    const studentActivities = student.extracurriculars.map(a => a.toLowerCase());
    const titleDesc = `${scholarship.title} ${scholarship.description} ${scholarship.requirements?.join(' ')}`.toLowerCase();
    
    let matchScore = 50;
    let matches = 0;

    // Check for activity keywords in scholarship details
    const activityKeywords = [
      'leadership', 'volunteer', 'community', 'service', 'sports', 'athletic',
      'music', 'art', 'drama', 'debate', 'robotics', 'science', 'research',
      'internship', 'work', 'employment', 'club', 'organization'
    ];

    studentActivities.forEach(activity => {
      if (titleDesc.includes(activity)) {
        matches++;
        matchScore += 10;
      }
      
      // Check for keyword matches
      activityKeywords.forEach(keyword => {
        if (activity.includes(keyword) && titleDesc.includes(keyword)) {
          matches++;
          matchScore += 5;
        }
      });
    });

    return Math.min(100, matchScore);
  }

  /**
   * Check if student major aligns with scholarship field
   */
  private checkFieldAlignment(studentMajor: string, allowedMajors: string[]): boolean {
    const stemFields = ['engineering', 'computer', 'mathematics', 'physics', 'chemistry', 'biology', 'science'];
    const businessFields = ['business', 'economics', 'finance', 'accounting', 'marketing', 'management'];
    const humanitiesFields = ['english', 'history', 'philosophy', 'literature', 'languages', 'arts'];
    
    const getFieldCategory = (major: string) => {
      major = major.toLowerCase();
      if (stemFields.some(field => major.includes(field))) return 'stem';
      if (businessFields.some(field => major.includes(field))) return 'business';
      if (humanitiesFields.some(field => major.includes(field))) return 'humanities';
      return 'other';
    };

    const studentCategory = getFieldCategory(studentMajor);
    
    return allowedMajors.some(allowedMajor => {
      const allowedCategory = getFieldCategory(allowedMajor);
      return studentCategory === allowedCategory;
    });
  }

  /**
   * Track recommendation interactions for KPI analysis
   */
  async trackRecommendationInteraction(
    userId: string,
    studentId: string,
    scholarshipIds: string[],
    interactionType: string,
    sessionId?: string
  ): Promise<void> {
    try {
      const interactions = scholarshipIds.map((scholarshipId, index) => ({
        userId,
        studentId,
        scholarshipId,
        interactionType,
        recommendationRank: index + 1,
        sessionId,
        timestamp: new Date(),
      }));

      await db.insert(recommendationInteractions).values(interactions);
    } catch (error) {
      console.error('Error tracking recommendation interaction:', error);
    }
  }

  /**
   * Get recommendation performance metrics
   */
  async getRecommendationMetrics(dateFrom: Date, dateTo: Date) {
    const metrics = await db
      .select({
        totalRecommendations: sql<number>`count(*)`,
        totalClicks: sql<number>`count(case when interaction_type = 'click_details' then 1 end)`,
        totalSaves: sql<number>`count(case when interaction_type = 'save' then 1 end)`,
        totalApplies: sql<number>`count(case when interaction_type = 'apply' then 1 end)`,
        avgRank: sql<number>`avg(recommendation_rank)::numeric(5,2)`,
      })
      .from(recommendationInteractions)
      .where(
        and(
          sql`timestamp >= ${dateFrom}`,
          sql`timestamp <= ${dateTo}`
        )
      );

    const result = metrics[0];
    return {
      totalRecommendations: Number(result.totalRecommendations),
      totalClicks: Number(result.totalClicks),
      totalSaves: Number(result.totalSaves),
      totalApplies: Number(result.totalApplies),
      clickThroughRate: result.totalRecommendations > 0 ? Number(result.totalClicks) / Number(result.totalRecommendations) : 0,
      saveRate: result.totalRecommendations > 0 ? Number(result.totalSaves) / Number(result.totalRecommendations) : 0,
      applyRate: result.totalRecommendations > 0 ? Number(result.totalApplies) / Number(result.totalRecommendations) : 0,
      averageRecommendationRank: Number(result.avgRank) || 0,
    };
  }
}

export const recommendationEngine = new RecommendationEngine();