import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { insertStudentProfileSchema, insertApplicationSchema, insertEssaySchema } from "@shared/schema";
import { openaiService } from "./openai";
import { agentBridge, type Task } from "./agentBridge";
import rateLimit from "express-rate-limit";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Rate limiter for agent endpoints
  const agentRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 requests per minute
    message: { error: 'Too many agent requests' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Student profile routes
  app.get('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfile(userId);
      res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.post('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profileData = insertStudentProfileSchema.parse({ ...req.body, userId });
      
      const existingProfile = await storage.getStudentProfile(userId);
      if (existingProfile) {
        const updatedProfile = await storage.updateStudentProfile(userId, req.body);
        res.json(updatedProfile);
      } else {
        const newProfile = await storage.createStudentProfile(profileData);
        res.json(newProfile);
      }
    } catch (error) {
      console.error("Error creating/updating profile:", error);
      res.status(500).json({ message: "Failed to save profile" });
    }
  });

  // Scholarship routes
  app.get('/api/scholarships', isAuthenticated, async (req, res) => {
    try {
      const scholarships = await storage.getScholarships();
      res.json(scholarships);
    } catch (error) {
      console.error("Error fetching scholarships:", error);
      res.status(500).json({ message: "Failed to fetch scholarships" });
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
      console.error("Error fetching scholarship:", error);
      res.status(500).json({ message: "Failed to fetch scholarship" });
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
      console.error("Error setting document file:", error);
      res.status(500).json({ error: "Internal server error" });
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
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Agent Bridge endpoints
  app.post('/agent/register', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
      }

      const token = authHeader.substring(7);
      const decoded = agentBridge.verifyToken(token);

      res.json({
        agent_id: process.env.AGENT_ID || 'student-pilot',
        name: process.env.AGENT_NAME || 'student_pilot',
        capabilities: agentBridge.getCapabilities(),
        version: '1.0.0',
        health: 'ok',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Agent registration error:', error);
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  app.post('/agent/task', agentRateLimit, async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const agentId = req.headers['x-agent-id'];
      const traceId = req.headers['x-trace-id'];

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
      }

      const token = authHeader.substring(7);
      const decoded = agentBridge.verifyToken(token);

      // Validate task structure
      const task: Task = req.body;
      if (!task.task_id || !task.action || !task.trace_id) {
        return res.status(400).json({ error: 'Invalid task structure' });
      }

      // Respond immediately with 202 Accepted
      res.status(202).json({ status: 'accepted', task_id: task.task_id });

      // Process task asynchronously
      setImmediate(() => {
        agentBridge.processTask(task).catch(error => {
          console.error('Async task processing error:', error);
        });
      });

    } catch (error) {
      console.error('Agent task error:', error);
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  app.get('/agent/capabilities', async (req, res) => {
    res.json({
      agent_id: process.env.AGENT_ID || 'student-pilot',
      name: process.env.AGENT_NAME || 'student_pilot',
      capabilities: agentBridge.getCapabilities(),
      version: '1.0.0',
      health: 'ok'
    });
  });

  app.post('/agent/events', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
      }

      const token = authHeader.substring(7);
      const decoded = agentBridge.verifyToken(token);

      const event = req.body;
      await agentBridge.sendEvent(event);
      
      res.json({ status: 'ok' });
    } catch (error) {
      console.error('Agent event error:', error);
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  // Override health endpoint to include agent information
  app.get('/health', async (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      agent_id: process.env.AGENT_ID || 'student-pilot',
      last_seen: new Date().toISOString(),
      version: '1.0.0',
      capabilities: agentBridge.getCapabilities()
    });
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
