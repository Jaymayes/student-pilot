import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'https://student-pilot-jamarrlmayes.replit.app';

const errorRate = new Rate('errors');
const healthDuration = new Trend('health_duration');
const canaryDuration = new Trend('canary_duration');
const scholarshipsDuration = new Trend('scholarships_duration');

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<150'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.01'],
  },
};

export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    timeout: '10s',
  };

  const healthRes = http.get(`${BASE_URL}/api/health`, params);
  healthDuration.add(healthRes.timings.duration);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
    'health returns ok': (r) => {
      try {
        return JSON.parse(r.body).status === 'ok';
      } catch {
        return false;
      }
    },
  }) || errorRate.add(1);

  sleep(0.5);

  const canaryRes = http.get(`${BASE_URL}/api/canary`, params);
  canaryDuration.add(canaryRes.timings.duration);
  check(canaryRes, {
    'canary status is 200': (r) => r.status === 200,
    'canary returns identity': (r) => {
      try {
        return JSON.parse(r.body).system_identity === 'student_pilot';
      } catch {
        return false;
      }
    },
  }) || errorRate.add(1);

  sleep(0.5);

  const scholarshipsRes = http.get(`${BASE_URL}/api/scholarships`, params);
  scholarshipsDuration.add(scholarshipsRes.timings.duration);
  check(scholarshipsRes, {
    'scholarships status is 200': (r) => r.status === 200,
    'scholarships returns array': (r) => {
      try {
        return Array.isArray(JSON.parse(r.body));
      } catch {
        return false;
      }
    },
  }) || errorRate.add(1);

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': JSON.stringify({
      timestamp: new Date().toISOString(),
      app: 'student_pilot',
      test: 'smoke_test',
      metrics: {
        http_req_duration_p95: data.metrics.http_req_duration?.values?.['p(95)'] || 0,
        http_req_failed_rate: data.metrics.http_req_failed?.values?.rate || 0,
        error_rate: data.metrics.errors?.values?.rate || 0,
        health_p95: data.metrics.health_duration?.values?.['p(95)'] || 0,
        canary_p95: data.metrics.canary_duration?.values?.['p(95)'] || 0,
        scholarships_p95: data.metrics.scholarships_duration?.values?.['p(95)'] || 0,
      },
      thresholds: {
        http_req_duration_p95_pass: (data.metrics.http_req_duration?.values?.['p(95)'] || 0) < 150,
        http_req_failed_pass: (data.metrics.http_req_failed?.values?.rate || 0) < 0.01,
        error_rate_pass: (data.metrics.errors?.values?.rate || 0) < 0.01,
      },
      pass: (data.metrics.http_req_duration?.values?.['p(95)'] || 0) < 150 &&
            (data.metrics.http_req_failed?.values?.rate || 0) < 0.01 &&
            (data.metrics.errors?.values?.rate || 0) < 0.01,
    }, null, 2),
  };
}
