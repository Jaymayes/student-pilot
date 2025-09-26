/**
 * Partner-related type definitions for B2B marketplace integration
 * Shared between client and server for type consistency
 */

export interface PartnerPromotion {
  scholarshipId: string;
  partnerId: string;
  promotionLevel: 'standard' | 'featured' | 'premium';
  rankingScore: number;
  budgetRemaining: number;
  isActive: boolean;
  expiresAt?: string;
  targetingCriteria?: Record<string, any>;
  eligibilityFlags?: {
    gpaRequirement?: number;
    residencyRequired?: boolean;
    fieldRestrictions?: string[];
  };
}

export interface PartnerOrganization {
  id: string;
  name: string;
  logo?: string;
  website?: string;
  description?: string;
  isActive: boolean;
  tier: 'standard' | 'premium' | 'enterprise';
}

export interface RecruitmentEvent {
  eventId: string;
  eventType: 'view' | 'click' | 'apply' | 'conversion';
  scholarshipId: string;
  partnerId: string;
  studentHash: string; // Anonymized student identifier
  timestamp: string;
  sessionId?: string;
  correlationId?: string;
  metadata?: {
    pageUrl?: string;
    referrer?: string;
    userAgent?: string;
    deviceType?: 'desktop' | 'mobile' | 'tablet';
    conversionValue?: number;
    promotionLevel?: string;
    rankingPosition?: number;
    clickTarget?: 'scholarship_detail' | 'partner_dashboard' | 'apply_button';
  };
}

export interface RecruitmentAttribution {
  eventId: string;
  eventType: 'view' | 'click' | 'apply' | 'conversion';
  scholarshipId: string;
  partnerId: string;
  studentHash: string; // Anonymized student identifier
  timestamp: string;
  sessionId?: string;
  correlationId?: string;
  metadata?: {
    pageUrl?: string;
    referrer?: string;
    userAgent?: string;
    deviceType?: 'desktop' | 'mobile' | 'tablet';
    conversionValue?: number;
  };
}

export interface PartnerAnalytics {
  partnerId: string;
  timeframe: {
    start: string;
    end: string;
  };
  metrics: {
    impressions: number;
    clicks: number;
    applications: number;
    conversions: number;
    spend: number;
    ctr: number; // Click-through rate
    cvr: number; // Conversion rate
    cpa: number; // Cost per application
  };
  topScholarships: Array<{
    scholarshipId: string;
    title: string;
    impressions: number;
    clicks: number;
    applications: number;
  }>;
}

export interface PartnerConfiguration {
  partnerId: string;
  promotionSettings: {
    dailyBudget: number;
    maxCpc: number; // Max cost per click
    targetAudience: {
      academicLevels?: string[];
      fieldsOfStudy?: string[];
      gpaRange?: [number, number];
      states?: string[];
    };
    promotionLevel: 'standard' | 'featured' | 'premium';
  };
  billingSettings: {
    billingModel: 'cpc' | 'cpm' | 'cpa'; // Cost per click/mille/acquisition
    paymentMethod: string;
    invoiceFrequency: 'weekly' | 'monthly';
  };
  integrationSettings: {
    webhookUrl?: string;
    apiKey: string;
    dashboardAccess: boolean;
  };
}

/**
 * Event types for partner attribution tracking
 */
export const PARTNER_EVENT_TYPES = {
  PROMOTION_VIEW: 'promotion_view',
  PROMOTION_CLICK: 'promotion_click',
  SCHOLARSHIP_VIEW: 'scholarship_view',
  APPLICATION_START: 'application_start',
  APPLICATION_SUBMIT: 'application_submit',
  CONVERSION: 'conversion'
} as const;

export type PartnerEventType = typeof PARTNER_EVENT_TYPES[keyof typeof PARTNER_EVENT_TYPES];

/**
 * Promotion level hierarchy for display priority
 */
export const PROMOTION_LEVELS = {
  STANDARD: { priority: 1, multiplier: 1.0 },
  FEATURED: { priority: 2, multiplier: 1.5 },
  PREMIUM: { priority: 3, multiplier: 2.0 }
} as const;

/**
 * Partner service endpoints configuration
 */
export const PARTNER_API_ENDPOINTS = {
  LISTINGS: '/partner-listings',
  EVENTS: '/recruitment-events',
  DEEP_LINK: '/partner-deep-link',
  ANALYTICS: '/partner-analytics',
  HEALTH: '/health'
} as const;