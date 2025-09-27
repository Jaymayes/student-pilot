/**
 * Stress-to-Break Test - Task perf-6c  
 * CEO Objective: Determine failure thresholds and verify circuit breakers; no financial leakage
 * 
 * Success Criteria:
 * - Clean circuit breaker behavior under extreme load
 * - System self-recovers within defined timeouts
 * - Zero financial integrity breaches (no double charges)
 * - Graceful degradation without cascading failures
 * - Clear error messaging to users during service degradation
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend, Gauge } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { 
  AI_ENDPOINTS, 
  BILLING_ENDPOINTS, 
  MONITORING_ENDPOINTS,
  USER_ENDPOINTS,
  PERFORMANCE_TARGETS 
} from '../config/endpoints.js';

// Enterprise stress testing metrics
const circuitBreakerOpenCount = new Counter('circuit_breaker_open_count');
const circuitBreakerHalfOpenCount = new Counter('circuit_breaker_half_open_count');
const fallbackResponseCount = new Counter('fallback_response_count');
const financialIntegrityViolations = new Counter('financial_integrity_violations');
const cascadingFailureCount = new Counter('cascading_failure_count');
const recoveryTimeGauge = new Gauge('recovery_time_seconds');
const errorQualityRate = new Rate('error_quality_rate');

export const options = {
  stages: [
    { duration: '1m', target: 100 },   // Baseline load
    { duration: '2m', target: 500 },   // Aggressive ramp
    { duration: '3m', target: 1000 },  // Stress threshold
    { duration: '2m', target: 2000 },  // Breaking point
    { duration: '5m', target: 3000 },  // Maximum stress
    { duration: '3m', target: 1000 },  // Recovery observation
    { duration: '2m', target: 100 },   // Return to baseline
    { duration: '1m', target: 0 },     // Cool down
  ],
  
  // Stress thresholds - expect degradation but controlled failure
  thresholds: {
    http_req_duration: ['p(99)<5000'], // Allow higher latency under stress
    circuit_breaker_open_count: ['count>0'], // Expect breakers to trip
    financial_integrity_violations: ['count<1'], // Zero tolerance
    cascading_failure_count: ['count<5'], // Minimal cascading
    recovery_time_seconds: ['value<120'], // 2-minute recovery SLA
    error_quality_rate: ['rate>0.9'], // 90%+ helpful error messages
  },
  
  userAgent: 'ScholarLink-LoadTest/1.0 (Stress-To-Break)',
};

function authenticateUser() {
  return {
    'Authorization': 'Bearer stress-test-token',
    'Content-Type': 'application/json',
    'X-Correlation-ID': `stress-${__VU}-${Date.now()}-${Math.random()}`
  };
}

let stressStartTime = Date.now();
let lastCircuitBreakerCheck = 0;

export default function() {
  const headers = authenticateUser();
  const testUser = `stress-user-${__VU}`;
  
  // 1. Reliability Health Check - Monitor circuit breaker states
  const reliabilityRes = http.get(MONITORING_ENDPOINTS.reliability);
  if (reliabilityRes.status === 200) {
    try {
      const status = JSON.parse(reliabilityRes.body);
      
      // Track circuit breaker state changes
      Object.keys(status.services || {}).forEach(service => {
        const serviceStatus = status.services[service];
        if (serviceStatus.state === 'OPEN') {
          circuitBreakerOpenCount.add(1);
        } else if (serviceStatus.state === 'HALF_OPEN') {
          circuitBreakerHalfOpenCount.add(1);
        }
      });
      
      // Calculate recovery time if system is recovering
      if (status.overallHealth === 'degraded' && lastCircuitBreakerCheck > 0) {
        const currentTime = Date.now();
        recoveryTimeGauge.add((currentTime - lastCircuitBreakerCheck) / 1000);
      }
      lastCircuitBreakerCheck = Date.now();
    } catch (e) {
      // Ignore JSON parsing errors under stress
    }
  }
  
  sleep(0.1);
  
  // 2. AI Service Stress Test - Force circuit breakers
  const aiStressPayload = {
    studentProfile: {
      gpa: 4.0,
      major: 'Computer Science',
      graduationYear: 2025,
      interests: ['artificial-intelligence', 'machine-learning', 'data-science'],
      extracurriculars: ['coding-club', 'research', 'internships'],
      demographics: {
        state: 'CA',
        ethnicity: 'Asian American',
        firstGeneration: false
      }
    },
    preferences: {
      maxAmount: 50000,
      categories: ['merit', 'need-based', 'research', 'stem'],
      excludeRequirements: ['essay-required', 'interview-required']
    },
    stressTestFlag: true // Mark as stress test for monitoring
  };
  
  const aiStart = Date.now();
  const aiRes = http.post(AI_ENDPOINTS.generateMatches, JSON.stringify(aiStressPayload), { 
    headers,
    timeout: '10s' // Force faster timeouts under stress
  });
  
  // Analyze AI service response quality under stress
  const isErrorHelpful = check(aiRes, {
    'AI stress response has correlation ID': (r) => r.headers['X-Correlation-ID'] !== undefined,
    'AI stress error message is helpful': (r) => {
      if (r.status >= 400) {
        const body = r.body || '';
        return body.includes('temporarily unavailable') || 
               body.includes('high demand') ||
               body.includes('try again');
      }
      return true;
    },
    'AI stress response indicates fallback': (r) => {
      if (r.status === 200) {
        try {
          const response = JSON.parse(r.body);
          return response.response?.isFallback === true;
        } catch (e) {
          return false;
        }
      }
      return true;
    }
  });
  
  if (isErrorHelpful) {
    errorQualityRate.add(1);
  } else {
    errorQualityRate.add(0);
  }
  
  // Track fallback responses and financial integrity
  if (aiRes.status === 200) {
    try {
      const response = JSON.parse(aiRes.body);
      if (response.response?.isFallback) {
        fallbackResponseCount.add(1);
        
        // CRITICAL: Verify no billing on fallback
        if (response.usage?.chargedCredits > 0) {
          financialIntegrityViolations.add(1);
          console.error(`FINANCIAL VIOLATION: Fallback charged ${response.usage.chargedCredits} credits`);
        }
      } else if (response.usage?.chargedCredits === 0 && !response.response?.isFallback) {
        // Real response with no billing - potential violation
        financialIntegrityViolations.add(1);
        console.error('FINANCIAL VIOLATION: Real AI response not billed');
      }
    } catch (e) {
      // JSON parsing error under stress - track as potential cascade
      cascadingFailureCount.add(1);
    }
  }
  
  sleep(0.2);
  
  // 3. Billing System Stress - Test payment idempotency under load
  if (Math.random() < 0.1) { // 10% billing operations
    const billingCorrelationId = `bill-stress-${__VU}-${Date.now()}`;
    const estimatePayload = {
      operations: [
        { type: 'essay_analysis', model: 'gpt-4o', estimatedTokens: 1000 },
        { type: 'match_generation', model: 'gpt-4o', estimatedTokens: 2000 }
      ],
      correlationId: billingCorrelationId
    };
    
    // Attempt duplicate estimate requests to test idempotency
    const billingStart = Date.now();
    const estimate1 = http.post(BILLING_ENDPOINTS.estimate, JSON.stringify(estimatePayload), { headers });
    const estimate2 = http.post(BILLING_ENDPOINTS.estimate, JSON.stringify(estimatePayload), { headers });
    
    // Check for idempotency violations
    if (estimate1.status === 200 && estimate2.status === 200) {
      try {
        const result1 = JSON.parse(estimate1.body);
        const result2 = JSON.parse(estimate2.body);
        
        if (result1.totalCredits !== result2.totalCredits) {
          financialIntegrityViolations.add(1);
          console.error('IDEMPOTENCY VIOLATION: Different billing estimates for same request');
        }
      } catch (e) {
        cascadingFailureCount.add(1);
      }
    }
    
    sleep(0.3);
  }
  
  // 4. Cascade Detection - Monitor for downstream failures
  const monitoringStart = Date.now();
  const metricsRes = http.get(MONITORING_ENDPOINTS.apiMetrics, { 
    headers: { 'Accept': 'application/json' },
    timeout: '5s'
  });
  
  if (metricsRes.status >= 500) {
    cascadingFailureCount.add(1);
  }
  
  // 5. Database Stress - Force connection pool exhaustion
  if (Math.random() < 0.05) { // 5% heavy DB operations
    const profileRes = http.get(`${USER_ENDPOINTS.profile}?heavy_query=true`, { headers });
    const scholarshipRes = http.get(`${USER_ENDPOINTS.scholarships}?limit=100&complex_filter=true`);
    
    if (profileRes.status >= 500 || scholarshipRes.status >= 500) {
      cascadingFailureCount.add(1);
    }
  }
  
  // Aggressive load - minimal sleep
  sleep(0.1);
}

export function handleSummary(data) {
  return {
    'stress-to-break-report.html': htmlReport(data),
    'stress-to-break-results.json': JSON.stringify(data, null, 2),
  };
}