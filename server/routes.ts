import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { insertStudentProfileSchema, insertApplicationSchema, insertEssaySchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

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

  // Object storage routes for document uploads
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
