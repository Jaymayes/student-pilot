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
  active: true,
  cir_id: 'CIR-1768837580',
  a8_event_id: 'evt_1768837580711_ugd0zuebj',
  error_codes: ['AUTH_DB_UNREACHABLE', 'RETRY_STORM_SUPPRESSED'],
  kill_switch_activated_at: '2026-01-19T15:46:20.000Z',
  change_freeze: true,
} as const;

export const FEATURE_FLAGS = {
  B2C_CAPTURE: SEV2_INCIDENT.active ? 'paused' : (process.env.B2C_CAPTURE || 'pilot_only'),
  MICROCHARGE_REFUND: true, // Keep refunds enabled during SEV-2
  SAFETY_LOCK: true, // Always active during incident
  TRAFFIC_CAP_B2C_PILOT: SEV2_INCIDENT.active ? 0 : parseFloat(process.env.TRAFFIC_CAP_B2C_PILOT || '2'),
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
  return SEV2_INCIDENT.active && FEATURE_FLAGS.TRAFFIC_CAP_B2C_PILOT === 0;
}

export function isChangeFreezeActive(): boolean {
  return SEV2_INCIDENT.change_freeze;
}

export function canProcessB2CCharge(): boolean {
  return !SEV2_INCIDENT.active && FEATURE_FLAGS.B2C_CAPTURE !== 'paused';
}

export function canProcessRefund(): boolean {
  return FEATURE_FLAGS.MICROCHARGE_REFUND; // Always enabled
}
