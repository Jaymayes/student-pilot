/**
 * Canary Phase 1 (5%) Monitoring Framework
 * 
 * CEO Directives:
 * - FREEZE_LOCK=1, SEO-only acquisition, Stripe TEST
 * - Spend cap $300, alert at $240
 * - T+2h and T+6h reports required
 */

const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';

export interface CanaryMetrics {
  timestamp: string;
  phase: 'phase1_5pct';
  traffic_percent: 5;
  slo: {
    a2: { p95_ms: number; error_rate: number; samples: number };
    a6: { p95_ms: number; error_rate: number; samples: number };
    v2_aggregate: { p95_ms: number; error_rate: number; samples: number };
  };
  first_upload_parity: number;
  traces: TraceItem[];
  verifier: {
    pass_rate: number;
    self_correction_rate: number;
    fp_rate: number;
  };
  cost: {
    current_usd: number;
    velocity_usd_per_hour: number;
    projected_24h_usd: number;
    cap_usd: number;
    alert_threshold_usd: number;
  };
  incidents: {
    sev1: number;
    sev2: number;
    mttr_minutes: number | null;
  };
  circuit_breaker: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  warm_instances: {
    orchestrator: number;
    document_hub: number;
  };
}

export interface TraceItem {
  trace_id: string;
  user_id_hash: string;
  steps: { service: string; latency_ms: number; status: string }[];
  complete: boolean;
}

export interface ScalePolicy {
  min_instances: number;
  target_idle_p95_ms: number;
  scale_trigger_p95_ms: number;
  scale_check_windows: number;
  scale_increment: number;
  recheck_interval_minutes: number;
}

export const SCALE_POLICY: ScalePolicy = {
  min_instances: 2,
  target_idle_p95_ms: 90,
  scale_trigger_p95_ms: 100,
  scale_check_windows: 2,
  scale_increment: 1,
  recheck_interval_minutes: 15
};

export const COST_CONFIG = {
  cap_usd: 300,
  alert_threshold_usd: 240,
  shadow_cap_usd: 50
};

export const PROMOTION_CRITERIA = {
  p95_max_ms: 120,
  error_rate_max: 0.005,
  sev1_max: 0,
  sev2_max: 1,
  sev2_mttr_max_minutes: 30,
  parity_tolerance: 0.05
};

export function evaluatePromotionReadiness(metrics: CanaryMetrics): {
  ready: boolean;
  blockers: string[];
} {
  const blockers: string[] = [];
  
  if (metrics.slo.v2_aggregate.p95_ms > PROMOTION_CRITERIA.p95_max_ms) {
    blockers.push(`P95 ${metrics.slo.v2_aggregate.p95_ms}ms > ${PROMOTION_CRITERIA.p95_max_ms}ms`);
  }
  
  if (metrics.slo.v2_aggregate.error_rate > PROMOTION_CRITERIA.error_rate_max) {
    blockers.push(`Error rate ${(metrics.slo.v2_aggregate.error_rate * 100).toFixed(2)}% > 0.5%`);
  }
  
  if (metrics.incidents.sev1 > PROMOTION_CRITERIA.sev1_max) {
    blockers.push(`${metrics.incidents.sev1} Sev-1 incidents (max 0)`);
  }
  
  if (metrics.incidents.sev2 > PROMOTION_CRITERIA.sev2_max) {
    blockers.push(`${metrics.incidents.sev2} Sev-2 incidents (max 1)`);
  }
  
  if (metrics.incidents.mttr_minutes && metrics.incidents.mttr_minutes > PROMOTION_CRITERIA.sev2_mttr_max_minutes) {
    blockers.push(`MTTR ${metrics.incidents.mttr_minutes}m > 30m`);
  }
  
  if (metrics.cost.current_usd > COST_CONFIG.cap_usd) {
    blockers.push(`Cost $${metrics.cost.current_usd} > $${COST_CONFIG.cap_usd} cap`);
  }
  
  return {
    ready: blockers.length === 0,
    blockers
  };
}

export function shouldScale(p95History: number[]): boolean {
  if (p95History.length < SCALE_POLICY.scale_check_windows) return false;
  
  const recentWindows = p95History.slice(-SCALE_POLICY.scale_check_windows);
  return recentWindows.every(p95 => p95 > SCALE_POLICY.scale_trigger_p95_ms);
}

export async function emitCanaryMetrics(metrics: CanaryMetrics): Promise<void> {
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'canary_metrics',
        app_id: 'A5',
        timestamp: metrics.timestamp,
        data: metrics
      })
    });
  } catch {
    console.log('[Canary] Failed to emit metrics (non-blocking)');
  }
}

export async function emitCostAlert(current: number, cap: number): Promise<void> {
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'cost_alert',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: {
          current_usd: current,
          cap_usd: cap,
          threshold_usd: COST_CONFIG.alert_threshold_usd,
          severity: current >= cap ? 'critical' : 'warning'
        }
      })
    });
  } catch {
    console.log('[Canary] Failed to emit cost alert');
  }
}
