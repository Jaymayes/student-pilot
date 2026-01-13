/**
 * Evidence Collection Framework for T+24h Bundle
 * 
 * Collects:
 * - SLO metrics (P95, error rates)
 * - Event parity traces
 * - Privacy enforcement logs
 * - Security (API key) logs
 * - Resilience metrics
 * - Monetization dry-run data
 * - Cost tracking
 */

export interface EvidenceBundle {
  run_id: string;
  timestamp: string;
  slo: SLOSnapshot;
  event_parity: EventParityData;
  privacy: PrivacyEvidence;
  security: SecurityEvidence;
  resilience: ResilienceMetrics;
  monetization: MonetizationDryRun;
  cost: CostTracking;
  gates: GateStatus;
}

export interface SLOSnapshot {
  a2: { p95_ms: number; error_rate: number; samples: number };
  a6: { p95_ms: number; error_rate: number; samples: number };
  v2_aggregate: { p95_ms: number; error_rate: number; samples: number };
}

export interface EventParityData {
  first_upload_parity: number;
  traces: TraceItem[];
}

export interface TraceItem {
  trace_id: string;
  steps: {
    service: string;
    timestamp: string;
    status: string;
    latency_ms: number;
  }[];
  complete: boolean;
}

export interface PrivacyEvidence {
  under_18_samples: {
    user_id_hash: string;
    do_not_sell: boolean;
    csp_strict: boolean;
    pii_logged: boolean;
  }[];
  pii_violations: number;
}

export interface SecurityEvidence {
  api_key_present_samples: {
    service: string;
    endpoint: string;
    key_present: boolean;
    status: number;
  }[];
  unauthorized_rejections: number;
}

export interface ResilienceMetrics {
  circuit_breaker_timeline: {
    timestamp: string;
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  }[];
  retry_histogram: {
    attempts: number;
    count: number;
  }[];
}

export interface MonetizationDryRun {
  b2c_credit_events: number;
  b2c_4x_markup_verified: boolean;
  b2b_platform_fee_events: number;
  b2b_3_percent_verified: boolean;
}

export interface CostTracking {
  shadow_spend_usd: number;
  cap_usd: number;
  under_cap: boolean;
}

export interface GateStatus {
  SHADOW_PASS_24H: 0 | 1;
  A2_V26_COMPLIANT: 0 | 1;
  EVIDENCE_BUNDLE: 0 | 1;
  CANARY_AUTHORIZED: boolean;
}

export function createEmptyBundle(runId: string): EvidenceBundle {
  return {
    run_id: runId,
    timestamp: new Date().toISOString(),
    slo: {
      a2: { p95_ms: 0, error_rate: 0, samples: 0 },
      a6: { p95_ms: 0, error_rate: 0, samples: 0 },
      v2_aggregate: { p95_ms: 0, error_rate: 0, samples: 0 }
    },
    event_parity: { first_upload_parity: 0, traces: [] },
    privacy: { under_18_samples: [], pii_violations: 0 },
    security: { api_key_present_samples: [], unauthorized_rejections: 0 },
    resilience: { circuit_breaker_timeline: [], retry_histogram: [] },
    monetization: {
      b2c_credit_events: 0,
      b2c_4x_markup_verified: false,
      b2b_platform_fee_events: 0,
      b2b_3_percent_verified: false
    },
    cost: { shadow_spend_usd: 0, cap_usd: 50, under_cap: true },
    gates: {
      SHADOW_PASS_24H: 0,
      A2_V26_COMPLIANT: 0,
      EVIDENCE_BUNDLE: 0,
      CANARY_AUTHORIZED: false
    }
  };
}

export function evaluateGates(bundle: EvidenceBundle): GateStatus {
  const sloPass = 
    bundle.slo.a2.p95_ms <= 120 && 
    bundle.slo.a2.error_rate <= 0.005 &&
    bundle.slo.v2_aggregate.p95_ms <= 120;
  
  const privacyPass = bundle.privacy.pii_violations === 0;
  const costPass = bundle.cost.under_cap;
  const parityPass = bundle.event_parity.first_upload_parity >= 0.995;
  
  const shadowPass = sloPass && privacyPass && costPass && parityPass ? 1 : 0;
  
  return {
    SHADOW_PASS_24H: shadowPass as 0 | 1,
    A2_V26_COMPLIANT: bundle.gates.A2_V26_COMPLIANT,
    EVIDENCE_BUNDLE: 1,
    CANARY_AUTHORIZED: shadowPass === 1 && bundle.gates.A2_V26_COMPLIANT === 1
  };
}
