import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { insertStudentProfileSchema, updateStudentProfileSchema, insertApplicationSchema, insertEssaySchema } from "@shared/schema";
import { z } from "zod";
import { openaiService } from "./openai";
import { agentBridge, type Task } from "./agentBridge";
import { SecureJWTVerifier, AuthError } from "./auth";
import rateLimit from "express-rate-limit";
import { billingService, CREDIT_PACKAGES } from "./billing";
import { db } from "./db";
import { purchases } from "@shared/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import express from "express";
import { correlationIdMiddleware, correlationErrorHandler, billingCorrelationMiddleware } from "./middleware/correlationId";

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

  // Scholarship matching routes
  app.get('/api/matches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
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

  // Application routes
  app.get('/api/applications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
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
      const task = req.body as Task;
      
      // Validate task structure
      if (!task.task_id || !task.action || !task.trace_id) {
        return res.status(400).json({ error: 'Invalid task structure' });
      }
      
      // Process task asynchronously
      setTimeout(async () => {
        try {
          const result = await agentBridge.processTask(task);
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

  app.get('/agent/capabilities', agentRateLimit, verifyAgentToken, (req, res) => {
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

      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const cursor = req.query.cursor as string;

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

      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const cursor = req.query.cursor as string;

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
      const { model, inputTokens, outputTokens } = req.body;
      
      if (!model || typeof inputTokens !== 'number' || typeof outputTokens !== 'number') {
        return res.status(400).json({ 
          error: "Missing or invalid parameters: model, inputTokens, outputTokens required" 
        });
      }

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

      const { packageCode } = req.body;
      
      if (!packageCode || !CREDIT_PACKAGES[packageCode as keyof typeof CREDIT_PACKAGES]) {
        return res.status(400).json({ error: "Invalid package code" });
      }

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
