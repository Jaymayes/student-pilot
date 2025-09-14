/**
 * Alert Management System - Real-time alert handling and resolution
 * Implements comprehensive alerting with acknowledgment, escalation, and recovery
 */
import { Request, Response } from 'express';
import { secureLogger } from '../logging/secureLogger';
import { checkDatabaseHealth } from '../db';
import { isAuthenticated } from '../replitAuth';
import { z } from 'zod';

export interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  service: string;
  title: string;
  description: string;
  status: 'open' | 'acknowledged' | 'resolved';
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  acknowledgedBy?: string;
  resolvedBy?: string;
  source: string;
  metadata?: Record<string, any>;
}

class AlertManager {
  private alerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private readonly MAX_HISTORY = 1000;

  /**
   * Create new alert with automatic escalation
   */
  async createAlert(alertData: Omit<Alert, 'id' | 'createdAt' | 'status'>): Promise<Alert> {
    const alert: Alert = {
      ...alertData,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'open',
      createdAt: new Date(),
    };

    this.alerts.set(alert.id, alert);
    this.addToHistory(alert);

    // Log alert creation
    secureLogger.info('Alert created', {
      alertId: alert.id,
      severity: alert.severity,
      service: alert.service,
      title: alert.title,
    });

    // Auto-escalate critical alerts
    if (alert.severity === 'critical') {
      setTimeout(() => this.escalateAlert(alert.id), 5 * 60 * 1000); // 5 minutes
    }

    return alert;
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string, userId?: string): Promise<Alert | null> {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status !== 'open') {
      return null;
    }

    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = userId || 'system';

    secureLogger.info('Alert acknowledged', {
      alertId,
      acknowledgedBy: userId,
    });

    return alert;
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string, userId?: string): Promise<Alert | null> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      return null;
    }

    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    alert.resolvedBy = userId || 'system';

    // Move to history and remove from active alerts
    this.addToHistory(alert);
    this.alerts.delete(alertId);

    secureLogger.info('Alert resolved', {
      alertId,
      resolvedBy: userId,
      duration: alert.resolvedAt.getTime() - alert.createdAt.getTime(),
    });

    return alert;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  /**
   * Get alert summary by severity
   */
  getAlertSummary(): { total: number; critical: number; warning: number; info: number } {
    const activeAlerts = this.getActiveAlerts();
    return {
      total: activeAlerts.length,
      critical: activeAlerts.filter(a => a.severity === 'critical').length,
      warning: activeAlerts.filter(a => a.severity === 'warning').length,
      info: activeAlerts.filter(a => a.severity === 'info').length,
    };
  }

  /**
   * Auto-escalate unacknowledged critical alerts
   */
  private async escalateAlert(alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status !== 'open' || alert.severity !== 'critical') {
      return;
    }

    secureLogger.warn('Critical alert escalation', {
      alertId,
      title: alert.title,
      ageMinutes: Math.floor((Date.now() - alert.createdAt.getTime()) / 60000),
    });

    // In production, this would trigger additional notification channels
    // For now, log the escalation
  }

  /**
   * Add alert to history with size management
   */
  private addToHistory(alert: Alert): void {
    this.alertHistory.unshift({ ...alert });
    if (this.alertHistory.length > this.MAX_HISTORY) {
      this.alertHistory = this.alertHistory.slice(0, this.MAX_HISTORY);
    }
  }

  /**
   * Health check alerts - monitor system health and auto-create alerts
   */
  async performHealthCheck(): Promise<void> {
    try {
      // Database health check
      const dbHealthy = await checkDatabaseHealth();
      if (!dbHealthy) {
        await this.createAlert({
          severity: 'critical',
          service: 'database',
          title: 'Database Connection Failed',
          description: 'Unable to connect to database or execute basic queries',
          source: 'health-check',
          metadata: { component: 'postgresql', endpoint: 'connection' },
        });
      }

      // Memory usage check
      const memUsage = process.memoryUsage();
      const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      if (memUsagePercent > 85) {
        await this.createAlert({
          severity: 'warning',
          service: 'system',
          title: 'High Memory Usage',
          description: `Memory usage is ${memUsagePercent.toFixed(1)}%, approaching limits`,
          source: 'health-check',
          metadata: { 
            component: 'memory',
            percentage: memUsagePercent,
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          },
        });
      }

    } catch (error) {
      secureLogger.error('Health check failed', error as Error);
    }
  }

  /**
   * Setup alert management routes
   */
  setupRoutes(app: any): void {
    // Get all active alerts
    app.get('/api/alerts', (req: Request, res: Response) => {
      try {
        const alerts = this.getActiveAlerts();
        const summary = this.getAlertSummary();
        
        res.json({
          alerts,
          summary,
          timestamp: new Date(),
        });
      } catch (error) {
        secureLogger.error('Failed to fetch alerts', error as Error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
      }
    });

    // Get alert summary
    app.get('/api/alerts/summary', (req: Request, res: Response) => {
      try {
        const summary = this.getAlertSummary();
        res.json(summary);
      } catch (error) {
        secureLogger.error('Failed to fetch alert summary', error as Error);
        res.status(500).json({ error: 'Failed to fetch alert summary' });
      }
    });

    // Acknowledge alert
    app.post('/api/alerts/:alertId/acknowledge', isAuthenticated, async (req: Request, res: Response) => {
      try {
        const { alertId } = req.params;
        const userId = (req.user as any)?.claims?.sub;
        
        const alert = await this.acknowledgeAlert(alertId, userId);
        if (!alert) {
          return res.status(404).json({ error: 'Alert not found or cannot be acknowledged' });
        }
        
        res.json(alert);
      } catch (error) {
        secureLogger.error('Failed to acknowledge alert', error as Error);
        res.status(500).json({ error: 'Failed to acknowledge alert' });
      }
    });

    // Resolve alert
    app.post('/api/alerts/:alertId/resolve', isAuthenticated, async (req: Request, res: Response) => {
      try {
        const { alertId } = req.params;
        const userId = (req.user as any)?.claims?.sub;
        
        const alert = await this.resolveAlert(alertId, userId);
        if (!alert) {
          return res.status(404).json({ error: 'Alert not found' });
        }
        
        res.json(alert);
      } catch (error) {
        secureLogger.error('Failed to resolve alert', error as Error);
        res.status(500).json({ error: 'Failed to resolve alert' });
      }
    });

    // Create alert (for webhook integrations)
    app.post('/api/alerts', isAuthenticated, async (req: Request, res: Response) => {
      try {
        // Enhanced validation schema
        const createAlertSchema = z.object({
          severity: z.enum(['critical', 'warning', 'info']),
          service: z.string().min(1).max(100),
          title: z.string().min(1).max(200),
          description: z.string().min(1).max(1000),
          source: z.string().min(1).max(50).optional(),
          metadata: z.record(z.any()).optional(),
        });
        
        const validatedData = createAlertSchema.parse(req.body);
        
        const alert = await this.createAlert({
          ...validatedData,
          source: validatedData.source || 'webhook',
        });
        
        res.status(201).json(alert);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ 
            error: 'Invalid request data',
            details: error.errors
          });
        }
        secureLogger.error('Failed to create alert', error as Error);
        res.status(500).json({ error: 'Failed to create alert' });
      }
    });

    // Health check endpoint
    app.get('/api/alerts/health', async (req: Request, res: Response) => {
      try {
        await this.performHealthCheck();
        res.json({
          status: 'completed',
          timestamp: new Date(),
          alerts: this.getAlertSummary(),
        });
      } catch (error) {
        secureLogger.error('Health check failed', error as Error);
        res.status(500).json({ error: 'Health check failed' });
      }
    });
  }
}

// Singleton instance
export const alertManager = new AlertManager();

// Run health checks every 5 minutes
setInterval(() => {
  alertManager.performHealthCheck();
}, 5 * 60 * 1000);

export default AlertManager;