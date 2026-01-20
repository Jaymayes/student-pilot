/**
 * Production Metrics Collection - CEO Option B Implementation
 * 
 * Collects quantitative SLO metrics for T+24 and T+48 evidence rollups:
 * - P50/P95/P99 latency distributions
 * - Error rates (errors per minute)
 * - Request volumes (requests per second)
 * - Request_id lineage samples
 * 
 * Targets (cloud-realistic):
 * - General API: ≤150ms P95 latency (warning threshold)
 * - Login (OIDC): ≤300ms P95 (includes network to auth provider + cold start variance)
 * - Health checks: ≤100ms P95 (no DB access)
 */

import type { Request, Response, NextFunction } from 'express';
import { secureLogger } from '../logging/secureLogger';

interface LatencySample {
  timestamp: number;
  path: string;
  method: string;
  duration: number;
  status: number;
  requestId: string;
}

interface ErrorSample {
  timestamp: number;
  path: string;
  method: string;
  status: number;
  requestId: string;
  error?: string;
}

export class ProductionMetricsCollector {
  private latencySamples: LatencySample[] = [];
  private errorSamples: ErrorSample[] = [];
  private requestCounts: Map<string, number> = new Map();
  private startTime: number = Date.now();
  
  // Maximum samples to keep in memory (last 10,000 requests)
  private readonly MAX_SAMPLES = 10000;
  
  /**
   * Express middleware to collect latency and error metrics
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const requestId = (req as any).correlationId || 'unknown';
      const path = req.path;
      const method = req.method;
      
      // Track original res.end to capture response
      const originalEnd = res.end;
      
      res.end = function(this: Response, chunk?: any, encoding?: any, cb?: any) {
        const duration = Date.now() - startTime;
        const status = res.statusCode;
        
        // Collect latency sample
        const sample: LatencySample = {
          timestamp: Date.now(),
          path,
          method,
          duration,
          status,
          requestId
        };
        
        productionMetrics.addLatencySample(sample);
        
        // Collect error sample if status >= 400
        if (status >= 400) {
          const errorSample: ErrorSample = {
            timestamp: Date.now(),
            path,
            method,
            status,
            requestId
          };
          productionMetrics.addErrorSample(errorSample);
        }
        
        // Increment request count
        productionMetrics.incrementRequestCount(`${method}:${path}`);
        
        // Log slow requests (thresholds adjusted for cloud infrastructure)
        // - /api/login: 300ms (OIDC flows include network hops to auth provider + cold start)
        // - /health, /api/health: 150ms (lightweight checks, but can spike on cold start)
        // - General API: 200ms (includes Neon DB RTT + network variance)
        const slowThreshold = path.includes('/api/login') ? 300 
          : (path.includes('/health') ? 150 : 200);
        
        if (duration > slowThreshold) {
          secureLogger.warn('Slow request detected', {
            requestId,
            method,
            path,
            duration,
            threshold: slowThreshold
          });
        }
        
        return originalEnd.call(this, chunk, encoding, cb);
      };
      
      next();
    };
  }
  
  /**
   * Add latency sample to collection
   */
  addLatencySample(sample: LatencySample) {
    this.latencySamples.push(sample);
    
    // Keep only most recent samples
    if (this.latencySamples.length > this.MAX_SAMPLES) {
      this.latencySamples = this.latencySamples.slice(-this.MAX_SAMPLES);
    }
  }
  
  /**
   * Add error sample to collection
   */
  addErrorSample(sample: ErrorSample) {
    this.errorSamples.push(sample);
    
    // Keep only most recent samples
    if (this.errorSamples.length > this.MAX_SAMPLES) {
      this.errorSamples = this.errorSamples.slice(-this.MAX_SAMPLES);
    }
  }
  
  /**
   * Increment request count for endpoint
   */
  incrementRequestCount(endpoint: string) {
    const current = this.requestCounts.get(endpoint) || 0;
    this.requestCounts.set(endpoint, current + 1);
  }
  
  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }
  
  /**
   * Get latency statistics (P50, P95, P99, min, max, mean)
   */
  getLatencyStats(timeWindowMs?: number) {
    const now = Date.now();
    const samples = timeWindowMs
      ? this.latencySamples.filter(s => now - s.timestamp <= timeWindowMs)
      : this.latencySamples;
    
    if (samples.length === 0) {
      return {
        count: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        min: 0,
        max: 0,
        mean: 0
      };
    }
    
    const durations = samples.map(s => s.duration).sort((a, b) => a - b);
    const sum = durations.reduce((acc, d) => acc + d, 0);
    
    return {
      count: samples.length,
      p50: this.calculatePercentile(durations, 50),
      p95: this.calculatePercentile(durations, 95),
      p99: this.calculatePercentile(durations, 99),
      min: durations[0],
      max: durations[durations.length - 1],
      mean: Math.round(sum / durations.length)
    };
  }
  
  /**
   * Get error rate (errors per minute)
   */
  getErrorRate(timeWindowMs: number = 60000) {
    const now = Date.now();
    const recentErrors = this.errorSamples.filter(
      e => now - e.timestamp <= timeWindowMs
    );
    
    const totalRequests = this.latencySamples.filter(
      s => now - s.timestamp <= timeWindowMs
    ).length;
    
    return {
      errorCount: recentErrors.length,
      totalRequests,
      errorRate: totalRequests > 0 
        ? (recentErrors.length / totalRequests) * 100 
        : 0,
      errorsPerMinute: recentErrors.length
    };
  }
  
  /**
   * Get request volume statistics
   */
  getRequestVolume(timeWindowMs: number = 60000) {
    const now = Date.now();
    const recentRequests = this.latencySamples.filter(
      s => now - s.timestamp <= timeWindowMs
    );
    
    const windowSeconds = timeWindowMs / 1000;
    
    return {
      totalRequests: recentRequests.length,
      requestsPerSecond: recentRequests.length / windowSeconds,
      windowMs: timeWindowMs
    };
  }
  
  /**
   * Get request_id lineage samples (for audit trail)
   */
  getRequestIdSamples(limit: number = 10) {
    return this.latencySamples
      .slice(-limit)
      .map(s => ({
        requestId: s.requestId,
        timestamp: new Date(s.timestamp).toISOString(),
        method: s.method,
        path: s.path,
        duration: s.duration,
        status: s.status
      }));
  }
  
  /**
   * Get comprehensive metrics snapshot for evidence report
   */
  getMetricsSnapshot() {
    const uptime = Date.now() - this.startTime;
    const latencyStats = this.getLatencyStats();
    const last24h = this.getLatencyStats(24 * 60 * 60 * 1000);
    const errorRate = this.getErrorRate();
    const requestVolume = this.getRequestVolume();
    
    return {
      timestamp: new Date().toISOString(),
      uptime: {
        milliseconds: uptime,
        hours: (uptime / (1000 * 60 * 60)).toFixed(2)
      },
      latency: {
        overall: latencyStats,
        last24h
      },
      errors: errorRate,
      volume: requestVolume,
      sloCompliance: {
        p95Target: 120,
        p95Actual: latencyStats.p95,
        p95Pass: latencyStats.p95 <= 120,
        errorRateTarget: 0.1,
        errorRateActual: errorRate.errorRate,
        errorRatePass: errorRate.errorRate <= 0.1
      },
      requestIdSamples: this.getRequestIdSamples(10)
    };
  }
  
  /**
   * Generate histogram data for charting
   */
  getLatencyHistogram(bucketSize: number = 10) {
    const durations = this.latencySamples.map(s => s.duration);
    const max = Math.max(...durations, 500); // At least 500ms max
    const bucketCount = Math.ceil(max / bucketSize);
    
    const buckets: { range: string; count: number }[] = [];
    
    for (let i = 0; i < bucketCount; i++) {
      const min = i * bucketSize;
      const max = (i + 1) * bucketSize;
      const count = durations.filter(d => d >= min && d < max).length;
      
      buckets.push({
        range: `${min}-${max}ms`,
        count
      });
    }
    
    return buckets;
  }
  
  /**
   * Reset all metrics (for testing or new monitoring period)
   */
  reset() {
    this.latencySamples = [];
    this.errorSamples = [];
    this.requestCounts.clear();
    this.startTime = Date.now();
    
    secureLogger.info('Production metrics collector reset');
  }
  
  /**
   * Get top slow endpoints
   */
  getSlowEndpoints(limit: number = 10) {
    const endpointStats = new Map<string, { count: number; totalDuration: number; maxDuration: number }>();
    
    for (const sample of this.latencySamples) {
      const key = `${sample.method}:${sample.path}`;
      const stats = endpointStats.get(key) || { count: 0, totalDuration: 0, maxDuration: 0 };
      
      stats.count++;
      stats.totalDuration += sample.duration;
      stats.maxDuration = Math.max(stats.maxDuration, sample.duration);
      
      endpointStats.set(key, stats);
    }
    
    return Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        averageDuration: Math.round(stats.totalDuration / stats.count),
        maxDuration: stats.maxDuration,
        count: stats.count
      }))
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, limit);
  }
}

// Singleton instance
export const productionMetrics = new ProductionMetricsCollector();

/**
 * Scheduled metrics reporter (runs every hour in production)
 */
export function startMetricsReporting() {
  // Report metrics every hour
  setInterval(() => {
    const snapshot = productionMetrics.getMetricsSnapshot();
    
    secureLogger.info('Hourly metrics report', {
      uptime: snapshot.uptime,
      p50: snapshot.latency.overall.p50,
      p95: snapshot.latency.overall.p95,
      p99: snapshot.latency.overall.p99,
      errorRate: snapshot.errors.errorRate,
      requestsPerSecond: snapshot.volume.requestsPerSecond,
      sloPass: snapshot.sloCompliance.p95Pass && snapshot.sloCompliance.errorRatePass
    });
    
    // Alert if SLO violated
    if (!snapshot.sloCompliance.p95Pass) {
      secureLogger.error('SLO VIOLATION: P95 latency exceeds 120ms', new Error('SLO_VIOLATION'), {
        p95: snapshot.latency.overall.p95,
        target: 120
      });
    }
    
    if (!snapshot.sloCompliance.errorRatePass) {
      secureLogger.error('SLO VIOLATION: Error rate exceeds 0.1%', new Error('SLO_VIOLATION'), {
        errorRate: snapshot.errors.errorRate,
        target: 0.1
      });
    }
  }, 60 * 60 * 1000); // Every hour
  
  secureLogger.info('Production metrics reporting started (hourly)');
}
