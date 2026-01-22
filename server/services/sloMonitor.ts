/**
 * SLO Monitor with Per-Endpoint Telemetry
 * 
 * Implements:
 * - Per-endpoint p50/p75/p95/p99/p999 tracking
 * - Slow-log sampling with request context
 * - SLO burn alerts
 * - Latency histograms
 */

interface LatencyRecord {
  route: string;
  latencyMs: number;
  timestamp: number;
  context: {
    dbWaitMs?: number;
    gcTimeMs?: number;
    coldStart?: boolean;
    requestId?: string;
  };
}

interface EndpointStats {
  route: string;
  samples: number;
  percentiles: {
    p50: number;
    p75: number;
    p95: number;
    p99: number;
    p999: number;
  };
  histogram: Map<string, number>;
  slowLogs: LatencyRecord[];
}

interface SloBurnAlert {
  type: 'p95_burn' | 'p99_burn';
  route: string;
  threshold: number;
  actual: number;
  duration: number;
  timestamp: number;
}

class SloMonitor {
  private records: Map<string, LatencyRecord[]> = new Map();
  private alerts: SloBurnAlert[] = [];
  private slowLogThresholdMs = 200;
  private maxSlowLogs = 50;
  private windowMs = 300000; // 5 minute window
  
  // SLO targets
  private readonly p95Target = 120;
  private readonly p99Target = 200;
  private readonly p95BurnThresholdMinutes = 15;
  private readonly p99BurnThresholdMinutes = 5;

  /**
   * Record a latency measurement
   */
  record(route: string, latencyMs: number, context: LatencyRecord['context'] = {}): void {
    const record: LatencyRecord = {
      route,
      latencyMs,
      timestamp: Date.now(),
      context
    };

    if (!this.records.has(route)) {
      this.records.set(route, []);
    }
    
    const routeRecords = this.records.get(route)!;
    routeRecords.push(record);
    
    // Keep only records within window
    const cutoff = Date.now() - this.windowMs;
    this.records.set(route, routeRecords.filter(r => r.timestamp > cutoff));

    // Check for SLO burns
    this.checkSloBurn(route);
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sorted: number[], p: number): number {
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)] || 0;
  }

  /**
   * Get stats for a specific endpoint
   */
  getEndpointStats(route: string): EndpointStats | null {
    const records = this.records.get(route);
    if (!records || records.length === 0) return null;

    const latencies = records.map(r => r.latencyMs).sort((a, b) => a - b);
    
    // Build histogram buckets
    const histogram = new Map<string, number>();
    const buckets = [50, 100, 150, 200, 300, 500, 1000, 2000];
    buckets.forEach(bucket => histogram.set(`<${bucket}ms`, 0));
    histogram.set('>2000ms', 0);

    latencies.forEach(l => {
      for (const bucket of buckets) {
        if (l < bucket) {
          histogram.set(`<${bucket}ms`, (histogram.get(`<${bucket}ms`) || 0) + 1);
          return;
        }
      }
      histogram.set('>2000ms', (histogram.get('>2000ms') || 0) + 1);
    });

    // Get slow logs
    const slowLogs = records
      .filter(r => r.latencyMs > this.slowLogThresholdMs)
      .sort((a, b) => b.latencyMs - a.latencyMs)
      .slice(0, this.maxSlowLogs);

    return {
      route,
      samples: records.length,
      percentiles: {
        p50: this.percentile(latencies, 50),
        p75: this.percentile(latencies, 75),
        p95: this.percentile(latencies, 95),
        p99: this.percentile(latencies, 99),
        p999: this.percentile(latencies, 99.9)
      },
      histogram,
      slowLogs
    };
  }

  /**
   * Get heatmap for all endpoints
   */
  getHeatmap(): Map<string, EndpointStats['percentiles']> {
    const heatmap = new Map();
    for (const route of this.records.keys()) {
      const stats = this.getEndpointStats(route);
      if (stats) {
        heatmap.set(route, stats.percentiles);
      }
    }
    return heatmap;
  }

  /**
   * Check for SLO burn conditions
   */
  private checkSloBurn(route: string): void {
    const stats = this.getEndpointStats(route);
    if (!stats) return;

    // P95 burn: >120ms for 15 minutes
    if (stats.percentiles.p95 > this.p95Target) {
      const existingAlert = this.alerts.find(
        a => a.type === 'p95_burn' && a.route === route
      );
      
      if (!existingAlert) {
        this.alerts.push({
          type: 'p95_burn',
          route,
          threshold: this.p95Target,
          actual: stats.percentiles.p95,
          duration: 0,
          timestamp: Date.now()
        });
      }
    }

    // P99 burn: >200ms for 5 minutes
    if (stats.percentiles.p99 > this.p99Target) {
      const existingAlert = this.alerts.find(
        a => a.type === 'p99_burn' && a.route === route
      );
      
      if (!existingAlert) {
        this.alerts.push({
          type: 'p99_burn',
          route,
          threshold: this.p99Target,
          actual: stats.percentiles.p99,
          duration: 0,
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * Get active SLO burn alerts
   */
  getActiveAlerts(): SloBurnAlert[] {
    return this.alerts.filter(a => {
      const duration = (Date.now() - a.timestamp) / 60000;
      const threshold = a.type === 'p95_burn' 
        ? this.p95BurnThresholdMinutes 
        : this.p99BurnThresholdMinutes;
      return duration < threshold;
    });
  }

  /**
   * Generate report for snapshot
   */
  generateReport(): string {
    let report = '# Per-Endpoint Latency Heatmap\n\n';
    report += '| Endpoint | p50 | p75 | p95 | p99 | p999 | Samples |\n';
    report += '|----------|-----|-----|-----|-----|------|--------|\n';

    const heatmap = this.getHeatmap();
    for (const [route, percentiles] of heatmap) {
      const stats = this.getEndpointStats(route);
      report += `| ${route} | ${percentiles.p50}ms | ${percentiles.p75}ms | ${percentiles.p95}ms | ${percentiles.p99}ms | ${percentiles.p999}ms | ${stats?.samples || 0} |\n`;
    }

    report += '\n## Slow Log Top Offenders\n\n';
    report += '| Route | Latency | DB Wait | Cold Start | Timestamp |\n';
    report += '|-------|---------|---------|------------|----------|\n';

    const allSlowLogs: LatencyRecord[] = [];
    for (const route of this.records.keys()) {
      const stats = this.getEndpointStats(route);
      if (stats) {
        allSlowLogs.push(...stats.slowLogs);
      }
    }

    allSlowLogs
      .sort((a, b) => b.latencyMs - a.latencyMs)
      .slice(0, 10)
      .forEach(log => {
        report += `| ${log.route} | ${log.latencyMs}ms | ${log.context.dbWaitMs || '-'}ms | ${log.context.coldStart ? 'Yes' : 'No'} | ${new Date(log.timestamp).toISOString()} |\n`;
      });

    const alerts = this.getActiveAlerts();
    if (alerts.length > 0) {
      report += '\n## Active SLO Burn Alerts\n\n';
      alerts.forEach(a => {
        report += `- **${a.type}** on ${a.route}: ${a.actual}ms > ${a.threshold}ms\n`;
      });
    }

    return report;
  }
}

export const sloMonitor = new SloMonitor();
export { SloMonitor, EndpointStats, SloBurnAlert };
