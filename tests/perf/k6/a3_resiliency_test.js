/**
 * AGENT3_HANDSHAKE v27 - Phase 7 A3 Resiliency Test
 * HITL Approval: HITL-A3-503-v27-2026-01-09-CEO
 * 
 * Parameters:
 * - Environment: Staging only
 * - Concurrency: c ≤ 20
 * - Duration: Three 2-minute cycles
 * 
 * NOTE: A3 does not expose a /chaos/503 endpoint.
 * This test probes A3 health to establish baseline and detect
 * any naturally occurring failures during the test window.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const circuitBreakerTrips = new Counter('circuit_breaker_trips');

// Test configuration - 3 cycles of 2 minutes each = 6 minutes total
export const options = {
  scenarios: {
    resiliency_test: {
      executor: 'constant-vus',
      vus: 20, // c ≤ 20 as approved
      duration: '6m', // 3 x 2-minute cycles
    },
  },
  thresholds: {
    errors: ['rate<0.01'], // Error rate < 1%
    response_time: ['p95<200'], // P95 < 200ms
  },
};

const A3_STAGING_URL = 'https://scholarship-agent-jamarrlmayes.replit.app';

export default function () {
  // Health check probe
  const healthRes = http.get(`${A3_STAGING_URL}/api/health`, {
    tags: { endpoint: 'health' },
    timeout: '10s',
  });

  const isSuccess = check(healthRes, {
    'A3 health status is 200': (r) => r.status === 200,
    'A3 health response time < 300ms': (r) => r.timings.duration < 300,
    'A3 health returns ok status': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'ok';
      } catch {
        return false;
      }
    },
  });

  // Record metrics
  errorRate.add(!isSuccess);
  responseTime.add(healthRes.timings.duration);

  // Check for 503 (natural occurrence)
  if (healthRes.status === 503) {
    circuitBreakerTrips.add(1);
    console.log(`[${new Date().toISOString()}] A3 returned 503 - Circuit breaker may trip`);
  }

  // Brief pause between requests
  sleep(0.5);
}

export function handleSummary(data) {
  const summary = {
    hitl_approval: 'HITL-A3-503-v27-2026-01-09-CEO',
    timestamp: new Date().toISOString(),
    protocol: 'AGENT3_HANDSHAKE v27',
    phase: '7-resiliency',
    target: 'A3 (scholarship_agent)',
    environment: 'staging',
    duration_minutes: 6,
    vus: 20,
    total_requests: data.metrics.http_reqs.values.count,
    error_rate_pct: (data.metrics.errors.values.rate * 100).toFixed(2),
    p95_response_ms: data.metrics.response_time.values['p(95)'].toFixed(2),
    circuit_breaker_trips: data.metrics.circuit_breaker_trips?.values?.count || 0,
    verdict: data.metrics.errors.values.rate < 0.01 ? 'PASS' : 'FAIL',
  };

  return {
    'tests/perf/reports/a3_resiliency_k6_results.json': JSON.stringify(summary, null, 2),
    stdout: textSummary(data, { indent: '  ' }),
  };
}

function textSummary(data, options) {
  return `
=== A3 RESILIENCY TEST SUMMARY ===
HITL Approval: HITL-A3-503-v27-2026-01-09-CEO
Duration: 6 minutes (3 x 2-minute cycles)
VUs: 20

Total Requests: ${data.metrics.http_reqs.values.count}
Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%
P95 Response: ${data.metrics.response_time.values['p(95)'].toFixed(2)}ms

Verdict: ${data.metrics.errors.values.rate < 0.01 ? 'PASS' : 'FAIL'}
`;
}
