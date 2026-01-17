/**
 * Hard Filters Service - Zero False Positive Scholarship Matching
 * 
 * Implements strict eligibility gates BEFORE vector/semantic scoring.
 * These are non-negotiable disqualifiers that must pass before ANY scoring occurs.
 * 
 * Trust Leak Fix: Prevents showing students scholarships they are strictly ineligible for.
 */

import type { StudentProfile, Scholarship } from '@shared/schema';

export interface HardFilterResult {
  passed: boolean;
  filterName: string;
  reason: string;
  studentValue: string | number | null;
  requirementValue: string | number | null;
}

export interface HardFilterReport {
  allPassed: boolean;
  passedFilters: HardFilterResult[];
  failedFilters: HardFilterResult[];
  totalFiltersApplied: number;
  scholarshipId: string;
  studentId: string;
  timestamp: Date;
}

export interface HardFilterConfig {
  enableGpaFilter: boolean;
  enableResidencyFilter: boolean;
  enableDeadlineFilter: boolean;
  enableMajorFilter: boolean;
  deadlineBufferDays: number; // Grace period for deadline filter (default 0)
  strictMajorMatch: boolean; // If true, exact match required; if false, field-level match allowed
}

const DEFAULT_CONFIG: HardFilterConfig = {
  enableGpaFilter: true,
  enableResidencyFilter: true,
  enableDeadlineFilter: true,
  enableMajorFilter: true,
  deadlineBufferDays: 0,
  strictMajorMatch: false, // Allow field-level matching by default
};

export class HardFiltersService {
  private config: HardFilterConfig;
  private filterStats = {
    totalChecks: 0,
    gpaFailures: 0,
    residencyFailures: 0,
    deadlineFailures: 0,
    majorFailures: 0,
  };

  constructor(config: Partial<HardFilterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Apply all hard filters to determine strict eligibility
   * Returns false if ANY hard filter fails (student is ineligible)
   */
  applyHardFilters(
    student: StudentProfile,
    scholarship: Scholarship
  ): HardFilterReport {
    this.filterStats.totalChecks++;
    
    const results: HardFilterResult[] = [];
    const criteria = scholarship.eligibilityCriteria as Record<string, any> || {};

    // 1. GPA Hard Filter
    if (this.config.enableGpaFilter) {
      results.push(this.checkGpaEligibility(student, criteria));
    }

    // 2. Residency/State Hard Filter
    if (this.config.enableResidencyFilter) {
      results.push(this.checkResidencyEligibility(student, criteria));
    }

    // 3. Deadline Hard Filter (scholarship must not be expired)
    if (this.config.enableDeadlineFilter) {
      results.push(this.checkDeadlineEligibility(scholarship));
    }

    // 4. Major Hard Filter
    if (this.config.enableMajorFilter) {
      results.push(this.checkMajorEligibility(student, criteria));
    }

    const passedFilters = results.filter(r => r.passed);
    const failedFilters = results.filter(r => !r.passed);

    // Update stats for failed filters
    failedFilters.forEach(f => {
      if (f.filterName === 'GPA') this.filterStats.gpaFailures++;
      if (f.filterName === 'Residency') this.filterStats.residencyFailures++;
      if (f.filterName === 'Deadline') this.filterStats.deadlineFailures++;
      if (f.filterName === 'Major') this.filterStats.majorFailures++;
    });

    return {
      allPassed: failedFilters.length === 0,
      passedFilters,
      failedFilters,
      totalFiltersApplied: results.length,
      scholarshipId: scholarship.id,
      studentId: student.id,
      timestamp: new Date(),
    };
  }

  /**
   * GPA Hard Filter: Student GPA must meet minimum requirement
   */
  private checkGpaEligibility(
    student: StudentProfile,
    criteria: Record<string, any>
  ): HardFilterResult {
    const minGpa = criteria.minGpa || criteria.minGPA || criteria.minimumGpa;
    
    // No GPA requirement = pass
    if (!minGpa) {
      return {
        passed: true,
        filterName: 'GPA',
        reason: 'No minimum GPA requirement',
        studentValue: student.gpa ? parseFloat(student.gpa.toString()) : null,
        requirementValue: null,
      };
    }

    const studentGpa = student.gpa ? parseFloat(student.gpa.toString()) : null;
    const requiredGpa = parseFloat(minGpa.toString());

    // Student has no GPA on file - pass to soft scoring (avoid false negative)
    // Rationale: Missing data should not cause rejection; defer to soft scoring
    if (studentGpa === null) {
      return {
        passed: true,
        filterName: 'GPA',
        reason: 'GPA not provided - deferring to soft scoring',
        studentValue: null,
        requirementValue: requiredGpa,
      };
    }

    // Strict comparison: student GPA must be >= minimum
    if (studentGpa >= requiredGpa) {
      return {
        passed: true,
        filterName: 'GPA',
        reason: `GPA ${studentGpa} meets minimum ${requiredGpa}`,
        studentValue: studentGpa,
        requirementValue: requiredGpa,
      };
    }

    return {
      passed: false,
      filterName: 'GPA',
      reason: `GPA ${studentGpa} below minimum ${requiredGpa}`,
      studentValue: studentGpa,
      requirementValue: requiredGpa,
    };
  }

  /**
   * Residency Hard Filter: Student location must match required states/regions
   */
  private checkResidencyEligibility(
    student: StudentProfile,
    criteria: Record<string, any>
  ): HardFilterResult {
    const allowedStates = criteria.allowedStates || criteria.states || criteria.eligibleStates;
    const allowedRegions = criteria.allowedRegions || criteria.regions;
    
    // No location requirement = pass
    if ((!allowedStates || allowedStates.length === 0) && 
        (!allowedRegions || allowedRegions.length === 0)) {
      return {
        passed: true,
        filterName: 'Residency',
        reason: 'No location restrictions',
        studentValue: student.location,
        requirementValue: null,
      };
    }

    // Student has no location on file - pass to soft scoring (avoid false negative)
    // Rationale: Missing data should not cause rejection; defer to soft scoring
    if (!student.location) {
      return {
        passed: true,
        filterName: 'Residency',
        reason: 'Location not provided - deferring to soft scoring',
        studentValue: null,
        requirementValue: JSON.stringify(allowedStates || allowedRegions),
      };
    }

    const studentLocation = student.location.toLowerCase().trim();
    
    // Check state match
    if (allowedStates && Array.isArray(allowedStates)) {
      const stateMatch = allowedStates.some((state: string) => {
        const stateLower = state.toLowerCase().trim();
        // Check for exact state match or abbreviation match
        return studentLocation.includes(stateLower) || 
               this.matchStateAbbreviation(studentLocation, stateLower);
      });
      
      if (stateMatch) {
        return {
          passed: true,
          filterName: 'Residency',
          reason: `Location "${student.location}" matches required states`,
          studentValue: student.location,
          requirementValue: JSON.stringify(allowedStates),
        };
      }
    }

    // Check region match
    if (allowedRegions && Array.isArray(allowedRegions)) {
      const regionMatch = allowedRegions.some((region: string) => 
        studentLocation.includes(region.toLowerCase().trim())
      );
      
      if (regionMatch) {
        return {
          passed: true,
          filterName: 'Residency',
          reason: `Location "${student.location}" matches required regions`,
          studentValue: student.location,
          requirementValue: JSON.stringify(allowedRegions),
        };
      }
    }

    return {
      passed: false,
      filterName: 'Residency',
      reason: `Location "${student.location}" not in eligible areas: ${JSON.stringify(allowedStates || allowedRegions)}`,
      studentValue: student.location,
      requirementValue: JSON.stringify(allowedStates || allowedRegions),
    };
  }

  /**
   * State abbreviation matching helper
   */
  private matchStateAbbreviation(studentLocation: string, state: string): boolean {
    const stateAbbreviations: Record<string, string> = {
      'alabama': 'al', 'alaska': 'ak', 'arizona': 'az', 'arkansas': 'ar',
      'california': 'ca', 'colorado': 'co', 'connecticut': 'ct', 'delaware': 'de',
      'florida': 'fl', 'georgia': 'ga', 'hawaii': 'hi', 'idaho': 'id',
      'illinois': 'il', 'indiana': 'in', 'iowa': 'ia', 'kansas': 'ks',
      'kentucky': 'ky', 'louisiana': 'la', 'maine': 'me', 'maryland': 'md',
      'massachusetts': 'ma', 'michigan': 'mi', 'minnesota': 'mn', 'mississippi': 'ms',
      'missouri': 'mo', 'montana': 'mt', 'nebraska': 'ne', 'nevada': 'nv',
      'new hampshire': 'nh', 'new jersey': 'nj', 'new mexico': 'nm', 'new york': 'ny',
      'north carolina': 'nc', 'north dakota': 'nd', 'ohio': 'oh', 'oklahoma': 'ok',
      'oregon': 'or', 'pennsylvania': 'pa', 'rhode island': 'ri', 'south carolina': 'sc',
      'south dakota': 'sd', 'tennessee': 'tn', 'texas': 'tx', 'utah': 'ut',
      'vermont': 'vt', 'virginia': 'va', 'washington': 'wa', 'west virginia': 'wv',
      'wisconsin': 'wi', 'wyoming': 'wy', 'district of columbia': 'dc',
    };

    // Reverse lookup: abbreviation to full name
    const reverseAbbreviations: Record<string, string> = {};
    for (const [full, abbr] of Object.entries(stateAbbreviations)) {
      reverseAbbreviations[abbr] = full;
    }

    // Normalize state to check
    const stateNormalized = state.toLowerCase().trim();
    const abbr = stateAbbreviations[stateNormalized] || stateNormalized;
    const fullName = reverseAbbreviations[stateNormalized] || stateNormalized;

    return studentLocation.includes(abbr) || studentLocation.includes(fullName);
  }

  /**
   * Deadline Hard Filter: Scholarship must not be expired
   */
  private checkDeadlineEligibility(scholarship: Scholarship): HardFilterResult {
    const now = new Date();
    const bufferMs = this.config.deadlineBufferDays * 24 * 60 * 60 * 1000;
    const deadline = new Date(scholarship.deadline);
    const effectiveDeadline = new Date(deadline.getTime() + bufferMs);

    if (effectiveDeadline > now) {
      const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      return {
        passed: true,
        filterName: 'Deadline',
        reason: `Deadline ${deadline.toISOString().split('T')[0]} is ${daysRemaining} days away`,
        studentValue: now.toISOString().split('T')[0],
        requirementValue: deadline.toISOString().split('T')[0],
      };
    }

    return {
      passed: false,
      filterName: 'Deadline',
      reason: `Scholarship deadline ${deadline.toISOString().split('T')[0]} has passed`,
      studentValue: now.toISOString().split('T')[0],
      requirementValue: deadline.toISOString().split('T')[0],
    };
  }

  /**
   * Major Hard Filter: Student major must match required majors/fields
   */
  private checkMajorEligibility(
    student: StudentProfile,
    criteria: Record<string, any>
  ): HardFilterResult {
    const allowedMajors = criteria.allowedMajors || criteria.majors || criteria.eligibleMajors;
    const allowedFields = criteria.allowedFields || criteria.fields || criteria.fieldOfStudy;
    
    // No major requirement = pass
    if ((!allowedMajors || allowedMajors.length === 0) && 
        (!allowedFields || allowedFields.length === 0)) {
      return {
        passed: true,
        filterName: 'Major',
        reason: 'Open to all majors',
        studentValue: student.major,
        requirementValue: null,
      };
    }

    // Student has no major on file - pass to soft scoring (avoid false negative)
    // Rationale: Missing data should not cause rejection; defer to soft scoring
    if (!student.major) {
      return {
        passed: true,
        filterName: 'Major',
        reason: 'Major not provided - deferring to soft scoring',
        studentValue: null,
        requirementValue: JSON.stringify(allowedMajors || allowedFields),
      };
    }

    const studentMajor = student.major.toLowerCase().trim();

    // Check exact major match
    if (allowedMajors && Array.isArray(allowedMajors)) {
      const majorMatch = allowedMajors.some((major: string) => {
        const majorLower = major.toLowerCase().trim();
        return studentMajor.includes(majorLower) || majorLower.includes(studentMajor);
      });
      
      if (majorMatch) {
        return {
          passed: true,
          filterName: 'Major',
          reason: `Major "${student.major}" matches required majors`,
          studentValue: student.major,
          requirementValue: JSON.stringify(allowedMajors),
        };
      }
    }

    // Check field-level match (less strict)
    if (!this.config.strictMajorMatch && allowedFields && Array.isArray(allowedFields)) {
      const fieldMatch = allowedFields.some((field: string) => {
        return this.checkFieldAlignment(studentMajor, field.toLowerCase().trim());
      });
      
      if (fieldMatch) {
        return {
          passed: true,
          filterName: 'Major',
          reason: `Major "${student.major}" aligns with required field of study`,
          studentValue: student.major,
          requirementValue: JSON.stringify(allowedFields),
        };
      }
    }

    // Check STEM/Business/Humanities alignment as fallback
    if (!this.config.strictMajorMatch && allowedMajors && Array.isArray(allowedMajors)) {
      const studentField = this.getFieldCategory(studentMajor);
      const scholarshipFields = allowedMajors.map((m: string) => this.getFieldCategory(m.toLowerCase()));
      
      if (studentField !== 'other' && scholarshipFields.includes(studentField)) {
        return {
          passed: true,
          filterName: 'Major',
          reason: `Major "${student.major}" (${studentField}) aligns with scholarship field`,
          studentValue: student.major,
          requirementValue: JSON.stringify(allowedMajors),
        };
      }
    }

    return {
      passed: false,
      filterName: 'Major',
      reason: `Major "${student.major}" not eligible for this scholarship requiring: ${JSON.stringify(allowedMajors || allowedFields)}`,
      studentValue: student.major,
      requirementValue: JSON.stringify(allowedMajors || allowedFields),
    };
  }

  /**
   * Field alignment check helper
   */
  private checkFieldAlignment(studentMajor: string, field: string): boolean {
    const fieldKeywords: Record<string, string[]> = {
      'stem': ['engineering', 'computer', 'science', 'mathematics', 'physics', 'chemistry', 'biology', 'technology', 'data', 'software', 'mechanical', 'electrical', 'civil', 'aerospace'],
      'business': ['business', 'economics', 'finance', 'accounting', 'marketing', 'management', 'entrepreneurship', 'mba'],
      'humanities': ['english', 'history', 'philosophy', 'literature', 'arts', 'music', 'theater', 'writing', 'communication', 'journalism'],
      'healthcare': ['nursing', 'medicine', 'medical', 'health', 'pharmacy', 'dental', 'public health', 'pre-med', 'biology'],
      'education': ['education', 'teaching', 'pedagogy', 'curriculum'],
      'social sciences': ['psychology', 'sociology', 'political science', 'anthropology', 'social work', 'criminal justice'],
      'law': ['law', 'legal', 'pre-law', 'paralegal'],
    };

    const fieldLower = field.toLowerCase();
    const keywords = fieldKeywords[fieldLower] || [];
    
    return keywords.some(kw => studentMajor.includes(kw));
  }

  /**
   * Get field category for major
   */
  private getFieldCategory(major: string): string {
    const stemFields = ['engineering', 'computer', 'mathematics', 'physics', 'chemistry', 'biology', 'science', 'technology', 'data'];
    const businessFields = ['business', 'economics', 'finance', 'accounting', 'marketing', 'management'];
    const humanitiesFields = ['english', 'history', 'philosophy', 'literature', 'arts', 'music'];
    const healthcareFields = ['nursing', 'medicine', 'medical', 'health', 'pharmacy', 'dental'];
    
    if (stemFields.some(f => major.includes(f))) return 'stem';
    if (businessFields.some(f => major.includes(f))) return 'business';
    if (humanitiesFields.some(f => major.includes(f))) return 'humanities';
    if (healthcareFields.some(f => major.includes(f))) return 'healthcare';
    return 'other';
  }

  /**
   * Get current filter statistics
   */
  getFilterStats() {
    const total = this.filterStats.totalChecks;
    return {
      totalChecks: total,
      failuresByType: {
        gpa: this.filterStats.gpaFailures,
        residency: this.filterStats.residencyFailures,
        deadline: this.filterStats.deadlineFailures,
        major: this.filterStats.majorFailures,
      },
      failureRates: total > 0 ? {
        gpa: (this.filterStats.gpaFailures / total * 100).toFixed(2) + '%',
        residency: (this.filterStats.residencyFailures / total * 100).toFixed(2) + '%',
        deadline: (this.filterStats.deadlineFailures / total * 100).toFixed(2) + '%',
        major: (this.filterStats.majorFailures / total * 100).toFixed(2) + '%',
      } : null,
    };
  }

  /**
   * Reset filter statistics
   */
  resetStats() {
    this.filterStats = {
      totalChecks: 0,
      gpaFailures: 0,
      residencyFailures: 0,
      deadlineFailures: 0,
      majorFailures: 0,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): HardFilterConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<HardFilterConfig>) {
    this.config = { ...this.config, ...newConfig };
  }
}

// Singleton instance with default config
export const hardFiltersService = new HardFiltersService();
