/**
 * One-Click Apply 10% Pre-Authorization
 * 
 * CEO pre-approved: Advance to 10% without additional approval if all criteria green at T+24h
 */

const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';

export const PROMOTION_PREAUTH = {
  from_percent: 5,
  to_percent: 10,
  requires_ceo_approval: false,
  auto_promote_if_criteria_met: true,
  
  criteria: {
    integrity: {
      provider_complaints: 0,
      confirmed_violations: 0
    },
    performance: {
      p95_latency_max_seconds: 1.5,
      error_rate_max: 0.01
    },
    finance: {
      refund_rate_24h_max: 0.02,
      refund_delta_vs_baseline_max_pp: 0.0025
    },
    growth: {
      completion_rate_lift_min: 0.10
    },
    provider: {
      acceptance_rate_delta_min: 0
    }
  },
  
  kill_triggers_maintained: true,
  event_on_promote: 'oca_canary_promoted'
};

export interface T24hMetrics {
  provider_complaints: number;
  confirmed_violations: number;
  p95_latency_seconds: number;
  error_rate: number;
  refund_rate_24h: number;
  refund_baseline: number;
  completion_rate: number;
  completion_rate_control: number;
  acceptance_rate: number;
  acceptance_rate_baseline: number;
}

export interface PromotionDecision {
  promote: boolean;
  criteria_results: { criterion: string; passed: boolean; value: string; required: string }[];
  blockers: string[];
}

export function evaluateT24hForPromotion(metrics: T24hMetrics): PromotionDecision {
  const results: { criterion: string; passed: boolean; value: string; required: string }[] = [];
  const blockers: string[] = [];
  const c = PROMOTION_PREAUTH.criteria;
  
  const complaintsOk = metrics.provider_complaints === c.integrity.provider_complaints;
  results.push({
    criterion: 'Provider Complaints',
    passed: complaintsOk,
    value: `${metrics.provider_complaints}`,
    required: `${c.integrity.provider_complaints}`
  });
  if (!complaintsOk) blockers.push(`Complaints: ${metrics.provider_complaints} > 0`);
  
  const violationsOk = metrics.confirmed_violations === c.integrity.confirmed_violations;
  results.push({
    criterion: 'Integrity Violations',
    passed: violationsOk,
    value: `${metrics.confirmed_violations}`,
    required: `${c.integrity.confirmed_violations}`
  });
  if (!violationsOk) blockers.push(`Violations: ${metrics.confirmed_violations} > 0`);
  
  const p95Ok = metrics.p95_latency_seconds <= c.performance.p95_latency_max_seconds;
  results.push({
    criterion: 'P95 Latency',
    passed: p95Ok,
    value: `${metrics.p95_latency_seconds.toFixed(2)}s`,
    required: `≤${c.performance.p95_latency_max_seconds}s`
  });
  if (!p95Ok) blockers.push(`P95: ${metrics.p95_latency_seconds.toFixed(2)}s > 1.5s`);
  
  const errorOk = metrics.error_rate < c.performance.error_rate_max;
  results.push({
    criterion: 'Error Rate',
    passed: errorOk,
    value: `${(metrics.error_rate * 100).toFixed(2)}%`,
    required: `<${(c.performance.error_rate_max * 100)}%`
  });
  if (!errorOk) blockers.push(`Error: ${(metrics.error_rate * 100).toFixed(2)}% >= 1%`);
  
  const refundAbsOk = metrics.refund_rate_24h < c.finance.refund_rate_24h_max;
  results.push({
    criterion: 'Refund Rate 24h',
    passed: refundAbsOk,
    value: `${(metrics.refund_rate_24h * 100).toFixed(2)}%`,
    required: `<${(c.finance.refund_rate_24h_max * 100)}%`
  });
  if (!refundAbsOk) blockers.push(`Refund: ${(metrics.refund_rate_24h * 100).toFixed(2)}% >= 2%`);
  
  const refundDelta = metrics.refund_rate_24h - metrics.refund_baseline;
  const refundDeltaOk = refundDelta <= c.finance.refund_delta_vs_baseline_max_pp;
  results.push({
    criterion: 'Refund Delta',
    passed: refundDeltaOk,
    value: `+${(refundDelta * 100).toFixed(2)}pp`,
    required: `≤+${(c.finance.refund_delta_vs_baseline_max_pp * 100)}pp`
  });
  if (!refundDeltaOk) blockers.push(`Refund delta: +${(refundDelta * 100).toFixed(2)}pp > +0.25pp`);
  
  const completionLift = metrics.completion_rate_control > 0
    ? (metrics.completion_rate - metrics.completion_rate_control) / metrics.completion_rate_control
    : 0;
  const completionOk = completionLift >= c.growth.completion_rate_lift_min;
  results.push({
    criterion: 'Completion Lift',
    passed: completionOk,
    value: `+${(completionLift * 100).toFixed(1)}%`,
    required: `≥+${(c.growth.completion_rate_lift_min * 100)}%`
  });
  if (!completionOk) blockers.push(`Completion lift: +${(completionLift * 100).toFixed(1)}% < +10%`);
  
  const acceptanceDelta = metrics.acceptance_rate - metrics.acceptance_rate_baseline;
  const acceptanceOk = acceptanceDelta >= c.provider.acceptance_rate_delta_min;
  results.push({
    criterion: 'Acceptance Rate Delta',
    passed: acceptanceOk,
    value: `${acceptanceDelta >= 0 ? '+' : ''}${(acceptanceDelta * 100).toFixed(1)}pp`,
    required: `≥${c.provider.acceptance_rate_delta_min}pp`
  });
  if (!acceptanceOk) blockers.push(`Acceptance delta: ${(acceptanceDelta * 100).toFixed(1)}pp < 0`);
  
  return {
    promote: blockers.length === 0,
    criteria_results: results,
    blockers
  };
}

export async function executeAutoPromotion(metrics: T24hMetrics): Promise<{ promoted: boolean; decision: PromotionDecision }> {
  const decision = evaluateT24hForPromotion(metrics);
  
  if (decision.promote && PROMOTION_PREAUTH.auto_promote_if_criteria_met) {
    try {
      await fetch(A8_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'oca_canary_promoted',
          app_id: 'A5',
          timestamp: new Date().toISOString(),
          data: {
            from_percent: PROMOTION_PREAUTH.from_percent,
            to_percent: PROMOTION_PREAUTH.to_percent,
            metrics,
            decision,
            ceo_approval_required: false,
            kill_triggers_maintained: true
          }
        })
      });
      return { promoted: true, decision };
    } catch {
      console.log('[OCA Promotion] Failed to emit promotion event');
      return { promoted: false, decision };
    }
  }
  
  return { promoted: false, decision };
}
