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

export const SEV2_INCIDENT = {
  active: true, // SEV-2 ACTIVE - Telemetry Truth Reconciliation
  cir_id: 'CIR-1768842776',
  a8_event_id: 'evt_1768840917052_cs90awmqw',
  error_codes: ['AUTH_DB_UNREACHABLE', 'RETRY_STORM_SUPPRESSED', 'TELEMETRY_428', 'GREEN_MIRAGE'],
  kill_switch_activated_at: '2026-01-19T17:12:00.000Z',
  resolved_at: null as string | null,
  change_freeze: true,
  canary_authorized: false, // Gate-1 NO-GO
  canary_started_at: null as string | null,
  b2c_paused: false, // 2% pilot continues under defensive posture
} as const;

export const CONTAINMENT_CONFIG = {
  fleet_seo_paused: true,
  internal_schedulers_capped: true,
  permitted_jobs: ['auth', 'payments', 'watchtower'] as const,
  blocked_jobs: ['page_builds', 'sitemap_fetches', 'etl', 'analytics_transforms', 'seo_fetch'] as const,
  stripe_cap_6h: 4,
  pilot_traffic_pct: 2,
  safety_lock: true,
  auto_refunds: true,
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
  B2C_CAPTURE: 'pilot_only', // RESTORED - 2% pilot active
  MICROCHARGE_REFUND: true, // Refunds enabled
  SAFETY_LOCK: true, // Safety lock active
  TRAFFIC_CAP_B2C_PILOT: 2, // 2% traffic cap restored
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
