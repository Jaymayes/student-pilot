/**
 * Server-side Feature Flags Configuration
 * 
 * Executive Implementation Order SAA-EO-2026-01-19-01
 * 
 * SEV-2 KILL SWITCH ACTIVATED - 2026-01-19T15:46:20Z
 * CIR ID: CIR-1768837580
 * 
 * T0 Actions - Feature Toggle Set:
 * - B2C_CAPTURE: paused (KILL SWITCH)
 * - MICROCHARGE_REFUND: enabled (refunds still allowed)
 * - SAFETY_LOCK: active
 * - TRAFFIC_CAP_B2C_PILOT: 0% (HARD STOP)
 * - CHANGE_FREEZE: active
 */

export const SEV1_INCIDENT = {
  active: true, // SEV-1 REGRESSION - Hard fixes in progress
  cir_id: 'CIR-1768864546',
  a8_event_id: 'evt_1768842911704_bk0d6109d',
  error_codes: ['AUTH_RATE_LIMITED', 'IP_BLOCKED_LOCKOUT', 'HIGH_ERROR_RATE', 'TELEMETRY_428', 'GREEN_MIRAGE', 'LEDGER_MISSING', 'SPOOL_IO_ERROR'],
  kill_switch_activated_at: '2026-01-19T23:15:00.000Z',
  stability_hold_passed_at: null as string | null,
  resolved_at: null as string | null,
  change_freeze: true,
  canary_authorized: false,
  canary_started_at: null as string | null,
  b2c_paused: true, // REVERTED TO 0% - SEV-1 regression
  ledger_freeze: true, // Freeze provider invoicing until ledger created
  b2b_billing_frozen: true, // No B2B billing events
} as const;

export const CONTAINMENT_CONFIG = {
  fleet_seo_paused: true,
  internal_schedulers_capped: true,
  permitted_jobs: ['auth', 'payments', 'watchtower'] as const,
  blocked_jobs: ['page_builds', 'sitemap_fetches', 'etl', 'analytics_transforms', 'seo_fetch', 'cron', 'node-cron', 'invoicing', 'fee_posting'] as const,
  stripe_cap_6h: 4,
  pilot_traffic_pct: 0, // SEV-1 REGRESSION - HARD STOP
  safety_lock: true,
  auto_refunds: true,
  waf_sitemap_block: true,
  scheduler_tokens_revoked: true,
  localhost_probes_disabled: true,
  metrics_p95_probes_disabled: true,
  a8_stopped_until_patch: true, // Self-DDoS guard
  synthetic_ip_allowlist: true, // Provider flow synthetic IPs
  rate_limit_abuse_ips: true, // Abuse IP suppression
} as const;

export const CANARY_CONFIG = {
  pre_canary_hold_minutes: 10,
  
  step1: {
    a3_concurrency: 1,
    breaker_state: 'half_open',
    rate_limit_rpm: 5,
    duration_minutes: 10,
  },
  
  step2: {
    a3_concurrency: 3,
    rate_limit_rpm: 20,
    green_clock_minutes: 60,
  },
  
  abort_thresholds: {
    auth_5xx_any: true,
    pool_utilization_2min: 80,
    a3_errors_per_60s: 3,
  },
  
  exit_criteria: {
    green_minutes: 60,
    auth_5xx: 0,
    db_connected: true,
    pool_utilization_max: 80,
    p95_core_ms: 120,
    p95_aux_ms: 200,
  },
} as const;

export const FEATURE_FLAGS = {
  B2C_CAPTURE: 'paused', // SEV-1 REGRESSION - HARD STOP
  MICROCHARGE_REFUND: true, // Refunds enabled - KEEP ACTIVE
  SAFETY_LOCK: true, // Safety lock active - KEEP ACTIVE
  TRAFFIC_CAP_B2C_PILOT: 0, // SEV-1 REGRESSION - HARD STOP until 60-min green
} as const;

export const TELEMETRY_GATE = {
  strict_mode: false, // SEV-1: DISABLED - Accept all events
  require_idempotency: false, // SEV-1: DISABLED - Accept without headers
  accept_status: [200, 202], // Accept both
  log_missing_header: true, // Log for post-hoc dedupe
  compute_sha256_body: true, // Fingerprint for dedupe
} as const;

export const SEO_SUPPRESSION = {
  waf_block_sitemaps: true, // SEV-1: Block all sitemap endpoints
  revoke_scheduler_tokens: true, // SEV-1: Revoke across workspaces
  internal_jobs_paused: true, // SEV-1: All non-essential paused
} as const;

export const LIVE_MONITORING = {
  auto_rollback_thresholds: {
    auth_5xx_duration_min: 5,
    pool_utilization_pct: 80,
    pool_utilization_duration_min: 2,
    core_p95_ms: 120,
    core_p95_duration_min: 15,
    aux_p95_ms: 200,
    aux_p95_duration_min: 15,
    a3_error_burst_count: 3,
    a3_error_burst_window_sec: 60,
  },
  
  a3_breaker_close_policy: {
    consecutive_successes: 50,
    windows_required: 2,
    window_duration_min: 5,
  },
  
  synthetic_login_target_p95_ms: 500,
} as const;

export const B2C_PILOT_CONFIG = {
  run_id: 'ZT3G-056',
  cohort_id: 'B2C-PILOT-001',
  
  budget: {
    max_usd: 50,
    max_users: 100,
    stripe_attempts_first_6h: 4,
    auth_error_threshold: 0.03,
  },
  
  refund_slo: {
    target_minutes: 10,
    auto_refund: true,
  },
  
  guardrails: {
    fpr_max: 0.035,
    precision_min: 0.95,
    recall_min: 0.75,
    p95_core_ms: 120,
    p95_aux_ms: 200,
  },
  
  funnel_targets: {
    visitor_to_signup: 0.05,
    signup_to_credit_purchase: 0.02,
  },
  
  ramp_gates: {
    gate_1: { traffic_pct: 5, charge_usd: 1.00, refund: 'full', trigger: 'T+24h' },
    gate_2: { traffic_pct: 25, charge_usd: 1.00, refund_usd: 0.50, trigger: 'T+72h' },
    gate_3: { traffic_pct: 100, safety_lock: 'targeted', trigger: 'D+7' },
  },
};

export const B2B_CONFIG = {
  platform_fee_percent: 3,
  minimum_fee_cents: 50,
  
  onboarding_targets: {
    providers_30_days: 10,
    providers_per_week_after: 3,
  },
  
  kpis: {
    activation_to_listing_hours: 72,
    listing_to_lead_days: 7,
    fee_capture_rate_min: 0.98,
    dispute_rate_max: 0.005,
  },
  
  ledger_events: [
    'ListingCreated',
    'LeadAccepted',
    'ApplicationSubmitted',
    'AwardApproved',
    'AwardDisbursed',
  ] as const,
};

export function isPilotUser(userId: string): boolean {
  if (FEATURE_FLAGS.B2C_CAPTURE !== 'pilot_only') {
    return true;
  }
  return false;
}

export function isWithinBudget(currentSpend: number, currentUsers: number): boolean {
  return (
    currentSpend < B2C_PILOT_CONFIG.budget.max_usd * 100 &&
    currentUsers < B2C_PILOT_CONFIG.budget.max_users
  );
}

export function isSafetyLockActive(): boolean {
  return FEATURE_FLAGS.SAFETY_LOCK;
}

export function isKillSwitchActive(): boolean {
  return SEV2_INCIDENT.active === true && FEATURE_FLAGS.TRAFFIC_CAP_B2C_PILOT < 1;
}

export function isChangeFreezeActive(): boolean {
  return SEV2_INCIDENT.change_freeze === true;
}

export function canProcessB2CCharge(): boolean {
  return SEV2_INCIDENT.active === false && FEATURE_FLAGS.B2C_CAPTURE === 'pilot_only';
}

export function canProcessRefund(): boolean {
  return FEATURE_FLAGS.MICROCHARGE_REFUND; // Always enabled
}
