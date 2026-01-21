/**
 * Server-side Feature Flags Configuration
 * 
 * Executive Implementation Order SAA-EO-2026-01-19-01
 * 
 * SEV-2 KILL SWITCH ACTIVATED - 2026-01-19T15:46:20Z
 * CIR ID: CIR-1768837580
 * 
 * T0 Actions - Feature Toggle Set:
 * - B2C_CAPTURE: active (Gate-2 @ 25%)
 * - MICROCHARGE_REFUND: enabled (refunds still allowed)
 * - SAFETY_LOCK: active
 * - TRAFFIC_CAP_B2C_PILOT: 50% (Gate-3)
 * - CHANGE_FREEZE: lifted
 * - FINANCE_FREEZE: ACTIVE (no fund movement)
 * 
 * Gate-1 Opened: 2026-01-20T10:24:09Z
 * Gate-2 Opened: 2026-01-20T16:40:38Z
 * Gate-3 Opened: 2026-01-20T20:43:00Z
 * HITL_ID: HITL-CEO-20260120-OPEN-TRAFFIC-G3
 */

export const SEV1_INCIDENT = {
  active: false, // SEV-1 resolved → SEV-2 monitoring mode
  cir_id: 'CIR-1768893338',
  a8_event_id: 'evt_sev1_waf_regression',
  error_codes: ['WAF_HEADER_STRIP', 'OIDC_BASE_URL_FAIL', 'HEALTH_410_GONE', 'LOCALHOST_SYNTHETIC'],
  sev1_declared_at: '2026-01-20T07:15:38.000Z',
  root_cause: 'WAF stripped x-forwarded-host header',
  resolved_at: '2026-01-20T10:23:00.000Z' as string | null,
  change_freeze: false, // Lifted for Gate-1
  canary_authorized: true, // HITL-CEO-20260120-OPEN-TRAFFIC-G1
  canary_started_at: '2026-01-20T10:23:00.000Z' as string | null,
  b2c_pilot_approved: true, // Gate-1 approved
  gate1_status: 'COMPLETE',
  gate2_status: 'COMPLETE',
  gate3_status: 'COMPLETE',
  gate4_status: 'COMPLETE', // Gate-4 VERIFIED per CEOSPRINT-20260121-EXEC-ZT3G-G5-FIN-READY-046
} as const;

export const FINANCE_CONTROLS = {
  ledger_freeze: true, // RE-ENGAGED per CEO - no invoicing until CFO sign-off
  provider_invoicing_paused: true, // NO downstream invoicing
  fee_postings_paused: true, // NO fee settlements
  persist_ledger_entries: true, // Continue writing to overnight_protocols_ledger
  require_cfo_signoff: true, // Reconciliation report + CFO approval required
  canonical_table: 'overnight_protocols_ledger',
  // Gate-5 Penny Test Configuration (HITL-CFO-20260121-UNFREEZE-G5)
  shadow_ledger_enabled: true, // Gate-5: Shadow mode for validation
  b2c_capture_mode: 'PENNY_TEST', // Gate-5: Limited live charge for penny test only
  live_stripe_charges: 'LIMITED', // Gate-5: LIMITED for penny test (CFO approved 2026-01-21)
  penny_test_max_amount_cents: 50, // $0.50 max for penny test
  penny_test_max_transactions: 1, // Max 1 transaction allowed
  penny_test_refund_sla_seconds: 60, // Refund within 60s required
} as const;

export const CONTAINMENT_CONFIG = {
  fleet_seo_paused: true,
  internal_schedulers_capped: true,
  permitted_jobs: ['auth', 'payments', 'watchtower', 'ledger_heartbeat'] as const,
  blocked_jobs: ['page_builds', 'sitemap_fetches', 'etl', 'analytics_transforms', 'seo_fetch', 'cron', 'node-cron', 'invoicing', 'fee_posting', 'settlement'] as const,
  stripe_cap_6h: 0, // Finance freeze active
  pilot_traffic_pct: 100, // Gate-4 VERIFIED @100% per CEOSPRINT-20260121-EXEC-ZT3G-G5-FIN-READY-046
  safety_lock: true,
  auto_refunds: true,
  waf_sitemap_block: true,
  scheduler_tokens_revoked: true,
  localhost_probes_disabled: true, // CRITICAL: No localhost probes
  metrics_p95_probes_disabled: false, // Need /metrics/p95 endpoint
  a8_stopped_until_patch: false,
  synthetic_ip_allowlist: true,
  rate_limit_abuse_ips: true,
  ledger_heartbeat_interval_min: 10,
  ledger_stale_alert_min: 15,
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
  B2C_CAPTURE: 'active', // Gate-3: Enabled at 50% per HITL-CEO-20260120-OPEN-TRAFFIC-G3
  MICROCHARGE_REFUND: true, // Refunds enabled - KEEP ACTIVE
  SAFETY_LOCK: true, // Safety lock active - KEEP ACTIVE
  TRAFFIC_CAP_B2C_PILOT: 100, // Gate-4 VERIFIED @100% per CEOSPRINT-20260121-EXEC-ZT3G-G5-FIN-READY-046
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
  // Gate-1: B2C_CAPTURE is 'active', so all users are pilot users at 10%
  if ((FEATURE_FLAGS.B2C_CAPTURE as string) === 'paused') {
    return false;
  }
  return true;
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
  // Check if SEV1 incident is active (runtime check, not compile-time)
  return (SEV1_INCIDENT.active as boolean) && FEATURE_FLAGS.TRAFFIC_CAP_B2C_PILOT < 1;
}

export function isChangeFreezeActive(): boolean {
  // Check if change freeze is active (runtime check)
  return SEV1_INCIDENT.change_freeze as boolean;
}

export function canProcessB2CCharge(): boolean {
  // Gate-1: SEV1 resolved, can process if B2C not paused
  return !(SEV1_INCIDENT.active as boolean) && (FEATURE_FLAGS.B2C_CAPTURE as string) !== 'paused';
}

export function canProcessRefund(): boolean {
  return FEATURE_FLAGS.MICROCHARGE_REFUND; // Always enabled
}
