/**
 * Executive Baseline Capacity Test Configuration - Task perf-6b
 * CEO-Approved Forecast-to-Test Mapping for 12-Month Growth + 3x Headroom
 * 
 * FORECAST INPUTS (Executive Approved):
 * - Target DAUs: 25,000 active students (Month 12)
 * - Sessions/DAU: 2.5 sessions per day  
 * - Requests/Session: 15 requests (profile, search, AI analysis)
 * - Concurrency Factor: 0.08 (8% concurrent during peak)
 * - Baseline RPS: (25,000 × 2.5 × 15 × 0.08) ÷ 3600 = 20.8 RPS
 * - Target with 3x Headroom: 62.5 RPS
 */

import { BASE_URL } from './endpoints.js';

export const EXECUTIVE_FORECAST = {
  // Growth model inputs (CEO-approved)
  targetDAUs: 25000,
  sessionsPerDAU: 2.5,
  requestsPerSession: 15,
  concurrencyFactor: 0.08,
  headroomMultiplier: 3,
  
  // Calculated targets
  baselineRPS: 20.8,
  targetRPSWithHeadroom: 62.5,
  
  // Revenue targets (supporting $10M ARR)
  aiRequestsPercentage: 0.20, // 20% of requests are AI-powered
  avgRevenuePerAIRequest: 0.05, // $0.05 per AI request
  monthlyARRTarget: 833333 // $10M ÷ 12 months
};

export const STEP_LOAD_PLATEAUS = [
  {
    name: 'Baseline Current',
    rps: 15,
    vus: 60,
    description: 'Current capacity baseline',
    duration_warmup: '2m',
    duration_steady: '15m'
  },
  {
    name: '6-Month Growth',
    rps: 30,
    vus: 120,
    description: '6-month growth projection',
    duration_warmup: '2m',
    duration_steady: '15m'
  },
  {
    name: '9-Month Growth',
    rps: 45,
    vus: 180,
    description: '9-month growth projection',
    duration_warmup: '2m',
    duration_steady: '15m'
  },
  {
    name: '12-Month Target',
    rps: 62,
    vus: 250,
    description: '12-month target with 3x headroom',
    duration_warmup: '2m',
    duration_steady: '15m'
  },
  {
    name: 'Stress Validation',
    rps: 85,
    vus: 340,
    description: 'Stress validation beyond target',
    duration_warmup: '2m',
    duration_steady: '15m'
  }
];

// Executive SLO Thresholds (Updated per CEO directive)
export const EXECUTIVE_SLO = {
  // API Latency (official SLO)
  p95_latency_ms: 120,  // P95 ≤ 120ms (official SLO)
  p99_latency_ms: 250,  // P99 ≤ 250ms 
  stretch_p95_ms: 100,  // 100ms stretch goal
  
  // Error rates (excluding expected 401s)
  error_rate_5xx: 0.001,     // ≤ 0.1% for 5xx errors
  error_rate_unexpected: 0.001, // ≤ 0.1% unexpected 4xx
  
  // Availability
  availability_percent: 99.9,  // ≥ 99.9% during steady-state
  
  // Infrastructure headroom
  cpu_utilization_max: 0.70,        // CPU ≤ 70%
  db_connection_free_min: 0.20,     // DB pool ≥ 20% free
  
  // Database performance
  db_p95_query_ms: 50,       // P95 query ≤ 50ms
  db_replication_lag_ms: 100, // Replication lag ≤ 100ms
  
  // Cost and margin targets
  cost_per_1k_requests_max: 0.50,    // ≤ $0.50 per 1k requests
  ai_markup_multiplier: 4,           // 4x markup on AI costs
  provider_fee_percentage: 0.03      // 3% provider fee
};

// Test execution configuration
export const EXECUTION_CONFIG = {
  total_duration_minutes: 85, // 5 plateaus × 17 minutes each
  warmup_per_plateau: '2m',
  steady_state_per_plateau: '15m',
  
  // Data protection (FERPA/COPPA compliance)
  use_synthetic_data: true,
  anonymize_all_logs: true,
  exclude_pii: true,
  
  // Monitoring and observability
  correlation_id_prefix: 'exec-baseline',
  sample_slow_requests: true,
  enable_cost_tracking: true,
  
  // Environment validation
  require_prod_equivalent: true,
  validate_rate_limits: true,
  check_feature_flags: true
};

export default {
  EXECUTIVE_FORECAST,
  STEP_LOAD_PLATEAUS,
  EXECUTIVE_SLO,
  EXECUTION_CONFIG
};