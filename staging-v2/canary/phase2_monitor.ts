/**
 * Phase 2 (25%) Monitoring Framework
 * 
 * Reporting Cadence: T+2h, T+6h, T+12h
 * Stripe Mode: LIVE (CFO authorized)
 */

const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';

export interface Phase2Metrics {
  timestamp: string;
  phase: 'phase2_25pct';
  traffic_percent: 25;
  stripe_mode: 'LIVE';
  
  slo: {
    a2: { p95_ms: number; error_rate: number; samples: number };
    a6: { p95_ms: number; error_rate: number; samples: number };
    v2_aggregate: { p95_ms: number; error_rate: number; samples: number };
  };
  
  error_histogram: {
    status_code: number;
    count: number;
  }[];
  
  first_upload_parity: number;
  traces: object[];
  
  verifier: {
    pass_rate: number;
    self_correction_rate: number;
    fp_rate: number;
  };
  
  stripe: {
    auth_success_rate: number;
    settlement_success_rate: number;
    refund_latency_seconds: number;
    chargebacks: number;
    disputes: number;
    fraud_signals_percent: number;
  };
  
  cost: {
    current_usd: number;
    velocity_usd_per_hour: number;
    projected_24h_usd: number;
  };
  
  incidents: {
    sev1: number;
    sev2: number;
    mttr_minutes: number | null;
  };
}

export interface ExecutiveKPIs {
  timestamp: string;
  
  b2c: {
    arpu_usd: number;
    conversion_visitor_to_signup: number;
    conversion_signup_to_first_upload: number;
    conversion_first_upload_to_paid: number;
    refund_rate: number;
  };
  
  b2b: {
    provider_fee_accrual_usd: number;
    provider_fee_rate: number;
    active_providers: number;
  };
  
  unit_economics: {
    gross_margin_ai_services: number;
    ltv_cac_ratio: number;
    cac_usd: number;
  };
}

export const PHASE2_THRESHOLDS = {
  p95_max_ms: 120,
  error_rate_max: 0.005,
  stripe_success_min: 0.98,
  stripe_refund_max_seconds: 600,
  fraud_signals_max: 0.01,
  chargebacks_max: 0
};

export const PHASE3_THRESHOLDS = {
  p95_max_ms: 110,
  stripe_success_min: 0.985,
  parity_tolerance: 0.05
};

export interface Phase2GateStatus {
  PHASE2_STABLE_12H: 0 | 1;
  SLO_OK: 0 | 1;
  STRIPE_OK: 0 | 1;
  BUSINESS_PARITY_OK: 0 | 1;
  PRIVACY_SECURITY_OK: 0 | 1;
  PHASE3_AUTHORIZED: boolean;
}

export function evaluatePhase2Gates(
  metrics: Phase2Metrics,
  stableFor12h: boolean,
  parityOk: boolean,
  privacySecurityOk: boolean
): Phase2GateStatus {
  const sloOk = 
    metrics.slo.v2_aggregate.p95_ms <= PHASE3_THRESHOLDS.p95_max_ms &&
    metrics.slo.v2_aggregate.error_rate <= PHASE2_THRESHOLDS.error_rate_max;
  
  const stripeOk =
    metrics.stripe.auth_success_rate >= PHASE3_THRESHOLDS.stripe_success_min &&
    metrics.stripe.settlement_success_rate >= PHASE3_THRESHOLDS.stripe_success_min &&
    metrics.stripe.chargebacks === 0;
  
  return {
    PHASE2_STABLE_12H: stableFor12h ? 1 : 0,
    SLO_OK: sloOk ? 1 : 0,
    STRIPE_OK: stripeOk ? 1 : 0,
    BUSINESS_PARITY_OK: parityOk ? 1 : 0,
    PRIVACY_SECURITY_OK: privacySecurityOk ? 1 : 0,
    PHASE3_AUTHORIZED: stableFor12h && sloOk && stripeOk && parityOk && privacySecurityOk
  };
}

export function shouldAutoRollback(metrics: Phase2Metrics): {
  rollback: boolean;
  reason?: string;
} {
  if (metrics.incidents.sev1 > 0) {
    return { rollback: true, reason: 'Sev-1 incident detected' };
  }
  
  if (metrics.stripe.auth_success_rate < PHASE2_THRESHOLDS.stripe_success_min) {
    return { rollback: true, reason: `Stripe auth success ${(metrics.stripe.auth_success_rate * 100).toFixed(1)}% < 98%` };
  }
  
  if (metrics.stripe.fraud_signals_percent > PHASE2_THRESHOLDS.fraud_signals_max) {
    return { rollback: true, reason: `Fraud signals ${(metrics.stripe.fraud_signals_percent * 100).toFixed(1)}% > 1%` };
  }
  
  return { rollback: false };
}

export async function emitPhase2Metrics(metrics: Phase2Metrics): Promise<void> {
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'canary_phase2_metrics',
        app_id: 'A5',
        timestamp: metrics.timestamp,
        data: metrics
      })
    });
  } catch {
    console.log('[Phase2] Failed to emit metrics');
  }
}

export async function emitExecutiveKPIs(kpis: ExecutiveKPIs): Promise<void> {
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'executive_kpis',
        app_id: 'A5',
        timestamp: kpis.timestamp,
        data: kpis
      })
    });
  } catch {
    console.log('[Phase2] Failed to emit executive KPIs');
  }
}
