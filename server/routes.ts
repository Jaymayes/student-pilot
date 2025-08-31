import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { scholarshipDetailSSR, scholarshipsListingSSR, generateSitemap } from "./routes/seo";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { insertStudentProfileSchema, updateStudentProfileSchema, insertApplicationSchema, insertEssaySchema } from "@shared/schema";
import { z } from "zod";
import { openaiService } from "./openai";
import { agentBridge, type Task } from "./agentBridge";
import { SecureJWTVerifier, AuthError } from "./auth";
import rateLimit from "express-rate-limit";
import { billingService, CREDIT_PACKAGES, millicreditsToCredits, creditsToUsd } from "./billing";
import { db } from "./db";
import { purchases } from "@shared/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import express from "express";
import { correlationIdMiddleware, correlationErrorHandler, billingCorrelationMiddleware } from "./middleware/correlationId";
import { validateInput, BillingPaginationSchema, escapeHtml } from "./validation";
import { ttvTracker } from "./analytics/ttvTracker";
import { cohortManager } from "./analytics/cohortManager";
import { backupRestoreManager } from "./backupRestore";
import { soc2EvidenceCollector } from "./compliance/soc2Evidence";
import { piiLineageTracker } from "./compliance/piiLineage";

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // SEO Routes - Server-side rendered pages for search engines (250-300 pages target)
  app.get('/scholarships/:id/:slug', scholarshipDetailSSR);
  app.get('/scholarships/:id', scholarshipDetailSSR); // Redirect to proper slug
  app.get('/scholarships', scholarshipsListingSSR);
  app.get('/scholarships/category/:category', async (req, res, next) => {
    const { categoryScholarshipsSSR } = await import('./routes/seo');
    return categoryScholarshipsSSR(req, res, next);
  });
  app.get('/scholarships/state/:state', async (req, res, next) => {
    const { stateScholarshipsSSR } = await import('./routes/seo');
    return stateScholarshipsSSR(req, res, next);
  });
  app.get('/sitemap.xml', generateSitemap);

  // Partner event tracking routes
  app.post('/api/partner-events', async (req, res) => {
    const { trackRecruitmentEvent } = await import('./routes/partnerEvents');
    return trackRecruitmentEvent(req, res);
  });
  
  app.post('/api/partner-events/batch', async (req, res) => {
    const { trackRecruitmentEventBatch } = await import('./routes/partnerEvents');
    return trackRecruitmentEventBatch(req, res);
  });
  
  app.get('/api/partner-deep-link', async (req, res) => {
    const { getPartnerDeepLink } = await import('./routes/partnerEvents');
    return getPartnerDeepLink(req, res);
  });
  
  app.get('/api/partner-health', async (req, res) => {
    const { getPartnerServiceHealth } = await import('./routes/partnerEvents');
    return getPartnerServiceHealth(req, res);
  });

  // Data validation and freshness routes
  app.post('/api/data-validation/freshness', async (req, res) => {
    const { getFreshnessStatus } = await import('./routes/dataValidation');
    return getFreshnessStatus(req, res);
  });
  
  app.post('/api/data-validation/revalidate/:id', async (req, res) => {
    const { triggerRevalidation } = await import('./routes/dataValidation');
    return triggerRevalidation(req, res);
  });
  
  app.get('/api/data-validation/global-status', async (req, res) => {
    const { getGlobalDataQuality } = await import('./routes/dataValidation');
    return getGlobalDataQuality(req, res);
  });
  
  app.get('/api/data-validation/validate/:id', async (req, res) => {
    const { validateScholarship } = await import('./routes/dataValidation');
    return validateScholarship(req, res);
  });

  // Marketplace staging endpoints - Days 8-14 implementation
  app.post('/api/marketplace/promoted-listings', async (req, res) => {
    const { getPromotedListings } = await import('./routes/marketplace');
    return getPromotedListings(req, res);
  });
  
  app.post('/api/marketplace/entitlement-check', async (req, res) => {
    const { checkPromotionEntitlement } = await import('./routes/marketplace');
    return checkPromotionEntitlement(req, res);
  });
  
  app.get('/api/marketplace/partner-dashboard', async (req, res) => {
    const { generatePartnerDashboardAccess } = await import('./routes/marketplace');
    return generatePartnerDashboardAccess(req, res);
  });
  
  app.get('/api/marketplace/pricing-experiment/:partnerId', async (req, res) => {
    const { getPartnerPricingExperiment } = await import('./routes/marketplace');
    return getPartnerPricingExperiment(req, res);
  });
  
  app.get('/api/marketplace/feature-flags', async (req, res) => {
    const { getMarketplaceFeatureFlags } = await import('./routes/marketplace');
    return getMarketplaceFeatureFlags(req, res);
  });

  // A/B Testing and Experiment routes - Matching squad implementation
  app.get('/api/experiments/:experimentId', async (req, res) => {
    const { getExperiment } = await import('./routes/experiments');
    return getExperiment(req, res);
  });
  
  app.post('/api/experiments/assignments', async (req, res) => {
    const { recordExperimentAssignment } = await import('./routes/experiments');
    return recordExperimentAssignment(req, res);
  });
  
  app.post('/api/experiments/exposures', async (req, res) => {
    const { recordExperimentExposure } = await import('./routes/experiments');
    return recordExperimentExposure(req, res);
  });
  
  app.post('/api/experiments/conversions', async (req, res) => {
    const { recordExperimentConversion } = await import('./routes/experiments');
    return recordExperimentConversion(req, res);
  });
  
  app.get('/api/experiments/:experimentId/analytics', async (req, res) => {
    const { getExperimentAnalytics } = await import('./routes/experiments');
    return getExperimentAnalytics(req, res);
  });
  
  app.get('/api/experiments', async (req, res) => {
    const { listActiveExperiments } = await import('./routes/experiments');
    return listActiveExperiments(req, res);
  });

  // SEO Analytics and Search Console integration - Days 8-14 implementation
  app.get('/api/seo/search-console/metrics', async (req, res) => {
    try {
      const { SearchConsoleService } = await import('./analytics/searchConsole');
      const searchConsole = new SearchConsoleService();
      
      const startDate = req.query.startDate as string || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = req.query.endDate as string || new Date().toISOString().split('T')[0];
      
      const metrics = await searchConsole.getSearchMetrics(startDate, endDate);
      res.json({ success: true, metrics });
    } catch (error) {
      console.error('Error fetching search metrics:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  app.get('/api/seo/page-clusters', async (req, res) => {
    try {
      const { SearchConsoleService } = await import('./analytics/searchConsole');
      const searchConsole = new SearchConsoleService();
      
      const startDate = req.query.startDate as string || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = req.query.endDate as string || new Date().toISOString().split('T')[0];
      
      const clusters = await searchConsole.getPageClusterPerformance(startDate, endDate);
      res.json({ success: true, clusters });
    } catch (error) {
      console.error('Error fetching page clusters:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  app.get('/api/seo/report', async (req, res) => {
    try {
      const { SearchConsoleService } = await import('./analytics/searchConsole');
      const searchConsole = new SearchConsoleService();
      
      const startDate = req.query.startDate as string || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = req.query.endDate as string || new Date().toISOString().split('T')[0];
      
      const report = await searchConsole.generateSEOReport(startDate, endDate);
      res.json({ success: true, report });
    } catch (error) {
      console.error('Error generating SEO report:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  app.get('/api/seo/core-web-vitals', async (req, res) => {
    try {
      const { SearchConsoleService } = await import('./analytics/searchConsole');
      const searchConsole = new SearchConsoleService();
      
      const pageUrl = req.query.page as string;
      const vitals = await searchConsole.getCoreWebVitals(pageUrl);
      res.json({ success: true, vitals });
    } catch (error) {
      console.error('Error fetching Core Web Vitals:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  app.get('/api/seo/indexation-status', async (req, res) => {
    try {
      const { SearchConsoleService } = await import('./analytics/searchConsole');
      const searchConsole = new SearchConsoleService();
      
      const status = await searchConsole.getIndexationStatus();
      res.json({ success: true, status });
    } catch (error) {
      console.error('Error fetching indexation status:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Core Web Vitals monitoring - Days 15-30 performance budgets
  app.get('/api/seo/core-web-vitals/cluster', async (req, res) => {
    try {
      const { CoreWebVitalsService } = await import('./seo/coreWebVitals');
      const vitalsService = new CoreWebVitalsService();
      
      const clusterPerformance = await vitalsService.getClusterPerformance();
      res.json({ success: true, performance: clusterPerformance });
    } catch (error) {
      console.error('Error fetching cluster performance:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  app.get('/api/seo/performance-alerts', async (req, res) => {
    try {
      const { CoreWebVitalsService } = await import('./seo/coreWebVitals');
      const vitalsService = new CoreWebVitalsService();
      
      const alerts = vitalsService.checkPerformanceAlerts();
      res.json({ success: true, alerts });
    } catch (error) {
      console.error('Error checking performance alerts:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  app.get('/api/seo/caching-rules', async (req, res) => {
    try {
      const { CoreWebVitalsService } = await import('./seo/coreWebVitals');
      const vitalsService = new CoreWebVitalsService();
      
      const rules = vitalsService.generateCachingRules();
      res.json({ success: true, rules });
    } catch (error) {
      console.error('Error generating caching rules:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Marketplace pilot endpoints - Days 15-30 production rollout
  app.post('/api/marketplace/pilot/enroll', async (req, res) => {
    const { enrollUserInPilot } = await import('./routes/marketplacePilot');
    return enrollUserInPilot(req, res);
  });

  app.get('/api/marketplace/pilot/status', async (req, res) => {
    const { getUserPilotStatus } = await import('./routes/marketplacePilot');
    return getUserPilotStatus(req, res);
  });

  app.post('/api/marketplace/pilot/activate-promotion', async (req, res) => {
    const { activatePartnerPromotion } = await import('./routes/marketplacePilot');
    return activatePartnerPromotion(req, res);
  });

  app.get('/api/marketplace/pilot/metrics/:promotionId', async (req, res) => {
    const { getPromotionMetrics } = await import('./routes/marketplacePilot');
    return getPromotionMetrics(req, res);
  });

  app.get('/api/marketplace/pilot/health', async (req, res) => {
    const { getPilotHealthDashboard } = await import('./routes/marketplacePilot');
    return getPilotHealthDashboard(req, res);
  });

  // Partner monetization endpoints - Final sprint focus
  app.post('/api/marketplace/pricing-experiment', async (req, res) => {
    const { enrollPartnerInPricingExperiment } = await import('./routes/partnerMonetization');
    return enrollPartnerInPricingExperiment(req, res);
  });

  app.post('/api/marketplace/partner/:partnerId/value-report', async (req, res) => {
    const { generatePartnerValueReport } = await import('./routes/partnerMonetization');
    return generatePartnerValueReport(req, res);
  });

  app.put('/api/marketplace/partner/:partnerId/commitment', async (req, res) => {
    const { trackPartnerCommitment } = await import('./routes/partnerMonetization');
    return trackPartnerCommitment(req, res);
  });

  app.get('/api/marketplace/partner/:partnerId/quality-score', async (req, res) => {
    const { getPartnerQualityScore } = await import('./routes/partnerMonetization');
    return getPartnerQualityScore(req, res);
  });

  app.get('/api/marketplace/monetization-dashboard', async (req, res) => {
    const { getMonetizationDashboard } = await import('./routes/partnerMonetization');
    return getMonetizationDashboard(req, res);
  });

  // Set trust proxy for proper client IP detection
  app.set('trust proxy', 1);

  // Global correlation ID middleware for all routes
  app.use(correlationIdMiddleware);

  // Rate limiter for ALL agent endpoints (fixes QA-008)  
  const agentRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 requests per minute
    message: { error: 'Too many agent requests' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health';
    },
    // Use default key generator to avoid IPv6 issues
    keyGenerator: undefined
  });

  // Legacy handleError function - replaced by correlationErrorHandler middleware
  // Kept for backward compatibility with existing non-billing endpoints
  const handleError = (error: any, req: any, res: any) => {
    const correlationId = (req as any).correlationId || req.headers['x-correlation-id'] || Math.random().toString(36);
    
    console.error(`[${correlationId}] Error:`, error);
    
    // Generic error messages for production (security hardening)
    if (process.env.NODE_ENV === 'production') {
      if (error instanceof AuthError) {
        return res.status(401).json({ 
          message: "Authentication failed", 
          correlationId 
        });
      }
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid input data", 
          correlationId 
        });
      }
      return res.status(500).json({ 
        message: "Internal server error", 
        correlationId 
      });
    }
    
    // Detailed errors for development only
    let statusCode = 500;
    if (error instanceof AuthError) statusCode = 401;
    if (error instanceof z.ZodError) statusCode = 400;
    
    return res.status(statusCode).json({ 
      message: error.message || "Internal server error",
      correlationId,
      ...(error instanceof z.ZodError && { 
        details: error.errors.map(e => ({ 
          field: e.path.join('.'), 
          message: e.message 
        }))
      }),
      stack: error.stack
    });
  };

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      handleError(error, req, res);
    }
  });

  // Student profile routes
  app.get('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfile(userId);
      res.json(profile);
    } catch (error) {
      handleError(error, req, res);
    }
  });

  app.post('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Reject requests with unknown fields or dangerous content
      if (req.body.__proto__ || req.body.constructor || req.body.prototype) {
        return res.status(400).json({ message: "Invalid request data" });
      }
      
      const existingProfile = await storage.getStudentProfile(userId);
      
      if (existingProfile) {
        // Use strict update schema for existing profiles
        const validatedData = updateStudentProfileSchema.parse(req.body);
        const updatedProfile = await storage.updateStudentProfile(userId, validatedData);
        res.json(updatedProfile);
      } else {
        // Use full schema for new profiles
        const profileData = insertStudentProfileSchema.parse({ ...req.body, userId });
        const newProfile = await storage.createStudentProfile(profileData);
        res.json(newProfile);
      }
    } catch (error) {
      handleError(error, req, res);
    }
  });

  // Scholarship routes
  app.get('/api/scholarships', isAuthenticated, async (req, res) => {
    try {
      const scholarships = await storage.getScholarships();
      res.json(scholarships);
    } catch (error) {
      handleError(error, req, res);
    }
  });

  app.get('/api/scholarships/:id', isAuthenticated, async (req, res) => {
    try {
      const scholarship = await storage.getScholarshipById(req.params.id);
      if (!scholarship) {
        return res.status(404).json({ message: "Scholarship not found" });
      }
      res.json(scholarship);
    } catch (error) {
      handleError(error, req, res);
    }
  });

  // Scholarship matching routes with auto profile creation
  app.get('/api/matches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let profile = await storage.getStudentProfile(userId);
      
      // Create a minimal profile if none exists
      if (!profile) {
        const user = await storage.getUser(userId);
        if (user) {
          profile = await storage.createStudentProfile({
            userId,
            gpa: null,
            major: null,
            academicLevel: null,
            graduationYear: null,
            school: null,
            location: null,
            demographics: {},
            interests: [],
            extracurriculars: [],
            achievements: [],
            financialNeed: false,
            completionPercentage: 0
          });
        } else {
          return res.status(404).json({ message: "User not found" });
        }
      }

      const matches = await storage.getScholarshipMatches(profile.id);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching matches:", error);
      res.status(500).json({ message: "Failed to fetch scholarship matches" });
    }
  });

  app.post('/api/matches/:id/bookmark', isAuthenticated, async (req, res) => {
    try {
      const updatedMatch = await storage.updateScholarshipMatch(req.params.id, {
        isBookmarked: req.body.bookmarked
      });
      res.json(updatedMatch);
    } catch (error) {
      console.error("Error updating bookmark:", error);
      res.status(500).json({ message: "Failed to update bookmark" });
    }
  });

  app.post('/api/matches/:id/dismiss', isAuthenticated, async (req, res) => {
    try {
      const updatedMatch = await storage.updateScholarshipMatch(req.params.id, {
        isDismissed: true
      });
      res.json(updatedMatch);
    } catch (error) {
      console.error("Error dismissing match:", error);
      res.status(500).json({ message: "Failed to dismiss match" });
    }
  });

  // AI-powered scholarship matching
  app.post('/api/matches/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const scholarships = await storage.getScholarships();
      const existingMatches = await storage.getScholarshipMatches(profile.id);
      const existingScholarshipIds = new Set(existingMatches.map(m => m.scholarshipId));
      
      const newMatches = [];

      // Generate AI-powered matches for scholarships that don't have matches yet
      for (const scholarship of scholarships) {
        if (!existingScholarshipIds.has(scholarship.id)) {
          try {
            const analysis = await openaiService.analyzeScholarshipMatch(profile, {
              title: scholarship.title,
              requirements: scholarship.requirements,
              eligibilityCriteria: scholarship.eligibilityCriteria,
              amount: scholarship.amount,
              organization: scholarship.organization,
            });

            const match = await storage.createScholarshipMatch({
              studentId: profile.id,
              scholarshipId: scholarship.id,
              matchScore: analysis.matchScore,
              matchReason: analysis.matchReason,
              chanceLevel: analysis.chanceLevel,
              isBookmarked: false,
              isDismissed: false,
            });

            newMatches.push(match);
          } catch (error) {
            console.error(`Error analyzing match for scholarship ${scholarship.id}:`, error);
            // Continue with next scholarship if one fails
          }
        }
      }

      res.json({ 
        message: `Generated ${newMatches.length} new matches`,
        newMatches: newMatches.length 
      });
    } catch (error) {
      console.error("Error generating matches:", error);
      res.status(500).json({ message: "Failed to generate matches" });
    }
  });

  // Application routes with auto profile creation
  app.get('/api/applications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let profile = await storage.getStudentProfile(userId);
      
      // Create a minimal profile if none exists
      if (!profile) {
        const user = await storage.getUser(userId);
        if (user) {
          profile = await storage.createStudentProfile({
            userId,
            gpa: null,
            major: null,
            academicLevel: null,
            graduationYear: null,
            school: null,
            location: null,
            demographics: {},
            interests: [],
            extracurriculars: [],
            achievements: [],
            financialNeed: false,
            completionPercentage: 0
          });
        } else {
          return res.status(404).json({ message: "User not found" });
        }
      }

      const applications = await storage.getApplicationsByStudent(profile.id);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.post('/api/applications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const applicationData = insertApplicationSchema.parse({
        ...req.body,
        studentId: profile.id
      });
      
      const application = await storage.createApplication(applicationData);
      res.json(application);
    } catch (error) {
      console.error("Error creating application:", error);
      res.status(500).json({ message: "Failed to create application" });
    }
  });

  app.put('/api/applications/:id', isAuthenticated, async (req, res) => {
    try {
      const application = await storage.updateApplication(req.params.id, req.body);
      res.json(application);
    } catch (error) {
      console.error("Error updating application:", error);
      res.status(500).json({ message: "Failed to update application" });
    }
  });

  // Document routes
  app.get('/api/documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const documents = await storage.getDocumentsByStudent(profile.id);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post('/api/documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const documentData = {
        ...req.body,
        studentId: profile.id
      };
      
      const document = await storage.createDocument(documentData);
      res.json(document);
    } catch (error) {
      console.error("Error creating document record:", error);
      res.status(500).json({ message: "Failed to create document record" });
    }
  });

  app.delete('/api/documents/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteDocument(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Essay routes
  app.get('/api/essays', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const essays = await storage.getEssaysByStudent(profile.id);
      res.json(essays);
    } catch (error) {
      console.error("Error fetching essays:", error);
      res.status(500).json({ message: "Failed to fetch essays" });
    }
  });

  app.get('/api/essays/:id', isAuthenticated, async (req, res) => {
    try {
      const essay = await storage.getEssayById(req.params.id);
      if (!essay) {
        return res.status(404).json({ message: "Essay not found" });
      }
      res.json(essay);
    } catch (error) {
      console.error("Error fetching essay:", error);
      res.status(500).json({ message: "Failed to fetch essay" });
    }
  });

  app.post('/api/essays', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const essayData = insertEssaySchema.parse({
        ...req.body,
        studentId: profile.id
      });
      
      const essay = await storage.createEssay(essayData);
      res.json(essay);
    } catch (error) {
      console.error("Error creating essay:", error);
      res.status(500).json({ message: "Failed to create essay" });
    }
  });

  app.put('/api/essays/:id', isAuthenticated, async (req, res) => {
    try {
      const essay = await storage.updateEssay(req.params.id, req.body);
      res.json(essay);
    } catch (error) {
      console.error("Error updating essay:", error);
      res.status(500).json({ message: "Failed to update essay" });
    }
  });

  app.delete('/api/essays/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteEssay(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting essay:", error);
      res.status(500).json({ message: "Failed to delete essay" });
    }
  });

  // AI-powered essay assistance routes
  app.post('/api/essays/:id/analyze', isAuthenticated, async (req, res) => {
    try {
      const essay = await storage.getEssayById(req.params.id);
      if (!essay) {
        return res.status(404).json({ message: "Essay not found" });
      }

      const feedback = await openaiService.analyzeEssay(
        essay.content || "",
        essay.prompt || ""
      );
      
      res.json(feedback);
    } catch (error) {
      console.error("Error analyzing essay:", error);
      res.status(500).json({ message: "Failed to analyze essay" });
    }
  });

  app.post('/api/essays/generate-outline', isAuthenticated, async (req, res) => {
    try {
      const { prompt, essayType } = req.body;
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }

      const outline = await openaiService.generateEssayOutline(prompt, essayType);
      res.json(outline);
    } catch (error) {
      console.error("Error generating outline:", error);
      res.status(500).json({ message: "Failed to generate outline" });
    }
  });

  app.post('/api/essays/improve-content', isAuthenticated, async (req, res) => {
    try {
      const { content, focusArea } = req.body;
      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

      const improvedContent = await openaiService.improveEssayContent(content, focusArea);
      res.json({ improvedContent });
    } catch (error) {
      console.error("Error improving content:", error);
      res.status(500).json({ message: "Failed to improve content" });
    }
  });

  app.post('/api/essays/generate-ideas', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfile(userId);
      const { essayType } = req.body;

      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const ideas = await openaiService.generateEssayIdeas(profile, essayType || "general");
      res.json({ ideas });
    } catch (error) {
      console.error("Error generating essay ideas:", error);
      res.status(500).json({ message: "Failed to generate essay ideas" });
    }
  });

  // Object storage routes for document uploads
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  app.put("/api/documents/upload", isAuthenticated, async (req: any, res) => {
    if (!req.body.fileURL) {
      return res.status(400).json({ error: "fileURL is required" });
    }

    const userId = req.user?.claims?.sub;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.fileURL,
        {
          owner: userId,
          visibility: "private",
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      handleError(error, req, res);
    }
  });

  // Dashboard stats route
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfile(userId);
      
      if (!profile) {
        return res.json({
          activeApplications: 0,
          newMatches: 0,
          upcomingDeadlines: 0,
          totalApplied: 0
        });
      }

      const applications = await storage.getApplicationsByStudent(profile.id);
      const matches = await storage.getScholarshipMatches(profile.id);
      
      const activeApplications = applications.filter(app => 
        ['draft', 'in_progress'].includes(app.status || '')
      ).length;
      
      const newMatches = matches.filter(match => 
        !match.isBookmarked && !match.isDismissed
      ).length;
      
      // Count deadlines in next 30 days
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const upcomingDeadlines = matches.filter(match => {
        const deadline = new Date(match.scholarship.deadline);
        return deadline <= thirtyDaysFromNow && deadline >= new Date();
      }).length;
      
      const totalApplied = applications.length;

      res.json({
        activeApplications,
        newMatches,
        upcomingDeadlines,
        totalApplied
      });
    } catch (error) {
      handleError(error, req, res);
    }
  });

  // Secure JWT verification middleware for agent endpoints
  const verifyAgentToken = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!process.env.SHARED_SECRET) {
      return res.status(503).json({ error: 'Service unavailable' });
    }

    try {
      // Use secure JWT verification with timing-safe operations
      const decoded = SecureJWTVerifier.verifyToken(token, process.env.SHARED_SECRET!, {
        issuer: 'auto-com-center',
        audience: process.env.AGENT_ID || 'student-pilot',
        clockTolerance: 30
      });

      req.decoded = decoded;
      next();
    } catch (error) {
      // Always return same generic error (timing-safe)
      return res.status(401).json({ error: 'Authentication failed' });
    }
  };

  // Agent Bridge endpoints
  app.post('/agent/register', agentRateLimit, verifyAgentToken, async (req, res) => {
    try {
      // Register agent with Command Center
      res.json({
        agent_id: process.env.AGENT_ID || 'student-pilot',
        name: process.env.AGENT_NAME || 'student_pilot',
        capabilities: agentBridge.getCapabilities(),
        version: '1.0.0',
        health: 'ok',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      handleError(error, req, res);
    }
  });

  app.post('/agent/task', agentRateLimit, verifyAgentToken, async (req, res) => {
    try {
      // Validate task structure with comprehensive schema matching Task interface
      const TaskSchema = z.object({
        task_id: z.string().uuid(),
        action: z.string().min(1).max(100),
        payload: z.any(),
        reply_to: z.string().min(1),
        trace_id: z.string().uuid(),
        requested_by: z.string().min(1),
        resources: z.object({
          priority: z.number(),
          timeout_ms: z.number(),
          retry: z.number()
        }).optional()
      }).strict();
      
      const task = TaskSchema.parse(req.body);
      
      // Process task asynchronously
      setTimeout(async () => {
        try {
          const result = await agentBridge.processTask(task as any);
          if (result !== undefined) {
            await agentBridge.sendResult(result);
          }
        } catch (error) {
          console.error(`Task processing error [${task.task_id}]:`, error);
          const errorResult = {
            task_id: task.task_id,
            status: 'failed' as const,
            error: {
              code: 'PROCESSING_ERROR',
              message: error instanceof Error ? error.message : 'Unknown error'
            },
            trace_id: task.trace_id
          };
          await agentBridge.sendResult(errorResult);
        }
      }, 0);

      res.json({ 
        task_id: task.task_id,
        status: 'accepted',
        message: 'Task accepted for processing'
      });
    } catch (error) {
      handleError(error, req, res);
    }
  });

  app.get('/agent/capabilities', agentRateLimit, (req, res) => {
    // Made publicly readable per CEO directive AUTH-001 with rate limiting
    res.json({
      capabilities: agentBridge.getCapabilities(),
      version: '1.0.0',
      status: 'active'
    });
  });

  app.post('/agent/events', agentRateLimit, verifyAgentToken, async (req, res) => {
    try {
      const event = req.body;
      await agentBridge.sendEvent(event);
      res.json({ status: 'ok' });
    } catch (error) {
      handleError(error, req, res);
    }
  });

  // ========== BILLING SYSTEM ROUTES ==========
  // All billing routes use enhanced correlation ID middleware for financial operation tracking
  
  // Input validation schema for billing endpoints
  const BillingQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: z.string().max(256).optional()
  });
  
  // EMERGENCY SECURITY FIX: Add missing /api/billing/balance endpoint with authentication
  app.get('/api/billing/balance', billingCorrelationMiddleware, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ 
          message: "Authentication required",
          correlationId: (req as any).correlationId 
        });
      }

      const balance = await billingService.getUserBalance(userId);
      const balanceCredits = millicreditsToCredits(balance.balanceMillicredits || BigInt(0));

      res.json({
        balanceCredits: Number(balanceCredits.toFixed(2)),
        balanceUsd: creditsToUsd(balanceCredits),
        balanceMillicredits: Number(balance.balanceMillicredits || BigInt(0))
      });
    } catch (error) {
      return correlationErrorHandler(error, req, res, (req as any).correlationId);
    }
  });

  // Get user's billing summary (balance, packages, recent activity)
  app.get('/api/billing/summary', billingCorrelationMiddleware, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "User ID not found" });
      }

      const summary = await billingService.getUserBillingSummary(userId);
      
      // Handle BigInt serialization by converting to string/number as needed
      const serializedSummary = JSON.parse(JSON.stringify(summary, (key, value) => {
        if (typeof value === 'bigint') {
          // Convert BigInt to number for credits, keep precision for millicredits
          return key.includes('millicredits') || key.includes('Millicredits') ? 
            Number(value) : Number(value);
        }
        return value;
      }));
      
      res.json(serializedSummary);
    } catch (error) {
      const correlationId = (req as any).correlationId;
      console.error(`[${correlationId}] Error fetching billing summary:`, error);
      res.status(500).json({ 
        error: "Failed to fetch billing summary",
        correlationId 
      });
    }
  });

  // Get paginated credit ledger (transaction history)
  app.get('/api/billing/ledger', billingCorrelationMiddleware, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "User ID not found" });
      }

      // Validate input parameters
      const validatedQuery = BillingQuerySchema.parse(req.query);
      const { limit, cursor } = validatedQuery;

      const result = await billingService.getUserLedger(userId, limit, cursor);
      res.json(result);
    } catch (error) {
      const correlationId = (req as any).correlationId;
      console.error(`[${correlationId}] Error fetching ledger:`, error);
      res.status(500).json({ 
        error: "Failed to fetch transaction history",
        correlationId 
      });
    }
  });

  // Get paginated usage history
  app.get('/api/billing/usage', billingCorrelationMiddleware, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "User ID not found" });
      }

      // Validate input parameters
      const validatedQuery = BillingQuerySchema.parse(req.query);
      const { limit, cursor } = validatedQuery;

      const result = await billingService.getUserUsage(userId, limit, cursor);
      res.json(result);
    } catch (error) {
      const correlationId = (req as any).correlationId;
      console.error(`[${correlationId}] Error fetching usage history:`, error);
      res.status(500).json({ 
        error: "Failed to fetch usage history",
        correlationId 
      });
    }
  });

  // Estimate cost for potential OpenAI usage
  app.post('/api/billing/estimate', billingCorrelationMiddleware, isAuthenticated, async (req, res) => {
    try {
      // Validate input parameters
      const EstimateSchema = z.object({
        model: z.string().min(1).max(50),
        inputTokens: z.number().int().min(0).max(1000000),
        outputTokens: z.number().int().min(0).max(1000000)
      });
      
      const { model, inputTokens, outputTokens } = EstimateSchema.parse(req.body);

      const estimate = await billingService.estimateCharge(model, inputTokens, outputTokens);
      res.json(estimate);
    } catch (error) {
      const correlationId = (req as any).correlationId;
      console.error(`[${correlationId}] Error estimating cost:`, error);
      res.status(500).json({ 
        error: "Failed to estimate cost",
        correlationId 
      });
    }
  });

  // Create Stripe checkout session for credit purchase
  app.post('/api/billing/create-checkout', billingCorrelationMiddleware, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const userEmail = (req.user as any)?.claims?.email;
      
      if (!userId) {
        return res.status(401).json({ error: "User ID not found" });
      }

      // Validate package code
      const CheckoutSchema = z.object({
        packageCode: z.enum(['basic', 'premium', 'enterprise'], {
          errorMap: () => ({ message: "Invalid package code. Must be 'basic', 'premium', or 'enterprise'" })
        })
      });
      
      const { packageCode } = CheckoutSchema.parse(req.body);

      const packageData = CREDIT_PACKAGES[packageCode as keyof typeof CREDIT_PACKAGES];

      // Create purchase record
      const [purchase] = await db.insert(purchases).values({
        userId,
        packageCode: packageCode as any,
        priceUsdCents: packageData.priceUsdCents,
        baseCredits: packageData.baseCredits,
        bonusCredits: packageData.bonusCredits,
        totalCredits: packageData.totalCredits,
        status: "created",
      }).returning();

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `ScholarLink Credits - ${packageCode.charAt(0).toUpperCase() + packageCode.slice(1)}`,
              description: `${packageData.baseCredits.toLocaleString()} credits${packageData.bonusCredits > 0 ? ` + ${packageData.bonusCredits.toLocaleString()} bonus credits` : ''}`,
            },
            unit_amount: packageData.priceUsdCents,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${req.protocol}://${req.headers.host}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.protocol}://${req.headers.host}/billing?canceled=true`,
        customer_email: userEmail || undefined,
        metadata: {
          purchaseId: purchase.id,
          userId: userId,
          packageCode: packageCode,
        },
      });

      // Update purchase with Stripe session ID
      await db
        .update(purchases)
        .set({ stripeSessionId: session.id })
        .where(eq(purchases.id, purchase.id));

      res.json({ 
        sessionId: session.id,
        url: session.url,
        purchaseId: purchase.id 
      });
    } catch (error) {
      const correlationId = (req as any).correlationId;
      console.error(`[${correlationId}] Error creating checkout session:`, error);
      res.status(500).json({ 
        error: "Failed to create checkout session",
        correlationId 
      });
    }
  });

  // Stripe webhook handler for payment completion
  app.post('/api/billing/stripe-webhook', billingCorrelationMiddleware, express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      const correlationId = (req as any).correlationId;
      console.error(`[${correlationId}] STRIPE_WEBHOOK_SECRET not configured`);
      return res.status(400).json({ 
        error: "Webhook secret not configured",
        correlationId 
      });
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret);
    } catch (err) {
      const correlationId = (req as any).correlationId;
      console.error(`[${correlationId}] Webhook signature verification failed:`, err);
      return res.status(400).json({ 
        error: "Webhook signature verification failed",
        correlationId 
      });
    }

    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any;
        const purchaseId = session.metadata?.purchaseId;
        
        if (!purchaseId) {
          const correlationId = (req as any).correlationId;
          console.error(`[${correlationId}] Purchase ID not found in session metadata`);
          return res.status(400).json({ 
            error: "Purchase ID missing",
            correlationId 
          });
        }

        // Mark purchase as paid
        await db
          .update(purchases)
          .set({ 
            status: "paid",
            stripePaymentIntentId: session.payment_intent,
            updatedAt: new Date(),
          })
          .where(eq(purchases.id, purchaseId));

        // Award credits to user
        await billingService.awardPurchaseCredits(purchaseId);
        
        console.log(`✅ Purchase ${purchaseId} completed and credits awarded`);
      }

      res.json({ received: true });
    } catch (error) {
      const correlationId = (req as any).correlationId;
      console.error(`[${correlationId}] Error processing webhook:`, error);
      res.status(500).json({ 
        error: "Webhook processing failed",
        correlationId 
      });
    }
  });

  // TTV Analytics and Cohort Management Routes
  app.post('/api/analytics/ttv-event', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const { eventType, metadata, sessionId } = req.body;
      const correlationId = (req as any).correlationId;
      
      await ttvTracker.trackEvent(userId, eventType, {
        metadata,
        sessionId,
        correlationId
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to track TTV event:', error);
      res.status(500).json({ error: 'Failed to track event' });
    }
  });

  app.get('/api/analytics/user-ttv', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const metrics = await ttvTracker.getUserTtvMetrics(userId);
      res.json(metrics);
    } catch (error) {
      console.error('Failed to get user TTV metrics:', error);
      res.status(500).json({ error: 'Failed to get metrics' });
    }
  });

  // Cohort Management Routes
  app.post('/api/cohorts', isAuthenticated, async (req, res) => {
    try {
      const { name, description, targetSize } = req.body;
      const cohort = await cohortManager.createCohort({ name, description, targetSize });
      res.json(cohort);
    } catch (error) {
      console.error('Failed to create cohort:', error);
      res.status(500).json({ error: 'Failed to create cohort' });
    }
  });

  app.get('/api/cohorts', isAuthenticated, async (req, res) => {
    try {
      const cohorts = await cohortManager.getActiveCohorts();
      res.json(cohorts);
    } catch (error) {
      console.error('Failed to get cohorts:', error);
      res.status(500).json({ error: 'Failed to get cohorts' });
    }
  });

  app.get('/api/cohorts/:cohortId', isAuthenticated, async (req, res) => {
    try {
      const { cohortId } = req.params;
      const cohortData = await cohortManager.getCohortWithStats(cohortId);
      if (!cohortData) {
        return res.status(404).json({ error: 'Cohort not found' });
      }
      res.json(cohortData);
    } catch (error) {
      console.error('Failed to get cohort:', error);
      res.status(500).json({ error: 'Failed to get cohort' });
    }
  });

  app.post('/api/cohorts/:cohortId/users', isAuthenticated, async (req, res) => {
    try {
      const { cohortId } = req.params;
      const userId = (req.user as any)?.claims?.sub;
      const userCohort = await cohortManager.addUserToCohort(userId, cohortId);
      res.json(userCohort);
    } catch (error: any) {
      console.error('Failed to add user to cohort:', error);
      res.status(500).json({ error: error.message || 'Failed to add user to cohort' });
    }
  });

  app.get('/api/cohorts/:cohortId/users', isAuthenticated, async (req, res) => {
    try {
      const { cohortId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const cohortUsers = await cohortManager.getCohortUsers(cohortId, limit, offset);
      res.json(cohortUsers);
    } catch (error) {
      console.error('Failed to get cohort users:', error);
      res.status(500).json({ error: 'Failed to get cohort users' });
    }
  });

  app.get('/api/cohorts/:cohortId/analytics', isAuthenticated, async (req, res) => {
    try {
      const { cohortId } = req.params;
      const analytics = await ttvTracker.getCohortAnalytics(cohortId);
      res.json(analytics);
    } catch (error) {
      console.error('Failed to get cohort analytics:', error);
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  });

  // Launch 100-user cohort endpoint
  app.post('/api/cohorts/launch-100-user', isAuthenticated, async (req, res) => {
    try {
      const { name } = req.body;
      const cohort = await cohortManager.launch100UserCohort(name);
      res.json(cohort);
    } catch (error) {
      console.error('Failed to launch 100-user cohort:', error);
      res.status(500).json({ error: 'Failed to launch cohort' });
    }
  });

  // TTV Dashboard Analytics endpoint
  app.get('/api/analytics/ttv-dashboard', isAuthenticated, async (req, res) => {
    const correlationId = (req as any).correlationId;
    res.set('X-Correlation-ID', correlationId);
    
    try {
      // Get active cohorts for analysis
      const activeCohorts = await cohortManager.getActiveCohorts();
      
      if (activeCohorts.length === 0) {
        return res.json({
          medianTTV: null,
          p95TTV: null,
          targetMet: false,
          cohortDetails: [],
          totalUsers: 0,
          performanceStatus: 'no-data'
        });
      }

      // Get TTV metrics across all active cohorts
      let allMetrics: number[] = [];
      let cohortDetails = [];
      let totalUsers = 0;

      for (const cohort of activeCohorts) {
        const analytics = await ttvTracker.getCohortAnalytics(cohort.id);
        totalUsers += analytics.userCount;
        
        // Get detailed metrics for median/P95 calculation
        const cohortMetrics = await ttvTracker.getCohortTtvMetrics(cohort.id);
        allMetrics = allMetrics.concat(cohortMetrics.filter((m: number | null): m is number => m !== null));

        cohortDetails.push({
          id: cohort.id,
          name: cohort.name,
          userCount: analytics.userCount,
          avgTimeToFirstValue: analytics.avgTimeToFirstValue,
          conversionRates: analytics.conversionRates
        });
      }

      // Calculate median and P95
      if (allMetrics.length === 0) {
        return res.json({
          medianTTV: null,
          p95TTV: null,
          targetMet: false,
          cohortDetails,
          totalUsers,
          performanceStatus: 'insufficient-data'
        });
      }

      allMetrics.sort((a, b) => a - b);
      const medianIndex = Math.floor(allMetrics.length / 2);
      const median = allMetrics.length % 2 === 0 
        ? (allMetrics[medianIndex - 1] + allMetrics[medianIndex]) / 2
        : allMetrics[medianIndex];

      const p95Index = Math.floor(allMetrics.length * 0.95);
      const p95 = allMetrics[p95Index];

      // Convert from seconds to minutes
      const medianMinutes = median / 60;
      const p95Minutes = p95 / 60;

      // Check if targets are met (≤3 minutes median, ≤7 minutes P95)
      const medianTargetMet = medianMinutes <= 3;
      const p95TargetMet = p95Minutes <= 7;
      const overallTargetMet = medianTargetMet && p95TargetMet;

      let performanceStatus = 'excellent';
      if (!medianTargetMet || !p95TargetMet) {
        performanceStatus = medianMinutes <= 5 && p95Minutes <= 10 ? 'warning' : 'needs-attention';
      }

      res.json({
        medianTTV: Math.round(medianMinutes * 10) / 10, // Round to 1 decimal
        p95TTV: Math.round(p95Minutes * 10) / 10,
        medianTargetMet,
        p95TargetMet,
        targetMet: overallTargetMet,
        cohortDetails,
        totalUsers,
        performanceStatus,
        targets: {
          median: 3,
          p95: 7
        }
      });
    } catch (error) {
      console.error('TTV dashboard analytics error:', error);
      res.status(500).json({ error: 'Failed to get TTV analytics' });
    }
  });

  // Infrastructure/SRE endpoints
  app.get("/api/backup/health", isAuthenticated, async (req, res) => {
    const correlationId = (req as any).correlationId;
    res.set('X-Correlation-ID', correlationId);
    try {
      const result = await backupRestoreManager.testDatabaseConnectivity();
      res.json(result);
    } catch (error) {
      console.error("Backup health check error:", error);
      res.status(500).json({ error: "Health check failed" });
    }
  });

  app.post("/api/backup/test", isAuthenticated, async (req, res) => {
    const correlationId = (req as any).correlationId;
    res.set('X-Correlation-ID', correlationId);
    try {
      const result = await backupRestoreManager.performBackupTest();
      res.json(result);
    } catch (error) {
      console.error("Backup test error:", error);
      res.status(500).json({ error: "Backup test failed" });
    }
  });

  app.get("/api/backup/metadata", isAuthenticated, async (req, res) => {
    const correlationId = (req as any).correlationId;
    res.set('X-Correlation-ID', correlationId);
    try {
      const metadata = await backupRestoreManager.generateBackupMetadata();
      res.json(metadata);
    } catch (error) {
      console.error("Backup metadata error:", error);
      res.status(500).json({ error: "Failed to generate metadata" });
    }
  });

  app.get("/api/backup/stats", isAuthenticated, async (req, res) => {
    const correlationId = (req as any).correlationId;
    res.set('X-Correlation-ID', correlationId);
    try {
      const stats = await backupRestoreManager.getDatabaseStats();
      res.json(stats);
    } catch (error) {
      console.error("Database stats error:", error);
      res.status(500).json({ error: "Failed to get database stats" });
    }
  });

  // SOC2 Compliance endpoints
  app.get("/api/compliance/soc2/access-control", isAuthenticated, async (req, res) => {
    const correlationId = (req as any).correlationId;
    res.set('X-Correlation-ID', correlationId);
    try {
      const evidence = await soc2EvidenceCollector.collectAccessControlEvidence();
      res.json(evidence);
    } catch (error) {
      console.error("SOC2 access control evidence error:", error);
      res.status(500).json({ error: "Failed to collect access control evidence" });
    }
  });

  app.get("/api/compliance/soc2/system-operations", isAuthenticated, async (req, res) => {
    const correlationId = (req as any).correlationId;
    res.set('X-Correlation-ID', correlationId);
    try {
      const evidence = await soc2EvidenceCollector.collectSystemOperationsEvidence();
      res.json(evidence);
    } catch (error) {
      console.error("SOC2 system operations evidence error:", error);
      res.status(500).json({ error: "Failed to collect system operations evidence" });
    }
  });

  app.get("/api/compliance/soc2/data-protection", isAuthenticated, async (req, res) => {
    const correlationId = (req as any).correlationId;
    res.set('X-Correlation-ID', correlationId);
    try {
      const evidence = await soc2EvidenceCollector.collectDataProtectionEvidence();
      res.json(evidence);
    } catch (error) {
      console.error("SOC2 data protection evidence error:", error);
      res.status(500).json({ error: "Failed to collect data protection evidence" });
    }
  });

  app.post("/api/compliance/soc2/generate-report", isAuthenticated, async (req, res) => {
    const correlationId = (req as any).correlationId;
    res.set('X-Correlation-ID', correlationId);
    try {
      const reportId = await soc2EvidenceCollector.generateSOC2EvidenceReport();
      res.json({ reportId, message: "SOC2 evidence report generated successfully" });
    } catch (error) {
      console.error("SOC2 report generation error:", error);
      res.status(500).json({ error: "Failed to generate SOC2 report" });
    }
  });

  // PII Lineage endpoints
  app.get("/api/compliance/pii/inventory", isAuthenticated, async (req, res) => {
    const correlationId = (req as any).correlationId;
    res.set('X-Correlation-ID', correlationId);
    try {
      const inventory = piiLineageTracker.getPIIInventory();
      res.json(inventory);
    } catch (error) {
      console.error("PII inventory error:", error);
      res.status(500).json({ error: "Failed to get PII inventory" });
    }
  });

  app.get("/api/compliance/pii/data-flows", isAuthenticated, async (req, res) => {
    const correlationId = (req as any).correlationId;
    res.set('X-Correlation-ID', correlationId);
    try {
      const flows = piiLineageTracker.getDataFlows();
      res.json(flows);
    } catch (error) {
      console.error("PII data flows error:", error);
      res.status(500).json({ error: "Failed to get data flows" });
    }
  });

  app.get("/api/compliance/pii/processing-activities", isAuthenticated, async (req, res) => {
    const correlationId = (req as any).correlationId;
    res.set('X-Correlation-ID', correlationId);
    try {
      const activities = piiLineageTracker.getProcessingActivities();
      res.json(activities);
    } catch (error) {
      console.error("PII processing activities error:", error);
      res.status(500).json({ error: "Failed to get processing activities" });
    }
  });

  app.post("/api/compliance/pii/generate-report", isAuthenticated, async (req, res) => {
    const correlationId = (req as any).correlationId;
    res.set('X-Correlation-ID', correlationId);
    try {
      const reportId = await piiLineageTracker.generatePIILineageReport();
      res.json({ reportId, message: "PII lineage report generated successfully" });
    } catch (error) {
      console.error("PII lineage report error:", error);
      res.status(500).json({ error: "Failed to generate PII lineage report" });
    }
  });

  // Enhanced health check with database connectivity (fixes QA-010)
  app.get('/health', async (req, res) => {
    try {
      const { checkDatabaseHealth } = await import('./db');
      const dbHealthy = await checkDatabaseHealth();
      
      res.json({
        status: dbHealthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        agent_id: process.env.AGENT_ID || 'student-pilot',
        last_seen: new Date().toISOString(),
        database: dbHealthy ? 'connected' : 'disconnected',
        version: '1.0.0',
        capabilities: agentBridge.getCapabilities()
      });
    } catch (error) {
      handleError(error, req, res);
    }
  });

  const httpServer = createServer(app);

  // Start agent bridge when server is ready
  httpServer.on('listening', () => {
    agentBridge.start().catch(error => {
      console.error('Failed to start agent bridge:', error);
    });
  });

  // Cleanup on server close
  httpServer.on('close', () => {
    agentBridge.stop();
  });

  return httpServer;
}
