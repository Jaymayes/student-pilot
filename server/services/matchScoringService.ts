/**
 * Predictive Match Scoring Service
 * Generates detailed scholarship match scores with explanation metadata
 */

import type { StudentProfile } from '@shared/schema';

export interface ScholarshipData {
  title: string;
  requirements: string[] | null;
  eligibilityCriteria: any;
  amount: number;
  organization: string;
  deadline: Date;
}

export interface MatchExplanation {
  category: string;
  score: number; // 0-100 for this category
  weight: number; // How much this affects overall score
  details: string;
  impact: 'high' | 'medium' | 'low';
}

export interface MatchScoringResult {
  matchScore: number; // Overall 0-100
  matchReason: string[];
  chanceLevel: 'High Chance' | 'Competitive' | 'Long Shot';
  explanationMetadata: {
    explanations: MatchExplanation[];
    breakdown: {
      gpaAlignment: number;
      majorAlignment: number;
      locationMatch: number;
      interestsMatch: number;
      demographicsMatch: number;
      financialNeedAlignment: number;
    };
    strengths: string[];
    improvements: string[];
    competitivenessAnalysis: string;
  };
}

export class MatchScoringService {
  /**
   * Calculate GPA alignment score
   */
  private calculateGPAAlignment(
    studentGPA: number | null,
    eligibilityCriteria: any
  ): MatchExplanation {
    const minGPA = eligibilityCriteria?.minGPA || 0;
    const recommendedGPA = eligibilityCriteria?.recommendedGPA || minGPA;
    
    if (!studentGPA) {
      return {
        category: 'GPA Alignment',
        score: 50,
        weight: 0.25,
        details: 'GPA not provided - unable to assess alignment',
        impact: 'high'
      };
    }

    let score = 0;
    let details = '';
    let impact: 'high' | 'medium' | 'low' = 'medium';

    if (studentGPA >= recommendedGPA) {
      score = 100;
      details = `Your GPA (${studentGPA}) exceeds the recommended ${recommendedGPA}`;
      impact = 'high';
    } else if (studentGPA >= minGPA) {
      const range = recommendedGPA - minGPA;
      
      // Guard against division by zero when min === recommended
      if (range === 0) {
        score = 100; // Meets the only threshold
        details = `Your GPA (${studentGPA}) meets the ${minGPA} requirement`;
        impact = 'high';
      } else {
        const position = studentGPA - minGPA;
        score = 60 + (position / range) * 40; // 60-100
        details = `Your GPA (${studentGPA}) meets minimum (${minGPA}) but below recommended (${recommendedGPA})`;
        impact = 'medium';
      }
    } else {
      score = Math.max(0, (studentGPA / minGPA) * 60);
      details = `Your GPA (${studentGPA}) is below minimum requirement (${minGPA})`;
      impact = 'high';
    }

    return {
      category: 'GPA Alignment',
      score: Math.round(score),
      weight: 0.25,
      details,
      impact
    };
  }

  /**
   * Calculate major/field of study alignment
   */
  private calculateMajorAlignment(
    studentMajor: string | null,
    eligibilityCriteria: any
  ): MatchExplanation {
    const targetMajors = eligibilityCriteria?.majors || [];
    const fieldOfStudy = eligibilityCriteria?.fieldOfStudy || [];
    
    if (targetMajors.length === 0 && fieldOfStudy.length === 0) {
      return {
        category: 'Major Alignment',
        score: 100,
        weight: 0.20,
        details: 'Open to all majors',
        impact: 'low'
      };
    }

    if (!studentMajor) {
      return {
        category: 'Major Alignment',
        score: 50,
        weight: 0.20,
        details: 'Major not specified - unable to assess alignment',
        impact: 'medium'
      };
    }

    const majorLower = studentMajor.toLowerCase();
    const exactMatch = targetMajors.some((m: string) => m.toLowerCase() === majorLower);
    const fieldMatch = fieldOfStudy.some((f: string) => majorLower.includes(f.toLowerCase()));

    if (exactMatch) {
      return {
        category: 'Major Alignment',
        score: 100,
        weight: 0.20,
        details: `Perfect match: Your major (${studentMajor}) is specifically targeted`,
        impact: 'high'
      };
    } else if (fieldMatch) {
      return {
        category: 'Major Alignment',
        score: 75,
        weight: 0.20,
        details: `Good match: Your major (${studentMajor}) aligns with target field`,
        impact: 'medium'
      };
    } else {
      return {
        category: 'Major Alignment',
        score: 30,
        weight: 0.20,
        details: `Limited match: Your major (${studentMajor}) differs from target majors`,
        impact: 'medium'
      };
    }
  }

  /**
   * Calculate location proximity match
   */
  private calculateLocationMatch(
    studentLocation: string | null,
    eligibilityCriteria: any
  ): MatchExplanation {
    const targetLocations = eligibilityCriteria?.locations || [];
    const targetStates = eligibilityCriteria?.states || [];
    
    if (targetLocations.length === 0 && targetStates.length === 0) {
      return {
        category: 'Location Match',
        score: 100,
        weight: 0.15,
        details: 'No location restrictions',
        impact: 'low'
      };
    }

    if (!studentLocation) {
      return {
        category: 'Location Match',
        score: 50,
        weight: 0.15,
        details: 'Location not specified',
        impact: 'low'
      };
    }

    const locationLower = studentLocation.toLowerCase();
    const exactMatch = targetLocations.some((l: string) => locationLower.includes(l.toLowerCase()));
    const stateMatch = targetStates.some((s: string) => locationLower.includes(s.toLowerCase()));

    if (exactMatch) {
      return {
        category: 'Location Match',
        score: 100,
        weight: 0.15,
        details: `Perfect match: You're in a target location`,
        impact: 'high'
      };
    } else if (stateMatch) {
      return {
        category: 'Location Match',
        score: 85,
        weight: 0.15,
        details: `Good match: Your state is eligible`,
        impact: 'medium'
      };
    } else {
      return {
        category: 'Location Match',
        score: 20,
        weight: 0.15,
        details: `Your location may not be eligible`,
        impact: 'high'
      };
    }
  }

  /**
   * Calculate interests alignment
   */
  private calculateInterestsMatch(
    studentInterests: string[] | null,
    eligibilityCriteria: any
  ): MatchExplanation {
    const targetInterests = eligibilityCriteria?.interests || [];
    const targetActivities = eligibilityCriteria?.activities || [];
    
    if (targetInterests.length === 0 && targetActivities.length === 0) {
      return {
        category: 'Interests Match',
        score: 100,
        weight: 0.10,
        details: 'No specific interest requirements',
        impact: 'low'
      };
    }

    if (!studentInterests || studentInterests.length === 0) {
      return {
        category: 'Interests Match',
        score: 50,
        weight: 0.10,
        details: 'Interests not specified',
        impact: 'low'
      };
    }

    const allTargets = [...targetInterests, ...targetActivities].map(i => i.toLowerCase());
    const matches = studentInterests.filter(interest =>
      allTargets.some(target => interest.toLowerCase().includes(target) || target.includes(interest.toLowerCase()))
    );

    const matchPercentage = matches.length / Math.max(allTargets.length, 1);
    const score = Math.min(100, 50 + matchPercentage * 50);

    return {
      category: 'Interests Match',
      score: Math.round(score),
      weight: 0.10,
      details: `${matches.length} of your interests align with scholarship focus`,
      impact: matches.length > 0 ? 'medium' : 'low'
    };
  }

  /**
   * Calculate demographics alignment
   */
  private calculateDemographicsMatch(
    demographics: any,
    eligibilityCriteria: any
  ): MatchExplanation {
    const targetDemographics = eligibilityCriteria?.demographics || {};
    
    if (Object.keys(targetDemographics).length === 0) {
      return {
        category: 'Demographics Match',
        score: 100,
        weight: 0.10,
        details: 'Open to all demographics',
        impact: 'low'
      };
    }

    if (!demographics || Object.keys(demographics).length === 0) {
      return {
        category: 'Demographics Match',
        score: 50,
        weight: 0.10,
        details: 'Demographics not specified',
        impact: 'low'
      };
    }

    let matches = 0;
    let total = 0;

    for (const [key, targetValue] of Object.entries(targetDemographics)) {
      if (targetValue) {
        total++;
        if (demographics[key] && demographics[key] === targetValue) {
          matches++;
        }
      }
    }

    const score = total > 0 ? (matches / total) * 100 : 100;

    return {
      category: 'Demographics Match',
      score: Math.round(score),
      weight: 0.10,
      details: matches > 0 
        ? `You match ${matches} of ${total} target demographic criteria`
        : 'Demographics may not fully align',
      impact: matches > 0 ? 'medium' : 'low'
    };
  }

  /**
   * Calculate financial need alignment
   */
  private calculateFinancialNeedAlignment(
    financialNeed: boolean,
    eligibilityCriteria: any
  ): MatchExplanation {
    const needBased = eligibilityCriteria?.needBased || false;
    
    if (!needBased) {
      return {
        category: 'Financial Need',
        score: 100,
        weight: 0.10,
        details: 'Not need-based - financial need not required',
        impact: 'low'
      };
    }

    if (financialNeed) {
      return {
        category: 'Financial Need',
        score: 100,
        weight: 0.10,
        details: 'Excellent match: You qualify for need-based award',
        impact: 'high'
      };
    } else {
      return {
        category: 'Financial Need',
        score: 30,
        weight: 0.10,
        details: 'This is a need-based scholarship - may not qualify',
        impact: 'high'
      };
    }
  }

  /**
   * Generate comprehensive match score with detailed explanations
   */
  calculateMatch(
    profile: StudentProfile,
    scholarship: ScholarshipData
  ): MatchScoringResult {
    // Generate all explanation components
    const gpaExplanation = this.calculateGPAAlignment(
      profile.gpa ? Number(profile.gpa) : null,
      scholarship.eligibilityCriteria
    );

    const majorExplanation = this.calculateMajorAlignment(
      profile.major,
      scholarship.eligibilityCriteria
    );

    const locationExplanation = this.calculateLocationMatch(
      profile.location,
      scholarship.eligibilityCriteria
    );

    const interestsExplanation = this.calculateInterestsMatch(
      profile.interests,
      scholarship.eligibilityCriteria
    );

    const demographicsExplanation = this.calculateDemographicsMatch(
      profile.demographics,
      scholarship.eligibilityCriteria
    );

    const financialExplanation = this.calculateFinancialNeedAlignment(
      profile.financialNeed || false,
      scholarship.eligibilityCriteria
    );

    const explanations = [
      gpaExplanation,
      majorExplanation,
      locationExplanation,
      interestsExplanation,
      demographicsExplanation,
      financialExplanation
    ];

    // Calculate weighted overall score
    const matchScore = Math.round(
      explanations.reduce((total, exp) => total + (exp.score * exp.weight), 0)
    );

    // Determine chance level
    let chanceLevel: 'High Chance' | 'Competitive' | 'Long Shot';
    if (matchScore >= 75) chanceLevel = 'High Chance';
    else if (matchScore >= 50) chanceLevel = 'Competitive';
    else chanceLevel = 'Long Shot';

    // Generate match reasons (top factors)
    const matchReason = explanations
      .filter(exp => exp.score >= 70 && exp.impact !== 'low')
      .map(exp => exp.details)
      .slice(0, 3);

    // Generate strengths and improvements
    const strengths = explanations
      .filter(exp => exp.score >= 75)
      .map(exp => exp.details);

    const improvements = explanations
      .filter(exp => exp.score < 60 && exp.impact === 'high')
      .map(exp => exp.details);

    // Generate competitiveness analysis
    let competitivenessAnalysis = '';
    if (matchScore >= 85) {
      competitivenessAnalysis = 'Excellent match - you\'re a strong candidate for this scholarship';
    } else if (matchScore >= 70) {
      competitivenessAnalysis = 'Good match - competitive application expected';
    } else if (matchScore >= 50) {
      competitivenessAnalysis = 'Moderate match - consider strengthening weak areas';
    } else {
      competitivenessAnalysis = 'Limited match - focus on higher-match opportunities';
    }

    return {
      matchScore,
      matchReason: matchReason.length > 0 ? matchReason : ['General alignment with your profile'],
      chanceLevel,
      explanationMetadata: {
        explanations,
        breakdown: {
          gpaAlignment: gpaExplanation.score,
          majorAlignment: majorExplanation.score,
          locationMatch: locationExplanation.score,
          interestsMatch: interestsExplanation.score,
          demographicsMatch: demographicsExplanation.score,
          financialNeedAlignment: financialExplanation.score
        },
        strengths,
        improvements,
        competitivenessAnalysis
      }
    };
  }
}

export const matchScoringService = new MatchScoringService();
