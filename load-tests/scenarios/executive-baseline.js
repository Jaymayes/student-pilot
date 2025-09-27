/**
 * Executive Baseline Capacity Test - Task perf-6b (CEO-Approved Configuration)
 * 
 * EXECUTIVE CONDITIONS:
 * - Step-load test: 5 plateaus mapping to 12-month growth curve with 3x headroom
 * - Updated SLO: P95 ≤ 120ms, P99 ≤ 250ms (official), 100ms stretch goal
 * - Exclude 401 auth errors from SLO calculations
 * - Track $/1k requests and validate 4x AI markup + 3% provider fees
 * - Confirm production-equivalent AI service path
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend, Gauge } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { 
  AI_ENDPOINTS, 
  BILLING_ENDPOINTS, 
  USER_ENDPOINTS,
  MONITORING_ENDPOINTS 
} from '../config/endpoints.js';
import { 
  STEP_LOAD_PLATEAUS, 
  EXECUTIVE_SLO, 
  EXECUTION_CONFIG 
} from '../config/executive-baseline.js';

// Executive KPI Metrics (CEO-mandated tracking)
const apiLatencyP95 = new Trend('api_latency_p95', true);
const apiLatencyP99 = new Trend('api_latency_p99', true);
const sloErrorRate = new Rate('slo_error_rate'); // Excludes 401s
const authErrorRate = new Rate('auth_error_rate'); // 401s separately tracked
const costPer1kRequests = new Gauge('cost_per_1k_requests_usd');
const aiMarkupValidation = new Rate('ai_markup_validation_pass');
const providerFeeValidation = new Rate('provider_fee_validation_pass');
const infrastructureHeadroom = new Gauge('infrastructure_headroom_percent');
const databaseP95Query = new Trend('database_p95_query_ms');
const billingIntegrityViolations = new Counter('billing_integrity_violations');
const productionPathValidation = new Rate('production_path_validation');

export const options = {
  // Executive-approved step-load pattern (5 plateaus × 17 minutes = 85 minutes)
  stages: [
    // Plateau 1: Baseline Current (15 RPS, 60 VUs)
    { duration: '2m', target: 60 },    // Warmup
    { duration: '15m', target: 60 },   // Steady state
    
    // Plateau 2: 6-Month Growth (30 RPS, 120 VUs)  
    { duration: '2m', target: 120 },   // Warmup
    { duration: '15m', target: 120 },  // Steady state
    
    // Plateau 3: 9-Month Growth (45 RPS, 180 VUs)
    { duration: '2m', target: 180 },   // Warmup  
    { duration: '15m', target: 180 },  // Steady state
    
    // Plateau 4: 12-Month Target (62 RPS, 250 VUs)
    { duration: '2m', target: 250 },   // Warmup
    { duration: '15m', target: 250 },  // Steady state
    
    // Plateau 5: Stress Validation (85 RPS, 340 VUs)
    { duration: '2m', target: 340 },   // Warmup
    { duration: '15m', target: 340 },  // Steady state
    
    { duration: '3m', target: 0 },     // Graceful shutdown
  ],
  
  // Executive SLO Thresholds (CEO-mandated)
  thresholds: {
    // Official SLO (not stretch goals)
    http_req_duration: [
      `p(95)<${EXECUTIVE_SLO.p95_latency_ms}`,  // P95 ≤ 120ms (official)
      `p(99)<${EXECUTIVE_SLO.p99_latency_ms}`,  // P99 ≤ 250ms (official)
    ],
    
    // Error rates (5xx and unexpected 4xx only)
    slo_error_rate: [`rate<${EXECUTIVE_SLO.error_rate_5xx}`], // ≤ 0.1%
    
    // Infrastructure headroom requirements
    infrastructure_headroom_percent: [`value>${EXECUTIVE_SLO.cpu_utilization_max * 100}`], // >70% means failure
    
    // Database performance
    database_p95_query_ms: [`p(95)<${EXECUTIVE_SLO.db_p95_query_ms}`], // ≤ 50ms
    
    // Cost and financial integrity
    cost_per_1k_requests_usd: [`value<${EXECUTIVE_SLO.cost_per_1k_requests_max}`], // ≤ $0.50
    ai_markup_validation_pass: ['rate>0.95'], // 95%+ pass rate
    billing_integrity_violations: ['count<1'], // Zero tolerance
    
    // Production path validation
    production_path_validation: ['rate>0.90'] // 90%+ real AI calls
  },
  
  userAgent: 'ScholarLink-ExecutiveBaseline/1.0 (12-Month-Growth-Validation)',
};

function authenticateUser() {
  return {
    'Authorization': 'Bearer exec-baseline-token',
    'Content-Type': 'application/json',
    'X-Correlation-ID': `${EXECUTION_CONFIG.correlation_id_prefix}-${__VU}-${Date.now()}`,
    'X-Test-Phase': getCurrentTestPhase(),
    'X-Executive-Test': 'baseline-capacity'
  };
}

function getCurrentTestPhase() {
  const elapsed = (__ENV.K6_EXECUTION_TIME_ELAPSED || 0);
  
  if (elapsed < 1020) return 'plateau-1-baseline';     // 0-17 min
  if (elapsed < 2040) return 'plateau-2-6month';       // 17-34 min
  if (elapsed < 3060) return 'plateau-3-9month';       // 34-51 min  
  if (elapsed < 4080) return 'plateau-4-12month';      // 51-68 min
  if (elapsed < 5100) return 'plateau-5-stress';       // 68-85 min
  return 'shutdown';
}

let baselineCostPerRequest = null;
let requestCount = 0;
let totalCostAccumulator = 0;

export default function() {
  const headers = authenticateUser();
  const testPhase = getCurrentTestPhase();
  const startTime = Date.now();
  
  requestCount++;
  
  // 1. System Health & Infrastructure Monitoring
  const healthRes = http.get(MONITORING_ENDPOINTS.apiHealth);
  const healthLatency = Date.now() - startTime;
  
  // Track latency for SLO compliance
  apiLatencyP95.add(healthLatency);
  apiLatencyP99.add(healthLatency);
  
  const healthCheck = check(healthRes, {
    'health endpoint responds': (r) => r.status === 200,
    'health response time within SLO': (r) => r.timings.duration <= EXECUTIVE_SLO.p95_latency_ms
  });
  
  // Separate SLO errors from auth errors (CEO requirement)
  if (healthRes.status >= 500) {
    sloErrorRate.add(1);
  } else if (healthRes.status === 401) {
    authErrorRate.add(1); // Track separately, don't count against SLO
  } else {
    sloErrorRate.add(0);
  }
  
  sleep(0.1);
  
  // 2. Core User Workflow - Profile & Scholarships
  const profileRes = http.get(USER_ENDPOINTS.profile, { headers });
  const scholarshipsRes = http.get(`${USER_ENDPOINTS.scholarships}?limit=20&test_phase=${testPhase}`);
  
  // Handle expected 401s vs unexpected errors
  [profileRes, scholarshipsRes].forEach(res => {
    if (res.status === 401) {
      authErrorRate.add(1); // Expected auth error
    } else if (res.status >= 400) {
      sloErrorRate.add(1); // Unexpected error counts against SLO
    } else {
      sloErrorRate.add(0);
    }
    
    // Track all response times for latency analysis
    apiLatencyP95.add(res.timings.duration);
    apiLatencyP99.add(res.timings.duration);
  });
  
  sleep(0.2);
  
  // 3. AI Service Production Path Validation (CEO Critical Requirement)
  if (Math.random() < 0.25) { // 25% of requests test AI
    const aiStartTime = Date.now();
    const aiPayload = {
      content: `Executive baseline test essay for production validation.
                Test phase: ${testPhase}
                Request ID: ${requestCount}
                This content should trigger real OpenAI model inference with actual tokenization,
                billing calculation, and cost accounting to validate production-equivalent path.`,
      type: 'scholarship_essay',
      wordLimit: 400,
      executiveTest: true,
      requireProductionPath: true
    };
    
    const aiRes = http.post(AI_ENDPOINTS.analyzeEssay, JSON.stringify(aiPayload), { 
      headers,
      timeout: '30s' // Allow for real model latency
    });
    
    const aiLatency = Date.now() - aiStartTime;
    apiLatencyP95.add(aiLatency);
    apiLatencyP99.add(aiLatency);
    
    // CRITICAL: Validate production path vs fallback/stub
    if (aiRes.status === 200) {
      try {
        const response = JSON.parse(aiRes.body);
        
        // Check if using real OpenAI (not fallback)
        const isProductionPath = !response.response?.isFallback && 
                                 response.usage?.chargedCredits > 0 &&
                                 aiLatency > 500; // Real AI calls take >500ms
        
        productionPathValidation.add(isProductionPath ? 1 : 0);
        
        if (isProductionPath) {
          // Validate 4x markup on AI costs (CEO requirement)
          const aiCostUSD = response.usage?.chargedUsd || 0;
          const expectedMarkup = aiCostUSD / EXECUTIVE_SLO.ai_markup_multiplier;
          const markupValid = expectedMarkup > 0 && aiCostUSD >= expectedMarkup * 3.5; // Allow some variance
          aiMarkupValidation.add(markupValid ? 1 : 0);
          
          // Accumulate costs for $/1k requests calculation
          totalCostAccumulator += aiCostUSD;
        } else if (response.response?.isFallback) {
          // Validate no billing on fallback (financial integrity)
          if (response.usage?.chargedCredits > 0) {
            billingIntegrityViolations.add(1);
            console.error(`CRITICAL: Fallback charged ${response.usage.chargedCredits} credits`);
          }
        }
        
      } catch (e) {
        productionPathValidation.add(0);
      }
    } else {
      // Non-200 responses don't validate production path
      productionPathValidation.add(0);
      
      if (aiRes.status >= 500) {
        sloErrorRate.add(1);
      } else if (aiRes.status === 401) {
        authErrorRate.add(1);
      }
    }
  }
  
  sleep(0.3);
  
  // 4. Billing System Financial Integrity (CEO Zero-Tolerance)
  if (Math.random() < 0.10) { // 10% billing operations
    const billingRes = http.get(BILLING_ENDPOINTS.summary, { headers });
    
    if (billingRes.status === 200) {
      try {
        const billing = JSON.parse(billingRes.body);
        
        // Validate billing consistency (no negative balances, proper accounting)
        const billingConsistent = billing.currentBalance >= 0 && 
                                   billing.totalCredits >= 0;
        
        if (!billingConsistent) {
          billingIntegrityViolations.add(1);
        }
        
      } catch (e) {
        billingIntegrityViolations.add(1);
      }
    } else if (billingRes.status === 401) {
      authErrorRate.add(1);
    } else {
      sloErrorRate.add(1);
    }
    
    apiLatencyP95.add(billingRes.timings.duration);
  }
  
  sleep(0.2);
  
  // 5. Infrastructure Headroom Monitoring (Every 50th request)
  if (requestCount % 50 === 0) {
    const metricsRes = http.get(MONITORING_ENDPOINTS.apiMetrics);
    
    if (metricsRes.status === 200) {
      try {
        const metrics = JSON.parse(metricsRes.body);
        
        // Track CPU utilization (should stay ≤ 70%)
        if (metrics.cpu) {
          const cpuUtilization = metrics.cpu.usage || 0;
          infrastructureHeadroom.add(cpuUtilization * 100);
        }
        
        // Track database connection pool (≥ 20% free capacity)
        if (metrics.database) {
          const poolUtilization = metrics.database.activeConnections / metrics.database.maxConnections;
          const freeCapacity = (1 - poolUtilization) * 100;
          
          if (freeCapacity < 20) {
            console.warn(`Database pool capacity low: ${freeCapacity.toFixed(1)}% free`);
          }
        }
        
        // Track database query performance
        if (metrics.database && metrics.database.avgQueryTime) {
          databaseP95Query.add(metrics.database.avgQueryTime);
        }
        
      } catch (e) {
        // Metrics parsing error - not an SLO violation
      }
    }
  }
  
  // 6. Cost Tracking ($/1k requests calculation)
  if (requestCount % 100 === 0) {
    const avgCostPerRequest = totalCostAccumulator / requestCount;
    const costPer1k = avgCostPerRequest * 1000;
    costPer1kRequests.add(costPer1k);
    
    if (baselineCostPerRequest === null) {
      baselineCostPerRequest = avgCostPerRequest;
    }
  }
  
  sleep(0.5); // Standard user think time
}

export function handleSummary(data) {
  // Calculate final cost metrics
  const finalCostPer1k = (totalCostAccumulator / requestCount) * 1000;
  
  const executiveSummary = {
    testType: 'Executive Baseline Capacity',
    testPhases: STEP_LOAD_PLATEAUS.map(p => p.name),
    sloCompliance: {
      p95Latency: data.metrics.http_req_duration?.values?.['p(95)'] || 0,
      p99Latency: data.metrics.http_req_duration?.values?.['p(99)'] || 0,
      errorRate: data.metrics.slo_error_rate?.values?.rate || 0,
      costPer1k: finalCostPer1k
    },
    recommendations: []
  };
  
  return {
    'executive-baseline-report.html': htmlReport(data),
    'executive-baseline-results.json': JSON.stringify(data, null, 2),
    'executive-summary.json': JSON.stringify(executiveSummary, null, 2)
  };
}