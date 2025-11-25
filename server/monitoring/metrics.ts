/**
 * Enterprise Performance Metrics Collection - Task perf-4
 * 
 * Implements comprehensive runtime metrics for production monitoring:
 * - Response time histograms (P50, P95, P99)
 * - Cache hit/miss rates and eviction tracking
 * - Database query performance metrics
 * - AI operation cost and latency tracking
 * - Error rate monitoring by endpoint
 * - Memory and resource utilization
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import type { Request, Response } from 'express';

interface MetricSample {
  timestamp: number;
  value: number;
  labels?: Record<string, string>;
}

interface HistogramBucket {
  upperBound: number;
  count: number;
}

interface PerformanceMetrics {
  // Response time metrics
  httpRequestDuration: Map<string, MetricSample[]>;
  httpRequestTotal: Map<string, number>;
  httpRequestErrors: Map<string, number>;
  
  // Cache metrics
  cacheHits: number;
  cacheMisses: number;
  cacheEvictions: number;
  cacheSize: number;
  
  // Database metrics
  dbQueryDuration: MetricSample[];
  dbConnectionsActive: number;
  dbQueryErrors: number;
  
  // AI operation metrics
  aiOperationDuration: MetricSample[];
  aiOperationCost: MetricSample[];
  aiOperationErrors: number;
  
  // Resource metrics
  memoryUsage: MetricSample[];
  cpuUsage: MetricSample[];
}

class MetricsCollector extends EventEmitter {
  private metrics: PerformanceMetrics;
  private readonly maxSampleRetention = 1000; // Keep last 1000 samples
  private readonly sampleRetentionMs = 5 * 60 * 1000; // 5 minutes
  
  // AGENT3 v3.0: Business-specific counters for student_pilot
  private businessMetrics = {
    purchasesSuccess: 0,
    purchasesFailure: 0,
    webhooksSuccess: 0,
    webhooksFailure: 0,
    grantsSuccess: 0,
    grantsFailure: 0,
  };
  
  constructor() {
    super();
    this.metrics = {
      httpRequestDuration: new Map(),
      httpRequestTotal: new Map(),
      httpRequestErrors: new Map(),
      cacheHits: 0,
      cacheMisses: 0,
      cacheEvictions: 0,
      cacheSize: 0,
      dbQueryDuration: [],
      dbConnectionsActive: 0,
      dbQueryErrors: 0,
      aiOperationDuration: [],
      aiOperationCost: [],
      aiOperationErrors: 0,
      memoryUsage: [],
      cpuUsage: []
    };
    
    // Start resource monitoring
    this.startResourceMonitoring();
    
    // Clean up old samples periodically
    setInterval(() => this.cleanupOldSamples(), 60000); // Every minute
  }
  
  /**
   * AGENT3 v3.0: Record purchase attempt
   */
  recordPurchase(success: boolean): void {
    if (success) {
      this.businessMetrics.purchasesSuccess++;
    } else {
      this.businessMetrics.purchasesFailure++;
    }
    this.emit('purchase', { success, timestamp: Date.now() });
  }
  
  /**
   * AGENT3 v3.0: Record webhook processing
   */
  recordWebhook(success: boolean): void {
    if (success) {
      this.businessMetrics.webhooksSuccess++;
    } else {
      this.businessMetrics.webhooksFailure++;
    }
    this.emit('webhook', { success, timestamp: Date.now() });
  }
  
  /**
   * AGENT3 v3.0: Record credit grant
   */
  recordGrant(success: boolean): void {
    if (success) {
      this.businessMetrics.grantsSuccess++;
    } else {
      this.businessMetrics.grantsFailure++;
    }
    this.emit('grant', { success, timestamp: Date.now() });
  }
  
  /**
   * AGENT3 v3.0: Get business metrics for Prometheus
   */
  getBusinessMetrics() {
    return { ...this.businessMetrics };
  }
  
  /**
   * Express middleware for HTTP request metrics with correlation ID
   */
  httpMetricsMiddleware() {
    return (req: Request, res: Response, next: Function) => {
      const startTime = Date.now();
      const route = this.sanitizeRoute(req.path);
      const method = req.method;
      const metricKey = `${method}:${route}`;
      
      // Ensure correlation ID is set for request traceability
      const correlationId = req.headers['x-correlation-id'] as string || 
        req.get('x-correlation-id') || 
        crypto.randomUUID();
      
      if (!req.headers['x-correlation-id']) {
        req.headers['x-correlation-id'] = correlationId;
        res.setHeader('X-Correlation-ID', correlationId);
      }
      
      // Track request count
      this.metrics.httpRequestTotal.set(
        metricKey, 
        (this.metrics.httpRequestTotal.get(metricKey) || 0) + 1
      );
      
      // Capture response metrics on finish
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const statusClass = Math.floor(res.statusCode / 100);
        
        // Record response time
        this.recordResponseTime(metricKey, duration, {
          method,
          route,
          status: res.statusCode.toString(),
          statusClass: `${statusClass}xx`
        });
        
        // Track errors (4xx and 5xx)
        if (statusClass >= 4) {
          this.metrics.httpRequestErrors.set(
            metricKey,
            (this.metrics.httpRequestErrors.get(metricKey) || 0) + 1
          );
        }
        
        // Emit high-latency alerts
        if (duration > 1000) { // > 1 second
          this.emit('high-latency', {
            route: metricKey,
            duration,
            threshold: 1000
          });
        }
        
        // Emit error rate alerts
        const totalRequests = this.metrics.httpRequestTotal.get(metricKey) || 0;
        const errorRequests = this.metrics.httpRequestErrors.get(metricKey) || 0;
        const errorRate = errorRequests / totalRequests;
        
        if (errorRate > 0.05 && totalRequests > 10) { // > 5% error rate
          this.emit('high-error-rate', {
            route: metricKey,
            errorRate: errorRate * 100,
            totalRequests,
            errorRequests
          });
        }
      });
      
      next();
    };
  }
  
  /**
   * Record cache operation metrics
   */
  recordCacheHit(key: string): void {
    this.metrics.cacheHits++;
    this.emit('cache-hit', { key, timestamp: Date.now() });
  }
  
  recordCacheMiss(key: string): void {
    this.metrics.cacheMisses++;
    this.emit('cache-miss', { key, timestamp: Date.now() });
  }
  
  recordCacheEviction(count: number): void {
    this.metrics.cacheEvictions += count;
    this.emit('cache-eviction', { count, timestamp: Date.now() });
  }
  
  updateCacheSize(size: number): void {
    this.metrics.cacheSize = size;
  }
  
  /**
   * Record database operation metrics
   */
  recordDbQuery(duration: number, operation: string, success: boolean): void {
    this.metrics.dbQueryDuration.push({
      timestamp: Date.now(),
      value: duration,
      labels: { operation, success: success.toString() }
    });
    
    if (!success) {
      this.metrics.dbQueryErrors++;
    }
    
    // Alert on slow queries
    if (duration > 500) { // > 500ms
      this.emit('slow-query', {
        operation,
        duration,
        threshold: 500
      });
    }
  }
  
  updateDbConnections(activeCount: number): void {
    this.metrics.dbConnectionsActive = activeCount;
  }
  
  /**
   * Record AI operation metrics
   */
  recordAiOperation(duration: number, cost: number, operation: string, success: boolean): void {
    this.metrics.aiOperationDuration.push({
      timestamp: Date.now(),
      value: duration,
      labels: { operation, success: success.toString() }
    });
    
    this.metrics.aiOperationCost.push({
      timestamp: Date.now(),
      value: cost,
      labels: { operation }
    });
    
    if (!success) {
      this.metrics.aiOperationErrors++;
    }
    
    // Alert on expensive operations
    if (cost > 100) { // > 100 credits
      this.emit('expensive-ai-operation', {
        operation,
        cost,
        duration
      });
    }
  }
  
  /**
   * Get performance statistics
   */
  getHttpMetrics(): any {
    const now = Date.now();
    const windowMs = 5 * 60 * 1000; // 5 minute window
    
    const stats: any = {};
    
    Array.from(this.metrics.httpRequestDuration.entries()).forEach(([route, samples]) => {
      const recentSamples = samples.filter((s: MetricSample) => now - s.timestamp < windowMs);
      
      if (recentSamples.length > 0) {
        const durations = recentSamples.map((s: MetricSample) => s.value).sort((a: number, b: number) => a - b);
        
        stats[route] = {
          count: recentSamples.length,
          p50: this.percentile(durations, 50),
          p95: this.percentile(durations, 95),
          p99: this.percentile(durations, 99),
          avg: durations.reduce((a: number, b: number) => a + b, 0) / durations.length,
          min: durations[0],
          max: durations[durations.length - 1],
          errorRate: this.getErrorRate(route),
          requestsPerMinute: recentSamples.length / 5
        };
      }
    });
    
    return stats;
  }
  
  getCacheMetrics(): any {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    const hitRate = total > 0 ? (this.metrics.cacheHits / total) * 100 : 0;
    
    return {
      hits: this.metrics.cacheHits,
      misses: this.metrics.cacheMisses,
      hitRate: Math.round(hitRate * 100) / 100,
      evictions: this.metrics.cacheEvictions,
      size: this.metrics.cacheSize,
      efficiency: hitRate > 80 ? 'excellent' : hitRate > 60 ? 'good' : 'needs-improvement'
    };
  }
  
  getDbMetrics(): any {
    const now = Date.now();
    const windowMs = 5 * 60 * 1000;
    const recentQueries = this.metrics.dbQueryDuration.filter(s => now - s.timestamp < windowMs);
    
    if (recentQueries.length === 0) {
      return { activeConnections: this.metrics.dbConnectionsActive, recentActivity: false };
    }
    
    const durations = recentQueries.map(s => s.value).sort((a, b) => a - b);
    
    return {
      activeConnections: this.metrics.dbConnectionsActive,
      recentQueries: recentQueries.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      p95Duration: this.percentile(durations, 95),
      errors: this.metrics.dbQueryErrors,
      queriesPerMinute: recentQueries.length / 5,
      health: durations.length > 0 && this.percentile(durations, 95) < 100 ? 'healthy' : 'degraded'
    };
  }
  
  getAiMetrics(): any {
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour window for AI operations
    const recentOps = this.metrics.aiOperationDuration.filter(s => now - s.timestamp < windowMs);
    const recentCosts = this.metrics.aiOperationCost.filter(s => now - s.timestamp < windowMs);
    
    if (recentOps.length === 0) {
      return { operations: 0, totalCost: 0 };
    }
    
    const durations = recentOps.map(s => s.value);
    const costs = recentCosts.map(s => s.value);
    
    return {
      operations: recentOps.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      totalCost: costs.reduce((a, b) => a + b, 0),
      avgCost: costs.reduce((a, b) => a + b, 0) / costs.length,
      errors: this.metrics.aiOperationErrors,
      costEfficiency: costs.length > 0 && costs.reduce((a, b) => a + b, 0) / costs.length < 50 ? 'efficient' : 'expensive'
    };
  }
  
  getResourceMetrics(): any {
    const now = Date.now();
    const windowMs = 5 * 60 * 1000;
    const recentMemory = this.metrics.memoryUsage.filter(s => now - s.timestamp < windowMs);
    const recentCpu = this.metrics.cpuUsage.filter(s => now - s.timestamp < windowMs);
    
    const currentMemory = process.memoryUsage();
    const currentCpu = process.cpuUsage();
    
    return {
      memory: {
        current: Math.round(currentMemory.heapUsed / 1024 / 1024 * 100) / 100, // MB
        total: Math.round(currentMemory.heapTotal / 1024 / 1024 * 100) / 100, // MB
        external: Math.round(currentMemory.external / 1024 / 1024 * 100) / 100, // MB
        trend: recentMemory.length > 1 ? this.getTrend(recentMemory) : 'stable'
      },
      cpu: {
        user: Math.round(currentCpu.user / 1000), // Convert microseconds to milliseconds
        system: Math.round(currentCpu.system / 1000),
        usage: recentCpu.length > 0 ? 
          Math.round(recentCpu[recentCpu.length - 1].value * 100) / 100 : 0, // CPU percentage
        trend: recentCpu.length > 1 ? this.getTrend(recentCpu) : 'stable'
      },
      uptime: Math.round(process.uptime()),
      nodeVersion: process.version
    };
  }
  
  /**
   * Prometheus-compatible metrics endpoint
   */
  getPrometheusMetrics(): string {
    const httpStats = this.getHttpMetrics();
    const cacheStats = this.getCacheMetrics();
    const dbStats = this.getDbMetrics();
    const aiStats = this.getAiMetrics();
    const resourceStats = this.getResourceMetrics();
    
    const metrics: string[] = [];
    
    // AGENT3 Global Identity Standard: app_info metric MUST be first
    const appName = process.env.APP_NAME || 'student_pilot';
    const appBaseUrl = process.env.APP_BASE_URL || 'https://student-pilot-jamarrlmayes.replit.app';
    const appVersion = process.env.BUILD_ID || process.env.GIT_SHA || 'dev';
    
    metrics.push('# HELP app_info Application metadata (AGENT3 required)');
    metrics.push('# TYPE app_info gauge');
    metrics.push(`app_info{app_id="${appName}",base_url="${appBaseUrl}",version="${appVersion}"} 1`);
    metrics.push(''); // Blank line for readability
    
    // HTTP request duration summary (corrected from incorrect histogram)
    metrics.push('# HELP http_request_duration_seconds HTTP request latency summary');
    metrics.push('# TYPE http_request_duration_seconds summary');
    
    for (const [route, stats] of Object.entries(httpStats)) {
      const sanitizedRoute = route.replace(/[^a-zA-Z0-9_:]/g, '_');
      metrics.push(`http_request_duration_seconds{route="${route}",quantile="0.5"} ${(stats as any).p50 / 1000}`);
      metrics.push(`http_request_duration_seconds{route="${route}",quantile="0.95"} ${(stats as any).p95 / 1000}`);
      metrics.push(`http_request_duration_seconds{route="${route}",quantile="0.99"} ${(stats as any).p99 / 1000}`);
      metrics.push(`http_request_duration_seconds_count{route="${route}"} ${(stats as any).count}`);
      metrics.push(`http_request_duration_seconds_sum{route="${route}"} ${((stats as any).avg * (stats as any).count) / 1000}`);
    }
    
    // HTTP request counters by route and status
    metrics.push('# HELP http_requests_total Total HTTP requests by route and status');
    metrics.push('# TYPE http_requests_total counter');
    
    Array.from(this.metrics.httpRequestTotal.entries()).forEach(([route, count]) => {
      const method = route.split(':')[0];
      const path = route.split(':')[1];
      metrics.push(`http_requests_total{method="${method}",route="${path}"} ${count}`);
    });
    
    // HTTP errors counter
    metrics.push('# HELP http_request_errors_total Total HTTP request errors');
    metrics.push('# TYPE http_request_errors_total counter');
    
    Array.from(this.metrics.httpRequestErrors.entries()).forEach(([route, count]) => {
      const method = route.split(':')[0];
      const path = route.split(':')[1];
      metrics.push(`http_request_errors_total{method="${method}",route="${path}"} ${count}`);
    });
    
    // Cache metrics
    metrics.push('# HELP cache_hits_total Total cache hits');
    metrics.push('# TYPE cache_hits_total counter');
    metrics.push(`cache_hits_total ${cacheStats.hits}`);
    
    metrics.push('# HELP cache_misses_total Total cache misses');
    metrics.push('# TYPE cache_misses_total counter');
    metrics.push(`cache_misses_total ${cacheStats.misses}`);
    
    metrics.push('# HELP cache_evictions_total Total cache evictions');
    metrics.push('# TYPE cache_evictions_total counter');
    metrics.push(`cache_evictions_total ${cacheStats.evictions}`);
    
    metrics.push('# HELP cache_size_current Current cache size');
    metrics.push('# TYPE cache_size_current gauge');
    metrics.push(`cache_size_current ${cacheStats.size}`);
    
    // Database metrics
    metrics.push('# HELP db_connections_active Active database connections');
    metrics.push('# TYPE db_connections_active gauge');
    metrics.push(`db_connections_active ${dbStats.activeConnections}`);
    
    metrics.push('# HELP db_query_errors_total Total database query errors');
    metrics.push('# TYPE db_query_errors_total counter');
    metrics.push(`db_query_errors_total ${dbStats.errors}`);
    
    // AI metrics
    metrics.push('# HELP ai_operations_total Total AI operations');
    metrics.push('# TYPE ai_operations_total counter');
    metrics.push(`ai_operations_total ${aiStats.operations}`);
    
    metrics.push('# HELP ai_cost_credits_total Total AI operation cost in credits');
    metrics.push('# TYPE ai_cost_credits_total counter');
    metrics.push(`ai_cost_credits_total ${aiStats.totalCost}`);
    
    metrics.push('# HELP ai_operation_errors_total Total AI operation errors');
    metrics.push('# TYPE ai_operation_errors_total counter');
    metrics.push(`ai_operation_errors_total ${aiStats.errors}`);
    
    // Resource metrics
    metrics.push('# HELP memory_usage_bytes Current memory usage in bytes');
    metrics.push('# TYPE memory_usage_bytes gauge');
    metrics.push(`memory_usage_bytes ${resourceStats.memory.current * 1024 * 1024}`);
    
    metrics.push('# HELP process_uptime_seconds Process uptime in seconds');
    metrics.push('# TYPE process_uptime_seconds counter');
    metrics.push(`process_uptime_seconds ${resourceStats.uptime}`);
    
    // CPU metrics
    metrics.push('# HELP process_cpu_user_seconds_total User CPU time spent in seconds');
    metrics.push('# TYPE process_cpu_user_seconds_total counter');
    metrics.push(`process_cpu_user_seconds_total ${resourceStats.cpu.user / 1000}`);
    
    metrics.push('# HELP process_cpu_system_seconds_total System CPU time spent in seconds');
    metrics.push('# TYPE process_cpu_system_seconds_total counter');
    metrics.push(`process_cpu_system_seconds_total ${resourceStats.cpu.system / 1000}`);
    
    metrics.push('# HELP process_cpu_usage_percent Current CPU usage percentage');
    metrics.push('# TYPE process_cpu_usage_percent gauge');
    metrics.push(`process_cpu_usage_percent ${resourceStats.cpu.usage}`);
    
    // AGENT3 v3.0: Business metrics for student_pilot
    metrics.push('');
    metrics.push('# HELP purchases_total Total credit purchase attempts by status');
    metrics.push('# TYPE purchases_total counter');
    metrics.push(`purchases_total{status="success"} ${this.businessMetrics.purchasesSuccess}`);
    metrics.push(`purchases_total{status="failure"} ${this.businessMetrics.purchasesFailure}`);
    
    metrics.push('# HELP webhooks_total Total webhook processing by status');
    metrics.push('# TYPE webhooks_total counter');
    metrics.push(`webhooks_total{status="success"} ${this.businessMetrics.webhooksSuccess}`);
    metrics.push(`webhooks_total{status="failure"} ${this.businessMetrics.webhooksFailure}`);
    
    metrics.push('# HELP grants_total Total credit grants by status');
    metrics.push('# TYPE grants_total counter');
    metrics.push(`grants_total{status="success"} ${this.businessMetrics.grantsSuccess}`);
    metrics.push(`grants_total{status="failure"} ${this.businessMetrics.grantsFailure}`);
    
    return metrics.join('\n');
  }
  
  // Helper methods
  private recordResponseTime(route: string, duration: number, labels: Record<string, string>): void {
    if (!this.metrics.httpRequestDuration.has(route)) {
      this.metrics.httpRequestDuration.set(route, []);
    }
    
    const samples = this.metrics.httpRequestDuration.get(route)!;
    samples.push({
      timestamp: Date.now(),
      value: duration,
      labels
    });
    
    // Keep only recent samples
    if (samples.length > this.maxSampleRetention) {
      samples.splice(0, samples.length - this.maxSampleRetention);
    }
  }
  
  private sanitizeRoute(path: string): string {
    // Replace IDs and dynamic segments with placeholders
    return path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+/g, '/:id')
      .replace(/\?.*$/, ''); // Remove query params
  }
  
  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const index = Math.ceil((p / 100) * values.length) - 1;
    return values[Math.max(0, Math.min(index, values.length - 1))];
  }
  
  private getErrorRate(route: string): number {
    const total = this.metrics.httpRequestTotal.get(route) || 0;
    const errors = this.metrics.httpRequestErrors.get(route) || 0;
    return total > 0 ? (errors / total) * 100 : 0;
  }
  
  private getTrend(samples: MetricSample[]): 'increasing' | 'decreasing' | 'stable' {
    if (samples.length < 2) return 'stable';
    
    const recent = samples.slice(-5); // Last 5 samples
    const first = recent[0].value;
    const last = recent[recent.length - 1].value;
    const change = (last - first) / first;
    
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }
  
  private startResourceMonitoring(): void {
    setInterval(() => {
      const usage = process.memoryUsage();
      
      this.metrics.memoryUsage.push({
        timestamp: Date.now(),
        value: usage.heapUsed
      });
      
      // Clean up old memory samples
      const cutoff = Date.now() - this.sampleRetentionMs;
      this.metrics.memoryUsage = this.metrics.memoryUsage.filter(s => s.timestamp > cutoff);
      
      // Emit memory alerts
      const memoryMB = usage.heapUsed / 1024 / 1024;
      if (memoryMB > 512) { // > 512MB
        this.emit('high-memory-usage', {
          usage: memoryMB,
          threshold: 512
        });
      }
    }, 30000); // Every 30 seconds
  }
  
  private cleanupOldSamples(): void {
    const cutoff = Date.now() - this.sampleRetentionMs;
    
    // Clean HTTP duration samples
    Array.from(this.metrics.httpRequestDuration.entries()).forEach(([route, samples]) => {
      this.metrics.httpRequestDuration.set(
        route,
        samples.filter((s: MetricSample) => s.timestamp > cutoff)
      );
    });
    
    // Clean database samples
    this.metrics.dbQueryDuration = this.metrics.dbQueryDuration.filter((s: MetricSample) => s.timestamp > cutoff);
    
    // Clean AI operation samples
    this.metrics.aiOperationDuration = this.metrics.aiOperationDuration.filter((s: MetricSample) => s.timestamp > cutoff);
    this.metrics.aiOperationCost = this.metrics.aiOperationCost.filter((s: MetricSample) => s.timestamp > cutoff);
  }

  /**
   * Record external API call metrics for circuit breaker monitoring
   */
  recordExternalApiCall(serviceName: string, duration: number, success: boolean): void {
    const timestamp = Date.now();
    const metricKey = `external_api_${serviceName}`;
    
    // Record in request durations for monitoring
    if (!this.metrics.httpRequestDuration.has(metricKey)) {
      this.metrics.httpRequestDuration.set(metricKey, []);
    }
    
    const samples = this.metrics.httpRequestDuration.get(metricKey)!;
    samples.push({ timestamp, value: duration });
    
    // Track success/failure counts
    if (success) {
      this.metrics.httpRequestTotal.set(
        metricKey,
        (this.metrics.httpRequestTotal.get(metricKey) || 0) + 1
      );
    } else {
      this.metrics.httpRequestErrors.set(
        metricKey,
        (this.metrics.httpRequestErrors.get(metricKey) || 0) + 1
      );
    }
    
    // Emit events for alerting
    if (duration > 5000) { // 5 second threshold for external APIs
      this.emit('slow-external-api', {
        service: serviceName,
        duration,
        threshold: 5000,
        timestamp
      });
    }
    
    if (!success) {
      this.emit('external-api-error', {
        service: serviceName,
        timestamp
      });
    }
  }
}

// Singleton instance
export const metricsCollector = new MetricsCollector();

// Note: Alerting system moved to ./alerting.ts for proper server initialization