/**
 * ScholarLink Production Canary Synthetic Monitor
 * Frequency: 60s checks with exponential backoff on failure
 * User-Agent: ScholarshipAI-Canary/1.0
 * Flags: ?e2e=1 to avoid analytics pollution
 */

import { z } from 'zod';

// ==================== CONFIGURATION ====================

const CONFIG = {
  baseUrl: process.env.CANARY_BASE_URL || 'https://scholarlink.replit.app',
  checkInterval: 60_000, // 60 seconds
  userAgent: 'ScholarshipAI-Canary/1.0',
  timeout: 10_000, // 10 second timeout per request
  exponentialBackoff: {
    initial: 1000,
    max: 30_000,
    multiplier: 2,
  },
  alerts: {
    webhookUrl: process.env.ALERT_WEBHOOK_URL,
    slackChannel: process.env.SLACK_CHANNEL || '#ship-room',
  },
};

// ==================== SCHEMA VALIDATORS ====================

const TtvDashboardSchema = z.object({
  medianTTV: z.number().nullable(),
  p95TTV: z.number().nullable(),
  targetHitRate: z.number().nullable(),
  activeUsers: z.number(),
  conversionRate: z.number(),
  avgTimeToFirstMatch: z.object({
    median: z.number(),
    p95: z.number(),
  }),
});

const SecurityDashboardSchema = z.object({
  evidenceRegistry: z.object({
    soc2Controls: z.record(z.string(), z.boolean()),
    soc2aControls: z.record(z.string(), z.boolean()),
    coppaCompliance: z.record(z.string(), z.boolean()),
    ferpaCompliance: z.record(z.string(), z.boolean()),
    gdprCompliance: z.record(z.string(), z.boolean()),
  }),
  vulnerabilitySummary: z.object({
    critical: z.number(),
    high: z.number(),
    medium: z.number(),
    low: z.number(),
  }),
  lastPenTest: z.string(),
  csrfProtection: z.boolean(),
  rateLimitingActive: z.boolean(),
  sslGrade: z.string(),
  dataClassification: z.object({
    pii: z.boolean(),
    pci: z.boolean(),
    ferpa: z.boolean(),
    phi: z.boolean(),
  }),
  incidentResponse: z.object({
    mttr: z.string(),
    incidentResponseTested: z.boolean(),
    lastAudit: z.string(),
  }),
});

const InfrastructureDashboardSchema = z.object({
  backup: z.object({
    status: z.enum(['healthy', 'warning', 'critical']),
    lastBackup: z.string(),
    size: z.string(),
    retention: z.string(),
    automated: z.boolean(),
  }),
  database: z.object({
    status: z.enum(['healthy', 'warning', 'critical']),
    connections: z.number(),
    replicationLag: z.string(),
    diskUsage: z.string(),
  }),
  storage: z.object({
    status: z.enum(['healthy', 'warning', 'critical']),
    totalSize: z.string(),
    usedSize: z.string(),
    availableSize: z.string(),
  }),
  monitoring: z.object({
    status: z.enum(['healthy', 'warning', 'critical']),
    uptime: z.string(),
    alertsConfigured: z.number(),
    logsRetention: z.string(),
  }),
  systemHealth: z.object({
    backupSystem: z.enum(['healthy', 'warning', 'critical']),
  }),
});

const ScholarshipSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
  deadline: z.string(),
  description: z.string(),
  provider: z.string(),
  requirements: z.array(z.string()),
  eligibility: z.record(z.string(), z.any()),
});

const HealthSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string(),
  uptime: z.number(),
  version: z.string().optional(),
});

// ==================== MONITORING CHECKS ====================

interface CheckResult {
  endpoint: string;
  status: 'success' | 'failure';
  latency: number;
  statusCode: number;
  schemaValid: boolean;
  errorMessage?: string;
  timestamp: string;
  buildId?: string;
  gitSha?: string;
}

class SyntheticMonitor {
  private failureCount = 0;
  private metrics: CheckResult[] = [];

  async fetch(path: string, schema?: z.ZodSchema): Promise<CheckResult> {
    const url = `${CONFIG.baseUrl}${path}${path.includes('?') ? '&' : '?'}e2e=1`;
    const start = Date.now();
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': CONFIG.userAgent,
        },
        signal: AbortSignal.timeout(CONFIG.timeout),
      });

      const latency = Date.now() - start;
      const data = response.ok ? await response.json() : null;

      let schemaValid = true;
      let errorMessage: string | undefined;

      if (schema && data) {
        const validation = schema.safeParse(data);
        schemaValid = validation.success;
        if (!validation.success) {
          errorMessage = `Schema validation failed: ${validation.error.message}`;
        }
      }

      const result: CheckResult = {
        endpoint: path,
        status: response.ok && schemaValid ? 'success' : 'failure',
        latency,
        statusCode: response.status,
        schemaValid,
        errorMessage: errorMessage || (!response.ok ? `HTTP ${response.status}` : undefined),
        timestamp: new Date().toISOString(),
        buildId: process.env.BUILD_ID,
        gitSha: process.env.GIT_SHA,
      };

      this.metrics.push(result);
      return result;

    } catch (error) {
      const latency = Date.now() - start;
      const result: CheckResult = {
        endpoint: path,
        status: 'failure',
        latency,
        statusCode: 0,
        schemaValid: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };

      this.metrics.push(result);
      return result;
    }
  }

  async runHealthChecks(): Promise<CheckResult[]> {
    return Promise.all([
      this.fetch('/health', HealthSchema),
      this.fetch('/api/auth/user'),
      this.fetch('/api/analytics/ttv-dashboard', TtvDashboardSchema),
      this.fetch('/api/dashboard/security', SecurityDashboardSchema),
      this.fetch('/api/dashboard/infrastructure', InfrastructureDashboardSchema),
    ]);
  }

  async runB2CCriticalFlow(): Promise<CheckResult[]> {
    return Promise.all([
      this.fetch('/api/scholarships', z.array(ScholarshipSchema)),
      this.fetch('/api/profile'),
      this.fetch('/api/matches'),
      this.fetch('/api/applications'),
    ]);
  }

  async runProviderReadOnly(): Promise<CheckResult[]> {
    return Promise.all([
      this.fetch('/api/dashboard/stats'),
    ]);
  }

  async runPaymentsSmoke(): Promise<CheckResult[]> {
    return Promise.all([
      this.fetch('/api/billing/summary'),
      this.fetch('/api/billing/usage'),
    ]);
  }

  async runNegativeTests(): Promise<CheckResult[]> {
    // These should fail gracefully, not crash
    const results = await Promise.all([
      this.fetch('/api/profile', undefined).then(r => ({
        ...r,
        status: (r.statusCode === 401 ? 'success' : 'failure') as 'success' | 'failure',
        errorMessage: r.statusCode === 401 ? undefined : 'Expected 401 for unauthed request',
      })),
    ]);
    return results;
  }

  async runFullSuite(): Promise<void> {
    console.log(`[${new Date().toISOString()}] Running synthetic monitor suite...`);

    const results = await Promise.all([
      this.runHealthChecks(),
      this.runB2CCriticalFlow(),
      this.runProviderReadOnly(),
      this.runPaymentsSmoke(),
      this.runNegativeTests(),
    ]);

    const allResults = results.flat();
    const failures = allResults.filter(r => r.status === 'failure');
    
    // Calculate metrics
    const latencies = allResults.filter(r => r.status === 'success').map(r => r.latency);
    const p50 = this.percentile(latencies, 50);
    const p95 = this.percentile(latencies, 95);
    const p99 = this.percentile(latencies, 99);

    console.log(`  ✅ Success: ${allResults.length - failures.length}/${allResults.length}`);
    console.log(`  ⏱️  Latency: P50=${p50}ms, P95=${p95}ms, P99=${p99}ms`);

    if (failures.length > 0) {
      this.failureCount++;
      console.error(`  ❌ Failures (${failures.length}):`);
      failures.forEach(f => {
        console.error(`     ${f.endpoint}: ${f.errorMessage} (${f.statusCode})`);
      });

      // Alert on 3 consecutive failures or >10% failure rate
      const failureRate = failures.length / allResults.length;
      if (this.failureCount >= 3 || failureRate > 0.1) {
        await this.sendAlert({
          severity: 'critical',
          message: `Synthetic monitor: ${failures.length} failures detected`,
          failureRate,
          consecutiveFailures: this.failureCount,
          failures: failures.map(f => `${f.endpoint}: ${f.errorMessage}`),
          metrics: { p50, p95, p99 },
        });
      }
    } else {
      this.failureCount = 0;
    }

    // Emit metrics for observability platform
    this.emitMetrics({
      timestamp: new Date().toISOString(),
      successCount: allResults.length - failures.length,
      failureCount: failures.length,
      latency: { p50, p95, p99 },
      results: allResults,
    });
  }

  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = arr.sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }

  private async sendAlert(alert: any): Promise<void> {
    console.error('[ALERT]', JSON.stringify(alert, null, 2));
    
    if (CONFIG.alerts.webhookUrl) {
      try {
        await fetch(CONFIG.alerts.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: CONFIG.alerts.slackChannel,
            text: `🚨 CANARY ALERT: ${alert.message}`,
            attachments: [{
              color: 'danger',
              fields: [
                { title: 'Failure Rate', value: `${(alert.failureRate * 100).toFixed(1)}%`, short: true },
                { title: 'Consecutive Failures', value: alert.consecutiveFailures, short: true },
                { title: 'P95 Latency', value: `${alert.metrics.p95}ms`, short: true },
                { title: 'P99 Latency', value: `${alert.metrics.p99}ms`, short: true },
              ],
            }],
          }),
        });
      } catch (error) {
        console.error('Failed to send alert:', error);
      }
    }
  }

  private emitMetrics(metrics: any): void {
    // Output metrics in Prometheus/StatsD/CloudWatch format
    console.log('[METRICS]', JSON.stringify(metrics, null, 2));
  }

  async start(): Promise<void> {
    console.log('🚀 Starting ScholarLink Synthetic Monitor');
    console.log(`   Base URL: ${CONFIG.baseUrl}`);
    console.log(`   Check Interval: ${CONFIG.checkInterval}ms`);
    
    // Initial run
    await this.runFullSuite();

    // Schedule periodic runs
    setInterval(() => this.runFullSuite(), CONFIG.checkInterval);
  }
}

// ==================== MAIN ====================

if (require.main === module) {
  const monitor = new SyntheticMonitor();
  monitor.start().catch(console.error);
}

export { SyntheticMonitor, CONFIG };
