/**
 * ARR Data Freshness Monitoring - Revenue data staleness tracking
 * Ensures financial data accuracy with real-time freshness alerts
 */
import { Request, Response } from 'express';
import { db } from '../db';
import { usageEvents, creditLedger } from '../../shared/schema';
import { sql, desc, and, gte } from 'drizzle-orm';
import { secureLogger } from '../logging/secureLogger';
import { alertManager } from './alertManager';
import { FINANCE_CONTROLS } from '../config/featureFlags';

interface FreshnessMetric {
  dataSource: string;
  lastUpdate: Date;
  ageDuration: number; // milliseconds
  ageHours: number;
  status: 'fresh' | 'stale' | 'critical';
  recordCount: number;
  threshold: number; // hours
}

interface ArrFreshnessReport {
  overallStatus: 'healthy' | 'degraded' | 'critical';
  lastChecked: Date;
  metrics: FreshnessMetric[];
  alerts: string[];
  recommendations: string[];
  financeFreezeActive?: boolean;
}

class ArrFreshnessMonitor {
  private readonly FRESHNESS_THRESHOLDS = {
    usageEvents: 24, // hours - usage data should be within 24 hours
    ledgerEntries: 4,  // hours - billing data should be within 4 hours  
    arrCalculation: 1, // hours - ARR calculations should be within 1 hour
    reconciliation: 24, // hours - reconciliation should happen daily
  };

  /**
   * Check freshness of usage events data
   */
  async checkUsageEventsFreshness(): Promise<FreshnessMetric> {
    try {
      // Get latest record timestamp
      const latest = await db
        .select({
          lastUpdate: usageEvents.createdAt,
        })
        .from(usageEvents)
        .orderBy(desc(usageEvents.createdAt))
        .limit(1);

      // Get total count separately
      const countResult = await db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(usageEvents);

      // Ensure lastUpdate is a proper Date object (SQL may return string or null)
      const rawLastUpdate = latest[0]?.lastUpdate;
      const lastUpdate = rawLastUpdate ? new Date(rawLastUpdate) : new Date(0);
      const recordCount = countResult[0]?.count || 0;
      const ageDuration = Date.now() - lastUpdate.getTime();
      const ageHours = ageDuration / (1000 * 60 * 60);
      const threshold = this.FRESHNESS_THRESHOLDS.usageEvents;

      return {
        dataSource: 'usage_events',
        lastUpdate,
        ageDuration,
        ageHours,
        status: ageHours > threshold ? 'critical' : ageHours > threshold * 0.7 ? 'stale' : 'fresh',
        recordCount,
        threshold,
      };
    } catch (error) {
      secureLogger.error('Failed to check usage events freshness', error as Error);
      return {
        dataSource: 'usage_events',
        lastUpdate: new Date(0),
        ageDuration: Date.now(),
        ageHours: 999,
        status: 'critical',
        recordCount: 0,
        threshold: this.FRESHNESS_THRESHOLDS.usageEvents,
      };
    }
  }

  /**
   * Check freshness of ledger entries data
   */
  async checkLedgerFreshness(): Promise<FreshnessMetric> {
    try {
      // Get latest record timestamp
      const latest = await db
        .select({
          lastUpdate: creditLedger.createdAt,
        })
        .from(creditLedger)
        .orderBy(desc(creditLedger.createdAt))
        .limit(1);

      // Get total count separately
      const countResult = await db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(creditLedger);

      // Ensure lastUpdate is a proper Date object (SQL may return string or null)
      const rawLastUpdate = latest[0]?.lastUpdate;
      const lastUpdate = rawLastUpdate ? new Date(rawLastUpdate) : new Date(0);
      const recordCount = countResult[0]?.count || 0;
      const ageDuration = Date.now() - lastUpdate.getTime();
      const ageHours = ageDuration / (1000 * 60 * 60);
      const threshold = this.FRESHNESS_THRESHOLDS.ledgerEntries;

      return {
        dataSource: 'ledger_entries',
        lastUpdate,
        ageDuration,
        ageHours,
        status: ageHours > threshold ? 'critical' : ageHours > threshold * 0.7 ? 'stale' : 'fresh',
        recordCount,
        threshold,
      };
    } catch (error) {
      secureLogger.error('Failed to check ledger freshness', error as Error);
      return {
        dataSource: 'ledger_entries',
        lastUpdate: new Date(0),
        ageDuration: Date.now(),
        ageHours: 999,
        status: 'critical',
        recordCount: 0,
        threshold: this.FRESHNESS_THRESHOLDS.ledgerEntries,
      };
    }
  }

  /**
   * Calculate ARR data freshness based on recent transactions
   */
  async checkArrCalculationFreshness(): Promise<FreshnessMetric> {
    try {
      // Check for recent credit purchases (ARR-impacting events)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const recentActivity = await db
        .select({
          lastUpdate: sql<Date>`MAX(${creditLedger.createdAt})`,
          count: sql<number>`count(*)::int`,
        })
        .from(creditLedger)
        .where(
          and(
            gte(creditLedger.createdAt, oneDayAgo),
            sql`${creditLedger.type} = 'purchase'`
          )
        );

      const result = recentActivity[0];
      // Ensure lastUpdate is a proper Date object (SQL may return string or null)
      const rawLastUpdate = result?.lastUpdate;
      const lastUpdate = rawLastUpdate ? new Date(rawLastUpdate) : new Date(0);
      const ageDuration = Date.now() - lastUpdate.getTime();
      const ageHours = ageDuration / (1000 * 60 * 60);
      const threshold = this.FRESHNESS_THRESHOLDS.arrCalculation;

      return {
        dataSource: 'arr_calculation',
        lastUpdate,
        ageDuration,
        ageHours,
        status: ageHours > threshold ? 'stale' : 'fresh', // Less critical than other metrics
        recordCount: result?.count || 0,
        threshold,
      };
    } catch (error) {
      secureLogger.error('Failed to check ARR calculation freshness', error as Error);
      return {
        dataSource: 'arr_calculation',
        lastUpdate: new Date(0),
        ageDuration: Date.now(),
        ageHours: 999,
        status: 'critical',
        recordCount: 0,
        threshold: this.FRESHNESS_THRESHOLDS.arrCalculation,
      };
    }
  }

  /**
   * Comprehensive ARR freshness report
   */
  async generateFreshnessReport(): Promise<ArrFreshnessReport> {
    try {
      const [usageMetric, ledgerMetric, arrMetric] = await Promise.all([
        this.checkUsageEventsFreshness(),
        this.checkLedgerFreshness(),
        this.checkArrCalculationFreshness(),
      ]);

      const metrics = [usageMetric, ledgerMetric, arrMetric];
      const criticalCount = metrics.filter(m => m.status === 'critical').length;
      const staleCount = metrics.filter(m => m.status === 'stale').length;

      // Determine overall status
      let overallStatus: 'healthy' | 'degraded' | 'critical';
      if (criticalCount > 0) {
        overallStatus = 'critical';
      } else if (staleCount > 0) {
        overallStatus = 'degraded';
      } else {
        overallStatus = 'healthy';
      }

      // Generate alerts for critical/stale data
      // Suppress alerts during finance freeze (stale data is expected when no transactions are occurring)
      const alerts: string[] = [];
      const financeFreezeActive = FINANCE_CONTROLS.ledger_freeze;
      
      for (const metric of metrics) {
        if (metric.status === 'critical') {
          alerts.push(`${metric.dataSource}: Data is ${metric.ageHours.toFixed(1)} hours old (threshold: ${metric.threshold}h)`);
          
          // Only create system alerts if finance freeze is NOT active
          if (!financeFreezeActive) {
            await alertManager.createAlert({
              severity: 'critical',
              service: 'arr-monitoring',
              title: `Stale ARR Data: ${metric.dataSource}`,
              description: `${metric.dataSource} data is ${metric.ageHours.toFixed(1)} hours old, exceeding ${metric.threshold}h threshold`,
              source: 'arr-freshness-monitor',
              metadata: {
                dataSource: metric.dataSource,
                ageHours: metric.ageHours,
                threshold: metric.threshold,
                recordCount: metric.recordCount,
              },
            });
          }
        } else if (metric.status === 'stale') {
          alerts.push(`${metric.dataSource}: Data is getting stale (${metric.ageHours.toFixed(1)}h old)`);
        }
      }
      
      // Add finance freeze note if active
      if (financeFreezeActive && alerts.length > 0) {
        alerts.push('[SUPPRESSED] Alerts not escalated due to active finance freeze');
      }

      // Generate recommendations
      const recommendations: string[] = [];
      if (usageMetric.status !== 'fresh') {
        recommendations.push('Check OpenAI API integration and usage tracking');
      }
      if (ledgerMetric.status !== 'fresh') {
        recommendations.push('Verify billing service and Stripe webhook processing');
      }
      if (arrMetric.status === 'stale') {
        recommendations.push('Review ARR calculation pipeline and data processing');
      }

      return {
        overallStatus,
        lastChecked: new Date(),
        metrics,
        alerts,
        recommendations,
        financeFreezeActive,
      };
    } catch (error) {
      secureLogger.error('Failed to generate ARR freshness report', error as Error);
      
      return {
        overallStatus: 'critical',
        lastChecked: new Date(),
        metrics: [],
        alerts: ['Failed to generate freshness report due to system error'],
        recommendations: ['Check database connectivity and monitoring system'],
      };
    }
  }

  /**
   * Setup ARR freshness monitoring routes
   */
  setupRoutes(app: any): void {
    // Health check for freshness monitoring (MUST be defined before parameterized routes)
    app.get('/api/monitoring/arr-freshness/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date(),
        thresholds: this.FRESHNESS_THRESHOLDS,
        monitoring: 'active',
      });
    });

    // Get comprehensive freshness report
    app.get('/api/monitoring/arr-freshness', async (req: Request, res: Response) => {
      try {
        const report = await this.generateFreshnessReport();
        res.json(report);
      } catch (error) {
        secureLogger.error('ARR freshness endpoint error', error as Error);
        res.status(500).json({
          error: 'Failed to generate ARR freshness report',
          timestamp: new Date(),
        });
      }
    });

    // Get specific metric freshness (MUST be defined after specific routes)
    app.get('/api/monitoring/arr-freshness/:metric', async (req: Request, res: Response) => {
      try {
        const { metric } = req.params;
        let result: FreshnessMetric;

        switch (metric) {
          case 'usage-events':
            result = await this.checkUsageEventsFreshness();
            break;
          case 'ledger':
            result = await this.checkLedgerFreshness();
            break;
          case 'arr-calculation':
            result = await this.checkArrCalculationFreshness();
            break;
          default:
            return res.status(400).json({ 
              error: 'Invalid metric. Use: usage-events, ledger, or arr-calculation' 
            });
        }

        res.json(result);
      } catch (error) {
        secureLogger.error(`ARR freshness metric error for ${req.params.metric}`, error as Error);
        res.status(500).json({
          error: 'Failed to check metric freshness',
          timestamp: new Date(),
        });
      }
    });
  }
}

// Singleton instance
export const arrFreshnessMonitor = new ArrFreshnessMonitor();

// Run freshness checks every 30 minutes
setInterval(async () => {
  try {
    const report = await arrFreshnessMonitor.generateFreshnessReport();
    const financeFreezeActive = FINANCE_CONTROLS.ledger_freeze;
    secureLogger.info('ARR freshness check completed', {
      overallStatus: report.overallStatus,
      alertCount: report.alerts.length,
      criticalMetrics: report.metrics.filter(m => m.status === 'critical').length,
      alertsEscalated: !financeFreezeActive,
      financeFreezeActive,
    });
  } catch (error) {
    secureLogger.error('ARR freshness check failed', error as Error);
  }
}, 30 * 60 * 1000);

export default ArrFreshnessMonitor;