/**
 * One-Click Apply KPIs and Guardrails
 * 
 * CEO-approved thresholds for T-1 dry run and canary
 */

const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';

export const OCA_KPIS = {
  students: {
    open_rate: { min: 0.35, unit: 'percent', description: 'Email open rate' },
    ctr: { min: 0.08, unit: 'percent', description: 'Click-through rate' },
    modal_completion: { min: 0.70, unit: 'percent', description: 'Modal completion rate' },
    submit_success: { min: 0.50, unit: 'percent', description: 'Submit success of modal entrants' }
  },
  
  providers: {
    complaint_rate: { max: 0, unit: 'count', description: 'Provider complaints' },
    time_to_first_review: { max: 'unchanged_or_faster', unit: 'relative', description: 'Time to first review' }
  },
  
  integrity_ops: {
    ghostwriting_refusal_rate: { min: 1.00, unit: 'percent', description: 'Refusal pass rate' },
    refund_delta_vs_baseline: { max: 0.0025, unit: 'pp', description: 'Refund delta vs baseline' },
    refund_absolute_24h: { max: 0.02, unit: 'percent', description: 'Absolute refund rate 24h' },
    p95_latency: { max: 1.5, unit: 'seconds', description: 'P95 latency' },
    runtime_error_rate: { max: 0.01, unit: 'percent', description: 'Runtime error rate' }
  }
};

export const OCA_GUARDRAILS = {
  auto_disable_triggers: [
    {
      trigger: 'provider_complaint',
      threshold: 1,
      action: 'auto_disable_immediately',
      description: 'Any provider complaint triggers auto-disable'
    },
    {
      trigger: 'integrity_violation',
      threshold: 1,
      action: 'auto_disable_immediately',
      description: 'Any confirmed integrity violation triggers auto-disable'
    },
    {
      trigger: 'refund_spike',
      conditions: [
        { metric: 'refund_24h', threshold: 0.02, operator: '>' },
        { metric: 'refund_delta', threshold: 0.0025, operator: '>' }
      ],
      action: 'auto_disable',
      description: 'Refund exceeds 2% 24h OR +0.25pp vs baseline'
    }
  ],
  
  rate_limits: {
    per_student_per_day: 5,
    queue_depth_throttle: {
      threshold: 30,
      duration_minutes: 15,
      action: 'throttle_oca'
    }
  }
};

export const AB_SUCCESS_GATES = {
  ctr_lift_required: 0.10,
  submit_rate_lift_required: 0.05,
  no_increase_refunds: true,
  no_increase_complaints: true,
  min_sample_size: 500
};

export interface OcaMetrics {
  open_rate: number;
  ctr: number;
  modal_completion: number;
  submit_success: number;
  complaint_count: number;
  ghostwriting_refusal_rate: number;
  refund_rate_24h: number;
  refund_baseline: number;
  p95_latency_seconds: number;
  runtime_error_rate: number;
  timestamp: string;
}

export interface AbVariantMetrics {
  variant: 'A' | 'B';
  sample_size: number;
  open_rate: number;
  ctr: number;
  submit_rate: number;
  refund_rate: number;
  complaint_count: number;
}

export function evaluateKpis(metrics: OcaMetrics): {
  passing: boolean;
  results: { kpi: string; value: string; threshold: string; passed: boolean }[];
} {
  const results: { kpi: string; value: string; threshold: string; passed: boolean }[] = [];
  
  results.push({
    kpi: 'Open Rate',
    value: `${(metrics.open_rate * 100).toFixed(1)}%`,
    threshold: `≥${(OCA_KPIS.students.open_rate.min * 100)}%`,
    passed: metrics.open_rate >= OCA_KPIS.students.open_rate.min
  });
  
  results.push({
    kpi: 'CTR',
    value: `${(metrics.ctr * 100).toFixed(1)}%`,
    threshold: `≥${(OCA_KPIS.students.ctr.min * 100)}%`,
    passed: metrics.ctr >= OCA_KPIS.students.ctr.min
  });
  
  results.push({
    kpi: 'Modal Completion',
    value: `${(metrics.modal_completion * 100).toFixed(1)}%`,
    threshold: `≥${(OCA_KPIS.students.modal_completion.min * 100)}%`,
    passed: metrics.modal_completion >= OCA_KPIS.students.modal_completion.min
  });
  
  results.push({
    kpi: 'Submit Success',
    value: `${(metrics.submit_success * 100).toFixed(1)}%`,
    threshold: `≥${(OCA_KPIS.students.submit_success.min * 100)}%`,
    passed: metrics.submit_success >= OCA_KPIS.students.submit_success.min
  });
  
  results.push({
    kpi: 'Provider Complaints',
    value: `${metrics.complaint_count}`,
    threshold: `=${OCA_KPIS.providers.complaint_rate.max}`,
    passed: metrics.complaint_count === OCA_KPIS.providers.complaint_rate.max
  });
  
  results.push({
    kpi: 'Ghostwriting Refusal',
    value: `${(metrics.ghostwriting_refusal_rate * 100).toFixed(0)}%`,
    threshold: `=${(OCA_KPIS.integrity_ops.ghostwriting_refusal_rate.min * 100)}%`,
    passed: metrics.ghostwriting_refusal_rate >= OCA_KPIS.integrity_ops.ghostwriting_refusal_rate.min
  });
  
  results.push({
    kpi: 'Refund Rate 24h',
    value: `${(metrics.refund_rate_24h * 100).toFixed(2)}%`,
    threshold: `<${(OCA_KPIS.integrity_ops.refund_absolute_24h.max * 100)}%`,
    passed: metrics.refund_rate_24h < OCA_KPIS.integrity_ops.refund_absolute_24h.max
  });
  
  const refundDelta = metrics.refund_rate_24h - metrics.refund_baseline;
  results.push({
    kpi: 'Refund Delta',
    value: `+${(refundDelta * 100).toFixed(2)}pp`,
    threshold: `≤+${(OCA_KPIS.integrity_ops.refund_delta_vs_baseline.max * 100)}pp`,
    passed: refundDelta <= OCA_KPIS.integrity_ops.refund_delta_vs_baseline.max
  });
  
  results.push({
    kpi: 'P95 Latency',
    value: `${metrics.p95_latency_seconds.toFixed(2)}s`,
    threshold: `≤${OCA_KPIS.integrity_ops.p95_latency.max}s`,
    passed: metrics.p95_latency_seconds <= OCA_KPIS.integrity_ops.p95_latency.max
  });
  
  results.push({
    kpi: 'Runtime Error Rate',
    value: `${(metrics.runtime_error_rate * 100).toFixed(2)}%`,
    threshold: `<${(OCA_KPIS.integrity_ops.runtime_error_rate.max * 100)}%`,
    passed: metrics.runtime_error_rate < OCA_KPIS.integrity_ops.runtime_error_rate.max
  });
  
  return {
    passing: results.every(r => r.passed),
    results
  };
}

export function evaluateAbWinner(a: AbVariantMetrics, b: AbVariantMetrics): {
  winner: 'A' | 'B' | 'inconclusive';
  reason: string;
} {
  if (a.sample_size < AB_SUCCESS_GATES.min_sample_size || b.sample_size < AB_SUCCESS_GATES.min_sample_size) {
    return { winner: 'inconclusive', reason: 'Insufficient sample size' };
  }
  
  if (a.complaint_count > 0 && b.complaint_count === 0) {
    return { winner: 'B', reason: 'A has complaints, B does not' };
  }
  if (b.complaint_count > 0 && a.complaint_count === 0) {
    return { winner: 'A', reason: 'B has complaints, A does not' };
  }
  
  const ctrLiftAOverB = (a.ctr - b.ctr) / b.ctr;
  const ctrLiftBOverA = (b.ctr - a.ctr) / a.ctr;
  const submitLiftAOverB = (a.submit_rate - b.submit_rate) / b.submit_rate;
  const submitLiftBOverA = (b.submit_rate - a.submit_rate) / a.submit_rate;
  
  const aWins = ctrLiftAOverB >= AB_SUCCESS_GATES.ctr_lift_required && 
                submitLiftAOverB >= AB_SUCCESS_GATES.submit_rate_lift_required &&
                a.refund_rate <= b.refund_rate;
  
  const bWins = ctrLiftBOverA >= AB_SUCCESS_GATES.ctr_lift_required && 
                submitLiftBOverA >= AB_SUCCESS_GATES.submit_rate_lift_required &&
                b.refund_rate <= a.refund_rate;
  
  if (aWins && !bWins) {
    return { winner: 'A', reason: `A: +${(ctrLiftAOverB * 100).toFixed(1)}% CTR, +${(submitLiftAOverB * 100).toFixed(1)}% submit` };
  }
  if (bWins && !aWins) {
    return { winner: 'B', reason: `B: +${(ctrLiftBOverA * 100).toFixed(1)}% CTR, +${(submitLiftBOverA * 100).toFixed(1)}% submit` };
  }
  
  return { winner: 'inconclusive', reason: 'Neither variant meets success gates' };
}

export function generateKpiReport(metrics: OcaMetrics): string {
  const evaluation = evaluateKpis(metrics);
  
  let report = '# One-Click Apply KPI Report\n\n';
  report += `**Timestamp:** ${metrics.timestamp}\n`;
  report += `**Status:** ${evaluation.passing ? '✓ All KPIs Met' : '✗ KPIs Below Threshold'}\n\n`;
  
  report += '| KPI | Value | Threshold | Status |\n';
  report += '|-----|-------|-----------|--------|\n';
  
  for (const result of evaluation.results) {
    const status = result.passed ? '✓' : '✗';
    report += `| ${result.kpi} | ${result.value} | ${result.threshold} | ${status} |\n`;
  }
  
  return report;
}

export async function emitKpiSnapshot(metrics: OcaMetrics): Promise<void> {
  const evaluation = evaluateKpis(metrics);
  
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'oca_kpi_snapshot',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: {
          metrics,
          evaluation,
          status: evaluation.passing ? 'healthy' : 'below_threshold'
        }
      })
    });
  } catch {
    console.log('[OCA KPIs] Failed to emit snapshot');
  }
}
