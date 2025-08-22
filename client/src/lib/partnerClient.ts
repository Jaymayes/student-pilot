import { z } from 'zod';

// Partner service configuration
const PARTNER_SERVICE_BASE_URL = process.env.PARTNER_SERVICE_URL || 'http://localhost:3001/api/v1';
const PARTNER_SERVICE_TIMEOUT = 5000; // 5 seconds

// Validation schemas for partner service responses
const PartnerListingSchema = z.object({
  scholarshipId: z.string(),
  partnerId: z.string(),
  promotionLevel: z.enum(['standard', 'featured', 'premium']),
  rankingScore: z.number().min(0).max(100),
  targetingCriteria: z.object({}).passthrough(),
  budgetRemaining: z.number().min(0),
  eligibilityFlags: z.object({
    gpaRequirement: z.number().optional(),
    residencyRequired: z.boolean().optional(),
    fieldRestrictions: z.array(z.string()).optional()
  }).optional(),
  isActive: z.boolean(),
  expiresAt: z.string().datetime().optional()
});

const PartnerListingsResponseSchema = z.object({
  listings: z.array(PartnerListingSchema),
  metadata: z.object({
    totalAvailable: z.number(),
    cacheDuration: z.number(),
    lastUpdated: z.string().datetime()
  })
});

const RecruitmentEventSchema = z.object({
  eventType: z.enum(['view', 'click', 'apply', 'conversion']),
  scholarshipId: z.string(),
  partnerId: z.string(),
  studentHash: z.string().regex(/^[a-f0-9]{64}$/), // SHA-256 hash
  timestamp: z.string().datetime(),
  sessionId: z.string().optional(),
  correlationId: z.string().optional(),
  metadata: z.object({
    pageUrl: z.string().optional(),
    referrer: z.string().optional(),
    userAgent: z.string().optional(),
    deviceType: z.enum(['desktop', 'mobile', 'tablet']).optional()
  }).optional()
});

export type PartnerListing = z.infer<typeof PartnerListingSchema>;
export type PartnerListingsResponse = z.infer<typeof PartnerListingsResponseSchema>;
export type RecruitmentEvent = z.infer<typeof RecruitmentEventSchema>;

/**
 * Student context for partner targeting
 */
export interface StudentContext {
  userId: string;
  academicLevel: 'freshman' | 'sophomore' | 'junior' | 'senior' | 'graduate';
  fieldOfStudy: string;
  demographics?: {
    state?: string;
    gpa?: number;
    financialNeed?: boolean;
  };
  interests?: string[];
}

/**
 * Partner service client for B2B marketplace integration
 * Handles promoted listings and recruitment attribution
 */
export class PartnerServiceClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl?: string, timeout?: number) {
    this.baseUrl = baseUrl || PARTNER_SERVICE_BASE_URL;
    this.timeout = timeout || PARTNER_SERVICE_TIMEOUT;
  }

  /**
   * Fetch promoted scholarship listings for student context
   */
  async getPromotedListings(
    studentContext: StudentContext,
    limit: number = 10
  ): Promise<PartnerListingsResponse | null> {
    try {
      const url = new URL('/partner-listings', this.baseUrl);
      
      // Add query parameters
      url.searchParams.set('userId', studentContext.userId);
      url.searchParams.set('academicLevel', studentContext.academicLevel);
      url.searchParams.set('fieldOfStudy', studentContext.fieldOfStudy);
      url.searchParams.set('limit', limit.toString());
      
      if (studentContext.demographics?.state) {
        url.searchParams.set('state', studentContext.demographics.state);
      }
      
      if (studentContext.demographics?.gpa) {
        url.searchParams.set('gpa', studentContext.demographics.gpa.toString());
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Version': '1.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          // No promoted listings available
          return null;
        }
        throw new Error(`Partner service error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return PartnerListingsResponseSchema.parse(data);

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Partner service request timeout');
        return null;
      }
      
      console.error('Failed to fetch promoted listings:', error);
      return null; // Graceful degradation
    }
  }

  /**
   * Track recruitment event for partner attribution
   */
  async trackRecruitmentEvent(event: RecruitmentEvent): Promise<string | null> {
    try {
      // Validate event data
      const validatedEvent = RecruitmentEventSchema.parse(event);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/recruitment-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Version': '1.0'
        },
        body: JSON.stringify(validatedEvent),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Event tracking error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result.eventId || null;

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Event tracking request timeout');
      } else {
        console.error('Failed to track recruitment event:', error);
      }
      return null; // Don't block user experience for tracking failures
    }
  }

  /**
   * Get partner dashboard deep link URL
   */
  async getPartnerDeepLink(
    partnerId: string,
    scholarshipId: string,
    studentHash: string
  ): Promise<string | null> {
    try {
      const url = new URL('/partner-deep-link', this.baseUrl);
      url.searchParams.set('partnerId', partnerId);
      url.searchParams.set('scholarshipId', scholarshipId);
      url.searchParams.set('studentHash', studentHash);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'X-API-Version': '1.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        return result.deepLinkUrl || null;
      }

      return null;

    } catch (error) {
      console.error('Failed to get partner deep link:', error);
      return null;
    }
  }

  /**
   * Health check for partner service availability
   */
  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // Short timeout for health check

      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;

    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const partnerServiceClient = new PartnerServiceClient();