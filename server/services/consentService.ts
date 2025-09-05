import { db } from "../db";
import { 
  consentCategories, 
  userConsents, 
  consentAuditLog, 
  onboardingProgress,
  dataUseDisclosures,
  type ConsentCategory,
  type UserConsent,
  type ConsentAuditLogEntry,
  type OnboardingProgress,
  type DataUseDisclosure,
  type InsertUserConsent,
  type InsertConsentAuditLogEntry,
  type InsertOnboardingProgress
} from "@shared/schema";
import { eq, and, desc, inArray, asc } from "drizzle-orm";
import { sql } from "drizzle-orm";

export interface ConsentDecision {
  categoryId: string;
  status: 'granted' | 'denied';
  metadata?: Record<string, any>;
}

export interface ConsentContext {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  method?: string;
}

export class ConsentService {
  /**
   * Initialize default consent categories (FERPA-compliant)
   */
  async initializeConsentCategories(): Promise<void> {
    const defaultCategories = [
      {
        category: 'ferpa_directory_info' as const,
        title: 'FERPA Directory Information',
        description: 'Allow disclosure of directory information as defined by FERPA, including name, enrollment status, degrees, and honors received.',
        isRequired: false,
        isFerpaRegulated: true,
        retentionMonths: 84, // 7 years
      },
      {
        category: 'ferpa_educational_records' as const,
        title: 'Educational Records Access',
        description: 'Allow access to educational records for scholarship matching and application assistance as permitted under FERPA.',
        isRequired: true,
        isFerpaRegulated: true,
        retentionMonths: 84, // 7 years
      },
      {
        category: 'data_processing' as const,
        title: 'Data Processing',
        description: 'Process your academic and personal information to provide core platform services including scholarship matching.',
        isRequired: true,
        isFerpaRegulated: false,
        retentionMonths: 36, // 3 years
      },
      {
        category: 'ai_processing' as const,
        title: 'AI-Powered Analysis',
        description: 'Use artificial intelligence to analyze your essays, provide writing assistance, and improve scholarship matching.',
        isRequired: false,
        isFerpaRegulated: false,
        retentionMonths: 24, // 2 years
      },
      {
        category: 'third_party_sharing' as const,
        title: 'Scholarship Provider Sharing',
        description: 'Share your profile information with scholarship providers for application purposes when you apply to scholarships.',
        isRequired: false,
        isFerpaRegulated: true,
        retentionMonths: 60, // 5 years
      },
      {
        category: 'marketing_communications' as const,
        title: 'Marketing Communications',
        description: 'Send you promotional emails about new scholarships, platform features, and educational opportunities.',
        isRequired: false,
        isFerpaRegulated: false,
        retentionMonths: 24, // 2 years
      },
      {
        category: 'analytics_tracking' as const,
        title: 'Usage Analytics',
        description: 'Track your platform usage to improve our services and provide better user experience.',
        isRequired: false,
        isFerpaRegulated: false,
        retentionMonths: 12, // 1 year
      },
    ];

    for (const category of defaultCategories) {
      try {
        await db.insert(consentCategories)
          .values(category)
          .onConflictDoUpdate({
            target: consentCategories.category,
            set: {
              title: category.title,
              description: category.description,
              isRequired: category.isRequired,
              isFerpaRegulated: category.isFerpaRegulated,
              retentionMonths: category.retentionMonths,
              updatedAt: new Date(),
            },
          });
      } catch (error) {
        console.error(`Error initializing consent category ${category.category}:`, error);
      }
    }
  }

  /**
   * Get all active consent categories
   */
  async getActiveConsentCategories(): Promise<ConsentCategory[]> {
    return await db.select()
      .from(consentCategories)
      .where(eq(consentCategories.isActive, true))
      .orderBy(desc(consentCategories.isRequired), asc(consentCategories.title));
  }

  /**
   * Get required consent categories that user must agree to
   */
  async getRequiredConsentCategories(): Promise<ConsentCategory[]> {
    return await db.select()
      .from(consentCategories)
      .where(
        and(
          eq(consentCategories.isActive, true),
          eq(consentCategories.isRequired, true)
        )
      )
      .orderBy(consentCategories.title);
  }

  /**
   * Get user's current consent status for all categories
   */
  async getUserConsentStatus(userId: string): Promise<UserConsent[]> {
    return await db.select()
      .from(userConsents)
      .where(eq(userConsents.userId, userId))
      .orderBy(desc(userConsents.consentTimestamp));
  }

  /**
   * Record consent decisions from user
   */
  async recordConsentDecisions(
    decisions: ConsentDecision[],
    context: ConsentContext
  ): Promise<void> {
    if (decisions.length === 0) {
      throw new Error('No consent decisions provided');
    }

    // Get category IDs to validate they exist
    const categoryIds = decisions.map(d => d.categoryId);
    const existingCategories = await db.select({ id: consentCategories.id })
      .from(consentCategories)
      .where(inArray(consentCategories.id, categoryIds));
    
    if (existingCategories.length !== categoryIds.length) {
      throw new Error('One or more consent categories do not exist');
    }

    // Process each consent decision
    for (const decision of decisions) {
      await this.recordSingleConsent(decision, context);
    }

    // Update onboarding progress
    await this.updateOnboardingProgress(context.userId, 'consent');
  }

  /**
   * Record a single consent decision with audit trail
   */
  private async recordSingleConsent(
    decision: ConsentDecision,
    context: ConsentContext
  ): Promise<void> {
    // Get existing consent if any
    const [existingConsent] = await db.select()
      .from(userConsents)
      .where(
        and(
          eq(userConsents.userId, context.userId),
          eq(userConsents.categoryId, decision.categoryId)
        )
      )
      .orderBy(desc(userConsents.consentTimestamp))
      .limit(1);

    // Calculate expiration date based on category retention policy
    const [category] = await db.select({ retentionMonths: consentCategories.retentionMonths })
      .from(consentCategories)
      .where(eq(consentCategories.id, decision.categoryId));
    
    const expiresAt = category?.retentionMonths 
      ? new Date(Date.now() + category.retentionMonths * 30 * 24 * 60 * 60 * 1000)
      : null;

    // Insert new consent record
    const newConsent: InsertUserConsent = {
      userId: context.userId,
      categoryId: decision.categoryId,
      status: decision.status,
      consentTimestamp: new Date(),
      expiresAt,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      consentMethod: context.method || 'web_form',
      consentVersion: 1,
      metadata: decision.metadata,
    };

    await db.insert(userConsents).values(newConsent);

    // Log consent change in audit trail
    const auditEntry: InsertConsentAuditLogEntry = {
      userId: context.userId,
      categoryId: decision.categoryId,
      oldStatus: existingConsent?.status || null,
      newStatus: decision.status,
      changeReason: 'user_action',
      changeDetails: existingConsent 
        ? `Consent changed from ${existingConsent.status} to ${decision.status}` 
        : `Initial consent: ${decision.status}`,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      correlationId: context.correlationId,
    };

    await db.insert(consentAuditLog).values(auditEntry);
  }

  /**
   * Check if user has granted all required consents
   */
  async hasRequiredConsents(userId: string): Promise<boolean> {
    const requiredCategories = await this.getRequiredConsentCategories();
    const userConsent = await this.getUserConsentStatus(userId);
    
    const grantedRequired = userConsent.filter(consent => 
      consent.status === 'granted' &&
      requiredCategories.some(cat => cat.id === consent.categoryId)
    );

    return grantedRequired.length === requiredCategories.length;
  }

  /**
   * Get user's onboarding progress
   */
  async getOnboardingProgress(userId: string): Promise<OnboardingProgress | null> {
    const [progress] = await db.select()
      .from(onboardingProgress)
      .where(eq(onboardingProgress.userId, userId))
      .limit(1);
    
    return progress || null;
  }

  /**
   * Update onboarding progress
   */
  async updateOnboardingProgress(
    userId: string, 
    completedStep: 'consent' | 'profile'
  ): Promise<void> {
    const now = new Date();
    const [existingProgress] = await db.select()
      .from(onboardingProgress)
      .where(eq(onboardingProgress.userId, userId))
      .limit(1);

    if (existingProgress) {
      // Update existing progress
      const updateData: Partial<OnboardingProgress> = { updatedAt: now };
      
      if (completedStep === 'consent' && !existingProgress.consentCompleted) {
        updateData.consentCompleted = true;
        updateData.consentCompletedAt = now;
        updateData.currentStep = 'profile';
      } else if (completedStep === 'profile' && !existingProgress.profileCompleted) {
        updateData.profileCompleted = true;
        updateData.profileCompletedAt = now;
        updateData.currentStep = 'completed';
        updateData.onboardingCompletedAt = now;
      }

      await db.update(onboardingProgress)
        .set(updateData)
        .where(eq(onboardingProgress.userId, userId));
    } else {
      // Create new progress record
      const newProgress: InsertOnboardingProgress = {
        userId,
        consentCompleted: completedStep === 'consent',
        consentCompletedAt: completedStep === 'consent' ? now : null,
        profileStarted: false,
        profileCompleted: completedStep === 'profile',
        profileCompletedAt: completedStep === 'profile' ? now : null,
        onboardingCompletedAt: completedStep === 'profile' ? now : null,
        currentStep: completedStep === 'consent' ? 'profile' : (completedStep === 'profile' ? 'completed' : 'consent'),
      };

      await db.insert(onboardingProgress).values(newProgress);
    }
  }

  /**
   * Get consent audit trail for user
   */
  async getConsentAuditTrail(userId: string): Promise<ConsentAuditLogEntry[]> {
    return await db.select()
      .from(consentAuditLog)
      .where(eq(consentAuditLog.userId, userId))
      .orderBy(desc(consentAuditLog.createdAt));
  }

  /**
   * Initialize data use disclosures
   */
  async initializeDataUseDisclosures(): Promise<void> {
    const disclosures = [
      {
        category: 'scholarship_matching' as const,
        purpose: 'Match you with relevant scholarships based on your academic profile and interests',
        dataTypes: ['academic_records', 'demographic_info', 'interests', 'achievements'],
        thirdParties: ['scholarship_providers', 'educational_institutions'],
        retentionPeriod: '7 years after graduation or account deletion',
        userRights: ['access', 'correction', 'deletion', 'data_portability'],
        legalBasis: 'Legitimate interest and consent',
      },
      {
        category: 'application_assistance' as const,
        purpose: 'Provide AI-powered essay writing help and application guidance',
        dataTypes: ['essay_content', 'writing_samples', 'application_data'],
        thirdParties: ['ai_service_providers'],
        retentionPeriod: '2 years after last use',
        userRights: ['access', 'correction', 'deletion'],
        legalBasis: 'Consent',
      },
      {
        category: 'platform_improvement' as const,
        purpose: 'Analyze usage patterns to improve our services and user experience',
        dataTypes: ['usage_analytics', 'feature_interactions', 'performance_metrics'],
        thirdParties: ['analytics_providers'],
        retentionPeriod: '1 year',
        userRights: ['access', 'deletion', 'opt_out'],
        legalBasis: 'Legitimate interest',
      },
      {
        category: 'communications' as const,
        purpose: 'Send you important updates about your applications and new opportunities',
        dataTypes: ['contact_information', 'communication_preferences'],
        thirdParties: ['email_service_providers'],
        retentionPeriod: '2 years after unsubscribe or account deletion',
        userRights: ['access', 'correction', 'deletion', 'opt_out'],
        legalBasis: 'Consent and legitimate interest',
      },
      {
        category: 'compliance_reporting' as const,
        purpose: 'Meet legal and regulatory requirements including FERPA compliance',
        dataTypes: ['all_personal_data', 'consent_records', 'audit_logs'],
        thirdParties: ['regulatory_authorities', 'legal_advisors'],
        retentionPeriod: '7 years as required by law',
        userRights: ['access', 'correction'],
        legalBasis: 'Legal obligation',
      }
    ];

    for (const disclosure of disclosures) {
      try {
        await db.insert(dataUseDisclosures)
          .values(disclosure)
          .onConflictDoUpdate({
            target: dataUseDisclosures.category,
            set: {
              purpose: disclosure.purpose,
              dataTypes: disclosure.dataTypes,
              thirdParties: disclosure.thirdParties,
              retentionPeriod: disclosure.retentionPeriod,
              userRights: disclosure.userRights,
              legalBasis: disclosure.legalBasis,
              version: sql`version + 1`,
            },
          });
      } catch (error) {
        console.error(`Error initializing data use disclosure ${disclosure.category}:`, error);
      }
    }
  }

  /**
   * Get all active data use disclosures
   */
  async getDataUseDisclosures(): Promise<DataUseDisclosure[]> {
    return await db.select()
      .from(dataUseDisclosures)
      .where(eq(dataUseDisclosures.isActive, true))
      .orderBy(dataUseDisclosures.category);
  }
}

// Export singleton instance
export const consentService = new ConsentService();