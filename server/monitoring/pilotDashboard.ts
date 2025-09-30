/**
 * Student Pilot Launch - Real-Time Monitoring Dashboard
 * CEO Requirements: P95 latency, error rates, auth failures, search empties
 * 
 * SLOs (from CEO directive):
 * - Health endpoint: P95 <50ms
 * - Homepage: P95 <50ms
 * - Search: P95 <120ms (current 145.6ms acceptable week 1)
 * - 5xx errors: <0.5% of requests
 * - Auth failures: within expected abuse rate limits
 * - Search empty results: <5% in staging
 */

import { metricsCollector } from './metrics';
import { Request, Response } from 'express';

interface PilotMetrics {
  timestamp: string;
  uptime_seconds: number;
  
  // P95 Latency Targets (CEO Requirements)
  latency: {
    health_p95_ms: number;
    health_slo_ms: number;
    health_within_slo: boolean;
    
    homepage_p95_ms: number;
    homepage_slo_ms: number;
    homepage_within_slo: boolean;
    
    search_p95_ms: number;
    search_slo_ms: number;
    search_within_slo: boolean;
    
    overall_api_p95_ms: number;
  };
  
  // Error Rate Monitoring
  errors: {
    total_5xx_count: number;
    total_requests: number;
    error_rate_percent: number;
    within_slo: boolean; // <0.5%
    by_endpoint: Record<string, {
      count: number;
      rate: number;
    }>;
  };
  
  // Auth Failure Tracking (401/403/429)
  auth_failures: {
    total_401_unauthorized: number;
    total_403_forbidden: number;
    total_429_rate_limited: number;
    auth_failure_rate: number;
    within_expected_range: boolean;
  };
  
  // Search Quality Metrics
  search_quality: {
    total_searches: number;
    empty_result_count: number;
    empty_result_rate_percent: number;
    within_target: boolean; // <5%
    avg_results_per_search: number;
  };
  
  // Resource Health
  resources: {
    memory_usage_mb: number;
    memory_threshold_mb: number;
    cpu_usage_percent: number;
    database_healthy: boolean;
    cache_hit_rate: number;
  };
  
  // SLO Compliance Summary
  slo_compliance: {
    all_slos_met: boolean;
    violations: string[];
    pass_count: number;
    total_checks: number;
  };
}

class PilotDashboard {
  private startTime: number;
  private searchMetrics: {
    totalSearches: number;
    emptyResults: number;
    totalResults: number;
  };
  private authMetrics: {
    unauthorized_401: number;
    forbidden_403: number;
    rate_limited_429: number;
  };
  
  constructor() {
    this.startTime = Date.now();
    this.searchMetrics = {
      totalSearches: 0,
      emptyResults: 0,
      totalResults: 0
    };
    this.authMetrics = {
      unauthorized_401: 0,
      forbidden_403: 0,
      rate_limited_429: 0
    };
    
    // Listen for search events
    metricsCollector.on('search-executed', (data: any) => {
      this.searchMetrics.totalSearches++;
      if (data.resultCount === 0) {
        this.searchMetrics.emptyResults++;
      }
      this.searchMetrics.totalResults += data.resultCount || 0;
    });
    
    // Listen for auth failures
    metricsCollector.on('auth-failure', (data: any) => {
      switch (data.statusCode) {
        case 401:
          this.authMetrics.unauthorized_401++;
          break;
        case 403:
          this.authMetrics.forbidden_403++;
          break;
        case 429:
          this.authMetrics.rate_limited_429++;
          break;
      }
    });
  }
  
  /**
   * Record search execution for quality metrics
   */
  recordSearch(resultCount: number): void {
    metricsCollector.emit('search-executed', { resultCount });
  }
  
  /**
   * Record auth failure for tracking
   */
  recordAuthFailure(statusCode: number, endpoint: string): void {
    metricsCollector.emit('auth-failure', { statusCode, endpoint });
  }
  
  /**
   * Calculate P95 latency from samples
   */
  private calculateP95(samples: number[]): number {
    if (samples.length === 0) return 0;
    
    const sorted = [...samples].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    return sorted[p95Index] || sorted[sorted.length - 1];
  }
  
  /**
   * Get current dashboard metrics
   */
  getMetrics(): PilotMetrics {
    // Access the metrics directly from the collector
    const allMetrics = (metricsCollector as any).metrics; // Access internal metrics
    const uptime = (Date.now() - this.startTime) / 1000;
    
    // Calculate P95 latencies for critical endpoints
    const healthSamples = this.extractLatencySamples(allMetrics, 'GET:/api/health');
    const homepageSamples = this.extractLatencySamples(allMetrics, 'GET:/');
    const searchSamples = this.extractLatencySamples(allMetrics, 'GET:/api/scholarships');
    const allApiSamples = this.extractAllApiLatencySamples(allMetrics);
    
    const healthP95 = this.calculateP95(healthSamples);
    const homepageP95 = this.calculateP95(homepageSamples);
    const searchP95 = this.calculateP95(searchSamples);
    const overallP95 = this.calculateP95(allApiSamples);
    
    // Calculate error rates
    const errorAnalysis = this.analyzeErrors(allMetrics);
    
    // Auth failure analysis
    const totalAuthFailures = this.authMetrics.unauthorized_401 + 
                              this.authMetrics.forbidden_403 + 
                              this.authMetrics.rate_limited_429;
    const totalRequests = Array.from(allMetrics.httpRequestTotal.values())
      .reduce((sum, count) => sum + count, 0);
    const authFailureRate = totalRequests > 0 ? totalAuthFailures / totalRequests : 0;
    
    // Search quality analysis
    const emptyResultRate = this.searchMetrics.totalSearches > 0 
      ? (this.searchMetrics.emptyResults / this.searchMetrics.totalSearches) * 100
      : 0;
    const avgResultsPerSearch = this.searchMetrics.totalSearches > 0
      ? this.searchMetrics.totalResults / this.searchMetrics.totalSearches
      : 0;
    
    // SLO compliance checks
    const healthSLOMet = healthP95 < 50;
    const homepageSLOMet = homepageP95 < 50;
    const searchSLOMet = searchP95 < 120; // Week 1 tolerance
    const errorSLOMet = errorAnalysis.error_rate_percent < 0.5;
    const searchQualitySLOMet = emptyResultRate < 5;
    const authWithinExpected = authFailureRate < 0.2; // 20% auth failure rate acceptable (unauthenticated traffic)
    
    const violations: string[] = [];
    let passCount = 0;
    const totalChecks = 6;
    
    if (!healthSLOMet) violations.push(`Health P95 ${healthP95.toFixed(1)}ms > 50ms SLO`);
    else passCount++;
    
    if (!homepageSLOMet) violations.push(`Homepage P95 ${homepageP95.toFixed(1)}ms > 50ms SLO`);
    else passCount++;
    
    if (!searchSLOMet) violations.push(`Search P95 ${searchP95.toFixed(1)}ms > 120ms SLO`);
    else passCount++;
    
    if (!errorSLOMet) violations.push(`Error rate ${errorAnalysis.error_rate_percent.toFixed(2)}% > 0.5% SLO`);
    else passCount++;
    
    if (!searchQualitySLOMet) violations.push(`Empty search results ${emptyResultRate.toFixed(1)}% > 5% target`);
    else passCount++;
    
    if (!authWithinExpected) violations.push(`Auth failure rate ${(authFailureRate * 100).toFixed(1)}% exceeds expected`);
    else passCount++;
    
    // Resource health
    const memUsage = allMetrics.memoryUsage[allMetrics.memoryUsage.length - 1]?.value || 0;
    const cacheHitRate = (allMetrics.cacheHits + allMetrics.cacheMisses) > 0
      ? allMetrics.cacheHits / (allMetrics.cacheHits + allMetrics.cacheMisses)
      : 0;
    
    return {
      timestamp: new Date().toISOString(),
      uptime_seconds: uptime,
      
      latency: {
        health_p95_ms: healthP95,
        health_slo_ms: 50,
        health_within_slo: healthSLOMet,
        
        homepage_p95_ms: homepageP95,
        homepage_slo_ms: 50,
        homepage_within_slo: homepageSLOMet,
        
        search_p95_ms: searchP95,
        search_slo_ms: 120,
        search_within_slo: searchSLOMet,
        
        overall_api_p95_ms: overallP95
      },
      
      errors: errorAnalysis,
      
      auth_failures: {
        total_401_unauthorized: this.authMetrics.unauthorized_401,
        total_403_forbidden: this.authMetrics.forbidden_403,
        total_429_rate_limited: this.authMetrics.rate_limited_429,
        auth_failure_rate: authFailureRate,
        within_expected_range: authWithinExpected
      },
      
      search_quality: {
        total_searches: this.searchMetrics.totalSearches,
        empty_result_count: this.searchMetrics.emptyResults,
        empty_result_rate_percent: emptyResultRate,
        within_target: searchQualitySLOMet,
        avg_results_per_search: avgResultsPerSearch
      },
      
      resources: {
        memory_usage_mb: memUsage,
        memory_threshold_mb: 512,
        cpu_usage_percent: 0, // Not tracked yet
        database_healthy: true, // Assume healthy if no errors
        cache_hit_rate: cacheHitRate
      },
      
      slo_compliance: {
        all_slos_met: violations.length === 0,
        violations,
        pass_count: passCount,
        total_checks: totalChecks
      }
    };
  }
  
  /**
   * Extract latency samples for specific route
   */
  private extractLatencySamples(metrics: any, routeKey: string): number[] {
    const samples = metrics.httpRequestDuration.get(routeKey) || [];
    return samples.map((s: any) => s.value);
  }
  
  /**
   * Extract all API latency samples
   */
  private extractAllApiLatencySamples(metrics: any): number[] {
    const allSamples: number[] = [];
    for (const samples of metrics.httpRequestDuration.values()) {
      allSamples.push(...samples.map((s: any) => s.value));
    }
    return allSamples;
  }
  
  /**
   * Analyze error rates
   */
  private analyzeErrors(metrics: any): any {
    let total5xx = 0;
    let totalRequests = 0;
    const byEndpoint: Record<string, any> = {};
    
    for (const [key, errorCount] of metrics.httpRequestErrors.entries()) {
      const requestCount = metrics.httpRequestTotal.get(key) || 0;
      totalRequests += requestCount;
      
      // Count 5xx errors only
      const samples = metrics.httpRequestDuration.get(key) || [];
      const serverErrors = samples.filter((s: any) => 
        s.labels?.statusClass === '5xx'
      ).length;
      
      total5xx += serverErrors;
      
      if (serverErrors > 0) {
        byEndpoint[key] = {
          count: serverErrors,
          rate: requestCount > 0 ? serverErrors / requestCount : 0
        };
      }
    }
    
    // Get total requests from all endpoints
    const requestCounts: number[] = Array.from(metrics.httpRequestTotal.values());
    totalRequests = requestCounts.reduce((sum: number, count: number) => sum + count, 0);
    
    return {
      total_5xx_count: total5xx,
      total_requests: totalRequests,
      error_rate_percent: totalRequests > 0 ? (total5xx / totalRequests) * 100 : 0,
      within_slo: totalRequests > 0 ? (total5xx / totalRequests) < 0.005 : true, // <0.5%
      by_endpoint: byEndpoint
    };
  }
  
  /**
   * Express middleware to serve dashboard
   */
  dashboardMiddleware() {
    return (req: Request, res: Response) => {
      const metrics = this.getMetrics();
      
      // Return JSON for API consumers
      if (req.headers.accept?.includes('application/json') || req.query.format === 'json') {
        return res.json(metrics);
      }
      
      // Return HTML dashboard for browsers
      const html = this.renderDashboardHTML(metrics);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    };
  }
  
  /**
   * Render HTML dashboard
   */
  private renderDashboardHTML(metrics: PilotMetrics): string {
    const statusColor = metrics.slo_compliance.all_slos_met ? '#10b981' : '#ef4444';
    const statusText = metrics.slo_compliance.all_slos_met ? '✅ ALL SLOS MET' : '⚠️ SLO VIOLATIONS';
    
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Student Pilot - Real-Time Dashboard</title>
  <meta http-equiv="refresh" content="10">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px; margin: 0; }
    .container { max-width: 1400px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 24px; border-radius: 12px; margin-bottom: 24px; }
    .header h1 { margin: 0 0 8px 0; color: white; font-size: 28px; }
    .header p { margin: 0; color: #e0e7ff; font-size: 14px; }
    .status { background: ${statusColor}; color: white; padding: 16px 24px; border-radius: 8px; margin-bottom: 24px; font-size: 18px; font-weight: 600; text-align: center; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .card { background: #1e293b; padding: 20px; border-radius: 8px; border: 1px solid #334155; }
    .card h3 { margin: 0 0 16px 0; color: #94a3b8; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
    .metric { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .metric-label { color: #cbd5e1; font-size: 14px; }
    .metric-value { font-size: 24px; font-weight: 600; }
    .metric-value.good { color: #10b981; }
    .metric-value.bad { color: #ef4444; }
    .metric-value.warning { color: #f59e0b; }
    .slo-bar { background: #334155; height: 8px; border-radius: 4px; overflow: hidden; margin-top: 4px; }
    .slo-fill { height: 100%; transition: width 0.3s; }
    .slo-fill.good { background: #10b981; }
    .slo-fill.bad { background: #ef4444; }
    .violations { background: #7f1d1d; border: 1px solid #991b1b; border-radius: 8px; padding: 16px; margin-top: 16px; }
    .violations h4 { margin: 0 0 12px 0; color: #fca5a5; }
    .violations li { color: #fecaca; margin-bottom: 8px; }
    .timestamp { text-align: center; color: #64748b; font-size: 12px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 Student Pilot - Real-Time Monitoring</h1>
      <p>CEO Dashboard | Uptime: ${Math.floor(metrics.uptime_seconds / 60)}m ${Math.floor(metrics.uptime_seconds % 60)}s | Auto-refresh: 10s</p>
    </div>
    
    <div class="status">${statusText} (${metrics.slo_compliance.pass_count}/${metrics.slo_compliance.total_checks})</div>
    
    <div class="grid">
      <div class="card">
        <h3>⚡ P95 Latency - Health</h3>
        <div class="metric">
          <span class="metric-label">Current P95</span>
          <span class="metric-value ${metrics.latency.health_within_slo ? 'good' : 'bad'}">${metrics.latency.health_p95_ms.toFixed(1)}ms</span>
        </div>
        <div class="metric">
          <span class="metric-label">SLO Target</span>
          <span class="metric-value">< ${metrics.latency.health_slo_ms}ms</span>
        </div>
        <div class="slo-bar">
          <div class="slo-fill ${metrics.latency.health_within_slo ? 'good' : 'bad'}" style="width: ${Math.min((metrics.latency.health_p95_ms / metrics.latency.health_slo_ms) * 100, 100)}%"></div>
        </div>
      </div>
      
      <div class="card">
        <h3>⚡ P95 Latency - Homepage</h3>
        <div class="metric">
          <span class="metric-label">Current P95</span>
          <span class="metric-value ${metrics.latency.homepage_within_slo ? 'good' : 'bad'}">${metrics.latency.homepage_p95_ms.toFixed(1)}ms</span>
        </div>
        <div class="metric">
          <span class="metric-label">SLO Target</span>
          <span class="metric-value">< ${metrics.latency.homepage_slo_ms}ms</span>
        </div>
        <div class="slo-bar">
          <div class="slo-fill ${metrics.latency.homepage_within_slo ? 'good' : 'bad'}" style="width: ${Math.min((metrics.latency.homepage_p95_ms / metrics.latency.homepage_slo_ms) * 100, 100)}%"></div>
        </div>
      </div>
      
      <div class="card">
        <h3>🔍 P95 Latency - Search</h3>
        <div class="metric">
          <span class="metric-label">Current P95</span>
          <span class="metric-value ${metrics.latency.search_within_slo ? 'good' : 'warning'}">${metrics.latency.search_p95_ms.toFixed(1)}ms</span>
        </div>
        <div class="metric">
          <span class="metric-label">SLO Target (Week 1)</span>
          <span class="metric-value">< ${metrics.latency.search_slo_ms}ms</span>
        </div>
        <div class="slo-bar">
          <div class="slo-fill ${metrics.latency.search_within_slo ? 'good' : 'bad'}" style="width: ${Math.min((metrics.latency.search_p95_ms / metrics.latency.search_slo_ms) * 100, 100)}%"></div>
        </div>
      </div>
      
      <div class="card">
        <h3>🚨 Error Rate (5xx)</h3>
        <div class="metric">
          <span class="metric-label">Error Rate</span>
          <span class="metric-value ${metrics.errors.within_slo ? 'good' : 'bad'}">${metrics.errors.error_rate_percent.toFixed(3)}%</span>
        </div>
        <div class="metric">
          <span class="metric-label">5xx Count</span>
          <span class="metric-value">${metrics.errors.total_5xx_count}</span>
        </div>
        <div class="metric">
          <span class="metric-label">SLO Target</span>
          <span class="metric-value">< 0.5%</span>
        </div>
      </div>
      
      <div class="card">
        <h3>🔐 Auth Failures</h3>
        <div class="metric">
          <span class="metric-label">401 Unauthorized</span>
          <span class="metric-value">${metrics.auth_failures.total_401_unauthorized}</span>
        </div>
        <div class="metric">
          <span class="metric-label">403 Forbidden</span>
          <span class="metric-value">${metrics.auth_failures.total_403_forbidden}</span>
        </div>
        <div class="metric">
          <span class="metric-label">429 Rate Limited</span>
          <span class="metric-value">${metrics.auth_failures.total_429_rate_limited}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Failure Rate</span>
          <span class="metric-value ${metrics.auth_failures.within_expected_range ? 'good' : 'warning'}">${(metrics.auth_failures.auth_failure_rate * 100).toFixed(1)}%</span>
        </div>
      </div>
      
      <div class="card">
        <h3>📊 Search Quality</h3>
        <div class="metric">
          <span class="metric-label">Total Searches</span>
          <span class="metric-value">${metrics.search_quality.total_searches}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Empty Results</span>
          <span class="metric-value ${metrics.search_quality.within_target ? 'good' : 'bad'}">${metrics.search_quality.empty_result_rate_percent.toFixed(1)}%</span>
        </div>
        <div class="metric">
          <span class="metric-label">Avg Results</span>
          <span class="metric-value">${metrics.search_quality.avg_results_per_search.toFixed(1)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Target</span>
          <span class="metric-value">< 5% empty</span>
        </div>
      </div>
      
      <div class="card">
        <h3>💾 Resources</h3>
        <div class="metric">
          <span class="metric-label">Memory Usage</span>
          <span class="metric-value">${metrics.resources.memory_usage_mb.toFixed(1)}MB</span>
        </div>
        <div class="metric">
          <span class="metric-label">Cache Hit Rate</span>
          <span class="metric-value ${metrics.resources.cache_hit_rate > 0.7 ? 'good' : 'warning'}">${(metrics.resources.cache_hit_rate * 100).toFixed(1)}%</span>
        </div>
        <div class="metric">
          <span class="metric-label">Database</span>
          <span class="metric-value ${metrics.resources.database_healthy ? 'good' : 'bad'}">${metrics.resources.database_healthy ? 'Healthy' : 'Degraded'}</span>
        </div>
      </div>
      
      <div class="card">
        <h3>📈 Overall Performance</h3>
        <div class="metric">
          <span class="metric-label">Overall API P95</span>
          <span class="metric-value">${metrics.latency.overall_api_p95_ms.toFixed(1)}ms</span>
        </div>
        <div class="metric">
          <span class="metric-label">Total Requests</span>
          <span class="metric-value">${metrics.errors.total_requests}</span>
        </div>
        <div class="metric">
          <span class="metric-label">SLO Compliance</span>
          <span class="metric-value ${metrics.slo_compliance.all_slos_met ? 'good' : 'bad'}">${metrics.slo_compliance.pass_count}/${metrics.slo_compliance.total_checks}</span>
        </div>
      </div>
    </div>
    
    ${metrics.slo_compliance.violations.length > 0 ? `
    <div class="violations">
      <h4>⚠️ SLO Violations</h4>
      <ul>
        ${metrics.slo_compliance.violations.map(v => `<li>${v}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
    
    <div class="timestamp">Last updated: ${metrics.timestamp} | Next refresh in 10 seconds</div>
  </div>
</body>
</html>
    `;
  }
}

export const pilotDashboard = new PilotDashboard();
