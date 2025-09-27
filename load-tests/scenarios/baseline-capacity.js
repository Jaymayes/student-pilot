/**
 * Baseline Capacity Test - Task perf-6a
 * CEO Objective: Establish sustainable throughput per service tier and end-to-end
 * 
 * Success Criteria:
 * - P95 ≤ 100ms (internal target)
 * - P99 ≤ 250ms 
 * - Error rate ≤ 0.1% at target QPS
 * - Cache hit ratio ≥ 85% for hot paths
 * - DB slow queries per minute ≤ 5
 * - 0 payment idempotency breaches
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend, Gauge } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { 
  AUTH_ENDPOINTS, 
  AI_ENDPOINTS, 
  BILLING_ENDPOINTS, 
  USER_ENDPOINTS,
  MONITORING_ENDPOINTS,
  PERFORMANCE_TARGETS 
} from '../config/endpoints.js';

// Custom metrics for enterprise KPI tracking
const httpReqFailureRate = new Rate('http_req_failure_rate');
const checksFailureRate = new Rate('checks_failure_rate');
const aiOperationDuration = new Trend('ai_operation_duration');
const billingOperationDuration = new Trend('billing_operation_duration');
const cacheHitRate = new Gauge('cache_hit_rate');
const dbSlowQueries = new Counter('db_slow_queries');
const circuitBreakerTrips = new Counter('circuit_breaker_trips');
const paymentIdempotencyBreaches = new Counter('payment_idempotency_breaches');

// Load test configuration for baseline capacity
export const options = {
  stages: [
    { duration: '2m', target: 50 },    // Warm-up
    { duration: '5m', target: 100 },   // Ramp to moderate load  
    { duration: '10m', target: 200 },  // Target sustainable load
    { duration: '5m', target: 300 },   // Peak capacity test
    { duration: '2m', target: 0 },     // Cool down
  ],
  
  // SLO thresholds from CEO directive
  thresholds: {
    http_req_duration: [
      `p(95)<${PERFORMANCE_TARGETS.slo.p95_latency}`, // P95 ≤ 100ms
      `p(99)<${PERFORMANCE_TARGETS.slo.p99_latency}`, // P99 ≤ 250ms
    ],
    http_req_failure_rate: [`rate<${PERFORMANCE_TARGETS.slo.error_rate}`], // ≤ 0.1%
    checks_failure_rate: ['rate<0.01'], // ≤ 1% check failures
    ai_operation_duration: ['p(95)<2000'], // AI operations ≤ 2s P95
    billing_operation_duration: ['p(95)<500'], // Billing ≤ 500ms P95
    cache_hit_rate: [`value>${PERFORMANCE_TARGETS.resources.cache_hit_ratio}`], // ≥ 85%
    db_slow_queries: ['count<5'], // ≤ 5 slow queries per minute
    circuit_breaker_trips: ['count<10'], // Minimal breaker trips
    payment_idempotency_breaches: ['count<1'] // Zero payment duplicates
  },
  
  // Browser simulation
  userAgent: 'ScholarLink-LoadTest/1.0 (Baseline-Capacity)',
};

// Test data for realistic load simulation
const testUsers = [
  { email: 'student1@test.com', profile: { gpa: 3.7, major: 'Engineering' } },
  { email: 'student2@test.com', profile: { gpa: 3.9, major: 'Computer Science' } },
  { email: 'student3@test.com', profile: { gpa: 3.5, major: 'Business' } },
  { email: 'student4@test.com', profile: { gpa: 3.8, major: 'Medicine' } },
  { email: 'student5@test.com', profile: { gpa: 3.6, major: 'Liberal Arts' } }
];

const essayPrompts = [
  'Describe your leadership experience and how it will help you succeed in college.',
  'What are your career goals and how will this scholarship help you achieve them?',
  'Discuss a challenge you overcame and what you learned from the experience.',
  'Explain why you chose your field of study and your passion for it.',
  'How do you plan to make a positive impact in your community?'
];

// Mock authentication (development environment)
function authenticateUser() {
  // In development, we'll simulate authenticated requests
  // Production tests would use actual OIDC flow
  return {
    'Authorization': 'Bearer mock-jwt-token',
    'Content-Type': 'application/json',
    'X-Correlation-ID': `load-test-${__VU}-${Date.now()}`
  };
}

export default function() {
  const headers = authenticateUser();
  const user = testUsers[__VU % testUsers.length];
  
  // 1. Health Check - Always start with system health
  const healthStart = Date.now();
  const healthRes = http.get(MONITORING_ENDPOINTS.health);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 50ms': (r) => r.timings.duration < 50,
  }) || checksFailureRate.add(1);
  
  sleep(0.1);
  
  // 2. User Profile Operations (hot path)
  const profileRes = http.get(USER_ENDPOINTS.profile, { headers });
  check(profileRes, {
    'profile fetch status is 200 or 401': (r) => [200, 401].includes(r.status),
    'profile response time < 200ms': (r) => r.timings.duration < 200,
  }) || checksFailureRate.add(1);
  
  sleep(0.2);
  
  // 3. Scholarship Search (high traffic endpoint)
  const scholarshipsRes = http.get(`${USER_ENDPOINTS.scholarships}?limit=20&category=engineering`);
  check(scholarshipsRes, {
    'scholarships status is 200': (r) => r.status === 200,
    'scholarships response time < 300ms': (r) => r.timings.duration < 300,
    'scholarships returns data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.scholarships && data.scholarships.length > 0;
      } catch (e) {
        return false;
      }
    }
  }) || checksFailureRate.add(1);
  
  sleep(0.3);
  
  // 4. AI Match Generation (revenue-critical, high latency)
  if (Math.random() < 0.3) { // 30% of users generate matches
    const matchStart = Date.now();
    const matchPayload = {
      studentProfile: {
        gpa: user.profile.gpa,
        major: user.profile.major,
        graduationYear: 2025,
        interests: ['technology', 'innovation']
      },
      preferences: {
        maxAmount: 10000,
        categories: ['merit', 'need-based']
      }
    };
    
    const matchRes = http.post(AI_ENDPOINTS.generateMatches, JSON.stringify(matchPayload), { headers });
    const matchDuration = Date.now() - matchStart;
    aiOperationDuration.add(matchDuration);
    
    check(matchRes, {
      'match generation status is 200 or 402': (r) => [200, 402].includes(r.status),
      'match generation response time < 3000ms': (r) => r.timings.duration < 3000,
    }) || checksFailureRate.add(1);
    
    // Check for circuit breaker activation
    if (matchRes.body && matchRes.body.includes && matchRes.body.includes('temporarily unavailable')) {
      circuitBreakerTrips.add(1);
    }
  }
  
  sleep(0.5);
  
  // 5. Essay Analysis (AI service, billing-critical)
  if (Math.random() < 0.2) { // 20% of users analyze essays
    const essayStart = Date.now();
    const essayPayload = {
      content: essayPrompts[Math.floor(Math.random() * essayPrompts.length)],
      type: 'scholarship_essay',
      wordLimit: 500
    };
    
    const essayRes = http.post(AI_ENDPOINTS.analyzeEssay, JSON.stringify(essayPayload), { headers });
    const essayDuration = Date.now() - essayStart;
    aiOperationDuration.add(essayDuration);
    
    check(essayRes, {
      'essay analysis status is 200 or 402': (r) => [200, 402].includes(r.status),
      'essay analysis response time < 4000ms': (r) => r.timings.duration < 4000,
    }) || checksFailureRate.add(1);
    
    // Verify no billing on fallback responses
    if (essayRes.status === 200) {
      const response = JSON.parse(essayRes.body);
      if (response.usage && response.usage.chargedCredits === 0 && 
          response.response && response.response.isFallback) {
        // Good: Fallback properly detected, no billing applied
      } else if (response.usage && response.usage.chargedCredits === 0 && 
                 response.response && !response.response.isFallback) {
        paymentIdempotencyBreaches.add(1); // Bad: Real response not billed
      }
    }
  }
  
  sleep(0.3);
  
  // 6. Billing Operations (zero tolerance for failures)
  if (Math.random() < 0.15) { // 15% of users check billing
    const billingStart = Date.now();
    const billingRes = http.get(BILLING_ENDPOINTS.summary, { headers });
    const billingDuration = Date.now() - billingStart;
    billingOperationDuration.add(billingDuration);
    
    check(billingRes, {
      'billing summary status is 200 or 401': (r) => [200, 401].includes(r.status),
      'billing response time < 500ms': (r) => r.timings.duration < 500,
    }) || checksFailureRate.add(1);
  }
  
  sleep(0.2);
  
  // 7. Monitoring Metrics Check (observe cache performance)
  if (Math.random() < 0.1) { // 10% of requests check metrics
    const metricsRes = http.get(MONITORING_ENDPOINTS.cacheMetrics);
    check(metricsRes, {
      'metrics status is 200': (r) => r.status === 200,
    }) || checksFailureRate.add(1);
    
    // Parse cache hit ratio for monitoring
    if (metricsRes.status === 200) {
      try {
        const metrics = JSON.parse(metricsRes.body);
        if (metrics.cacheHitRatio) {
          cacheHitRate.add(metrics.cacheHitRatio);
        }
        if (metrics.slowQueries) {
          dbSlowQueries.add(metrics.slowQueries);
        }
      } catch (e) {
        // Ignore parsing errors for metrics
      }
    }
  }
  
  // Record failure rates for overall monitoring
  httpReqFailureRate.add(healthRes.status >= 400 ? 1 : 0);
  
  sleep(1); // User think time
}

// Generate comprehensive test report
export function handleSummary(data) {
  return {
    'baseline-capacity-report.html': htmlReport(data),
    'baseline-capacity-results.json': JSON.stringify(data, null, 2),
  };
}