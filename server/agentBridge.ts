import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { storage } from './storage';
import { openaiService } from './openai';
import { env } from './environment';
import { reliabilityManager } from './reliability';

// Environment variables for agent bridge - using validated environment
const COMMAND_CENTER_URL = env.AUTO_COM_CENTER_BASE_URL || env.COMMAND_CENTER_URL;
const SHARED_SECRET = env.SHARED_SECRET;
const AGENT_NAME = env.AGENT_NAME || 'student_pilot';
const AGENT_ID = env.AGENT_ID || 'student-pilot';
const AGENT_BASE_URL = env.AGENT_BASE_URL || `https://${env.REPL_SLUG || 'scholarlink'}.${env.REPL_OWNER || 'user'}.replit.app`;

// Task, Result, and Event schemas
export interface Task {
  task_id: string;
  action: string;
  payload: any;
  reply_to: string;
  trace_id: string;
  requested_by: string;
  resources?: {
    priority: number;
    timeout_ms: number;
    retry: number;
  };
}

export interface Result {
  task_id: string;
  status: 'accepted' | 'in_progress' | 'succeeded' | 'failed';
  result?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  trace_id: string;
}

export interface Event {
  event_id: string;
  type: string;
  source: string;
  data: any;
  time: string;
  trace_id: string;
}

export class AgentBridge {
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    if (!SHARED_SECRET) {
      console.warn('SHARED_SECRET not configured - Agent Bridge will not start');
    }
  }

  // Start the agent bridge
  async start() {
    if (!SHARED_SECRET) {
      console.log('Agent Bridge disabled - SHARED_SECRET not configured');
      return;
    }

    if (!COMMAND_CENTER_URL) {
      // Operator-visible alert for production monitoring
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'WARN',
        component: 'agent-bridge',
        message: 'Agent Bridge running in local-only mode - Command Center orchestration disabled',
        reason: 'AUTO_COM_CENTER_BASE_URL not configured',
        agent_id: AGENT_ID,
        agent_name: AGENT_NAME,
        impact: 'No cross-service orchestration; agent operates independently',
        action_required: 'Configure AUTO_COM_CENTER_BASE_URL if orchestration needed'
      }));
      console.log(`✅ Agent Bridge started for ${AGENT_NAME} (${AGENT_ID}) in local-only mode`);
      return;
    }

    try {
      await this.register();
      console.log('✅ Agent Bridge registered with Command Center');
    } catch (error) {
      // Expected failures: 404 (Command Center not configured), network errors
      console.log('⚠️  Agent Bridge running in local-only mode (Command Center unavailable)');
      console.log(`   Reason: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Start heartbeat regardless of registration status
    this.startHeartbeat();
    console.log(`✅ Agent Bridge started for ${AGENT_NAME} (${AGENT_ID})`);
  }

  // Stop the agent bridge
  stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Register with Command Center
  async register() {
    const registrationData = {
      agent_id: AGENT_ID,
      name: AGENT_NAME,
      base_url: AGENT_BASE_URL,
      capabilities: this.getCapabilities(),
      timestamp: new Date().toISOString()
    };

    const token = jwt.sign(registrationData, SHARED_SECRET!, {
      algorithm: 'HS256',
      issuer: AGENT_ID,
      audience: 'auto-com-center'
    });

    try {
      const response = await reliabilityManager.executeWithProtection(
        'agent-bridge',
        async () => fetch(`${COMMAND_CENTER_URL}/orchestrator/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Agent-Id': AGENT_ID
          },
          body: JSON.stringify(registrationData)
        }),
        async () => {
          console.warn('Command Center unavailable, operating in local-only mode');
          return { ok: true, status: 200 }; // Graceful degradation
        }
      );

      if (!response.ok) {
        const statusText = 'statusText' in response ? response.statusText : 'Unknown error';
        throw new Error(`Registration failed: ${response.status} ${statusText}`);
      }

      console.log('Successfully registered with Command Center');
    } catch (error) {
      console.error('Failed to register with Command Center:', error);
      throw error;
    }
  }

  // Send heartbeat to Command Center
  async sendHeartbeat() {
    if (!COMMAND_CENTER_URL) {
      // Silently skip heartbeat if Command Center not configured
      return;
    }

    const heartbeatData = {
      agent_id: AGENT_ID,
      name: AGENT_NAME,
      base_url: AGENT_BASE_URL,
      capabilities: this.getCapabilities(),
      status: 'online',
      last_seen: new Date().toISOString()
    };

    const token = jwt.sign(heartbeatData, SHARED_SECRET!, {
      algorithm: 'HS256',
      issuer: AGENT_ID,
      audience: 'auto-com-center'
    });

    try {
      const response = await fetch(`${COMMAND_CENTER_URL}/orchestrator/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Agent-Id': AGENT_ID
        },
        body: JSON.stringify(heartbeatData)
      });

      if (!response.ok) {
        console.error(`Heartbeat failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send heartbeat:', error);
    }
  }

  // Start heartbeat interval
  startHeartbeat() {
    this.sendHeartbeat(); // Send initial heartbeat
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 60000); // Every 60 seconds
  }

  // Get agent capabilities
  getCapabilities(): string[] {
    return [
      'student_pilot.match_scholarships',
      'student_pilot.analyze_essay',
      'student_pilot.generate_essay_outline',
      'student_pilot.improve_essay_content',
      'student_pilot.generate_essay_ideas',
      'student_pilot.get_profile',
      'student_pilot.update_profile',
      'student_pilot.create_application',
      'student_pilot.get_applications'
    ];
  }

  // Verify JWT token
  verifyToken(token: string): any {
    if (!SHARED_SECRET) {
      throw new Error('Agent Bridge not configured - SHARED_SECRET missing');
    }
    
    try {
      return jwt.verify(token, SHARED_SECRET, {
        algorithms: ['HS256']
      });
    } catch (error) {
      throw new Error('Invalid JWT token');
    }
  }

  // Process incoming task
  async processTask(task: Task): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Send immediate acceptance
      await this.sendResult({
        task_id: task.task_id,
        status: 'accepted',
        trace_id: task.trace_id
      });

      // Update to in progress
      await this.sendResult({
        task_id: task.task_id,
        status: 'in_progress',
        trace_id: task.trace_id
      });

      // Process the task based on action
      const result = await this.executeAction(task.action, task.payload, task.trace_id);

      // Send success result
      await this.sendResult({
        task_id: task.task_id,
        status: 'succeeded',
        result,
        trace_id: task.trace_id
      });

      // Send completion event
      await this.sendEvent({
        event_id: `${task.task_id}-completed`,
        type: 'task_completed',
        source: AGENT_ID,
        data: {
          task_id: task.task_id,
          action: task.action,
          duration_ms: Date.now() - startTime,
          status: 'succeeded'
        },
        time: new Date().toISOString(),
        trace_id: task.trace_id
      });

    } catch (error) {
      console.error(`Task execution failed for ${task.task_id}:`, error);

      // Send failure result
      await this.sendResult({
        task_id: task.task_id,
        status: 'failed',
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error
        },
        trace_id: task.trace_id
      });

      // Send failure event
      await this.sendEvent({
        event_id: `${task.task_id}-failed`,
        type: 'task_failed',
        source: AGENT_ID,
        data: {
          task_id: task.task_id,
          action: task.action,
          duration_ms: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        time: new Date().toISOString(),
        trace_id: task.trace_id
      });
    }
  }

  // Execute specific action
  async executeAction(action: string, payload: any, traceId: string): Promise<any> {
    console.log(`Executing action: ${action}`, { traceId, payload });

    switch (action) {
      case 'student_pilot.match_scholarships':
        return await this.matchScholarships(payload);

      case 'student_pilot.analyze_essay':
        return await this.analyzeEssay(payload);

      case 'student_pilot.generate_essay_outline':
        return await this.generateEssayOutline(payload);

      case 'student_pilot.improve_essay_content':
        return await this.improveEssayContent(payload);

      case 'student_pilot.generate_essay_ideas':
        return await this.generateEssayIdeas(payload);

      case 'student_pilot.get_profile':
        return await this.getProfile(payload);

      case 'student_pilot.update_profile':
        return await this.updateProfile(payload);

      case 'student_pilot.create_application':
        return await this.createApplication(payload);

      case 'student_pilot.get_applications':
        return await this.getApplications(payload);

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  // Action implementations
  async matchScholarships(payload: { studentId?: string, profileData?: any }): Promise<any> {
    const { studentId, profileData } = payload;
    
    let profile;
    if (studentId) {
      profile = await storage.getStudentProfile(studentId);
    } else if (profileData) {
      profile = profileData;
    } else {
      throw new Error('Either studentId or profileData is required');
    }

    if (!profile) {
      throw new Error('Student profile not found');
    }

    const scholarships = await storage.getScholarships();
    const matches = [];

    for (const scholarship of scholarships) {
      try {
        const analysis = await openaiService.analyzeScholarshipMatch(profile, {
          title: scholarship.title,
          requirements: scholarship.requirements,
          eligibilityCriteria: scholarship.eligibilityCriteria,
          amount: scholarship.amount,
          organization: scholarship.organization,
        });

        matches.push({
          scholarshipId: scholarship.id,
          scholarship: {
            title: scholarship.title,
            organization: scholarship.organization,
            amount: scholarship.amount,
            deadline: scholarship.deadline
          },
          matchScore: analysis.matchScore,
          matchReason: analysis.matchReason,
          chanceLevel: analysis.chanceLevel
        });
      } catch (error) {
        console.error(`Error analyzing match for scholarship ${scholarship.id}:`, error);
      }
    }

    return {
      matches: matches.sort((a, b) => b.matchScore - a.matchScore),
      totalMatches: matches.length,
      profileId: profile.id
    };
  }

  async analyzeEssay(payload: { content: string, prompt?: string }): Promise<any> {
    const { content, prompt } = payload;
    
    if (!content) {
      throw new Error('Essay content is required');
    }

    const feedback = await openaiService.analyzeEssay(content, prompt);
    return feedback;
  }

  async generateEssayOutline(payload: { prompt: string, essayType?: string }): Promise<any> {
    const { prompt, essayType = 'general' } = payload;
    
    if (!prompt) {
      throw new Error('Essay prompt is required');
    }

    const outline = await openaiService.generateEssayOutline(prompt, essayType);
    return outline;
  }

  async improveEssayContent(payload: { content: string, focusArea?: string }): Promise<any> {
    const { content, focusArea } = payload;
    
    if (!content) {
      throw new Error('Essay content is required');
    }

    const improvedContent = await openaiService.improveEssayContent(content, focusArea);
    return { improvedContent };
  }

  async generateEssayIdeas(payload: { profileData?: any, essayType?: string }): Promise<any> {
    const { profileData, essayType = 'general' } = payload;
    
    if (!profileData) {
      throw new Error('Profile data is required');
    }

    const ideas = await openaiService.generateEssayIdeas(profileData, essayType);
    return { ideas };
  }

  async getProfile(payload: { userId: string }): Promise<any> {
    const { userId } = payload;
    
    if (!userId) {
      throw new Error('User ID is required');
    }

    const profile = await storage.getStudentProfile(userId);
    return profile;
  }

  async updateProfile(payload: { userId: string, profileData: any }): Promise<any> {
    const { userId, profileData } = payload;
    
    if (!userId || !profileData) {
      throw new Error('User ID and profile data are required');
    }

    const existingProfile = await storage.getStudentProfile(userId);
    if (existingProfile) {
      const updatedProfile = await storage.updateStudentProfile(userId, profileData);
      return updatedProfile;
    } else {
      const newProfile = await storage.createStudentProfile({ ...profileData, userId });
      return newProfile;
    }
  }

  async createApplication(payload: { studentId: string, scholarshipId: string, applicationData?: any }): Promise<any> {
    const { studentId, scholarshipId, applicationData = {} } = payload;
    
    if (!studentId || !scholarshipId) {
      throw new Error('Student ID and scholarship ID are required');
    }

    const application = await storage.createApplication({
      studentId,
      scholarshipId,
      status: 'draft',
      progressPercentage: 0,
      ...applicationData
    });

    return application;
  }

  async getApplications(payload: { studentId: string }): Promise<any> {
    const { studentId } = payload;
    
    if (!studentId) {
      throw new Error('Student ID is required');
    }

    const applications = await storage.getApplicationsByStudent(studentId);
    return { applications };
  }

  // Send result back to Command Center
  async sendResult(result: Result): Promise<void> {
    const { SecureJWTVerifier } = await import('./auth');
    const token = SecureJWTVerifier.signToken(result, SHARED_SECRET!, {
      issuer: AGENT_ID,
      audience: 'auto-com-center',
      expiresIn: '5m'
    });

    try {
      const response = await fetch(`${COMMAND_CENTER_URL}/orchestrator/tasks/${result.task_id}/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Agent-Id': AGENT_ID,
          'X-Trace-Id': result.trace_id
        },
        body: JSON.stringify(result)
      });

      if (!response.ok) {
        console.error(`Failed to send result: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send result to Command Center:', error);
    }
  }

  // Send event to Command Center
  async sendEvent(event: Event): Promise<void> {
    const { SecureJWTVerifier } = await import('./auth');
    const token = SecureJWTVerifier.signToken(event, SHARED_SECRET!, {
      issuer: AGENT_ID,
      audience: 'auto-com-center',
      expiresIn: '5m'
    });

    try {
      const response = await fetch(`${COMMAND_CENTER_URL}/orchestrator/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Agent-Id': AGENT_ID,
          'X-Trace-Id': event.trace_id
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        console.error(`Failed to send event: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send event to Command Center:', error);
    }
  }
}

export const agentBridge = new AgentBridge();