/**
 * One-Click Apply Promotion Criteria
 * 
 * 5% → 10% after 24h canary
 */

const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';

export const PROMOTION_CRITERIA = {
  from_percent: 5,
  to_percent: 10,
  evaluation_window_hours: 24,
  
  integrity: {
    provider_complaints: { max: 0, description: '0 provider complaints' },
    confirmed_violations: { max: 0, description: '0 confirmed integrity violations' }
  },
  
  performance: {
    p95_latency_seconds: { max: 1.5, description: 'P95 ≤ 1.5s' },
    error_rate: { max: 0.01, description: 'Error rate < 1.0%' },
    queue_depth: { max: 30, description: 'Queue depth ≤ 30' }
  },
  
  finance: {
    refund_delta_vs_baseline_pp: { max: 0.0025, description: 'Refunds ≤ baseline +0.25pp' },
    refund_absolute_24h: { max: 0.02, description: 'Refunds < 2.0% 24h' }
  },
  
  provider: {
    acceptance_rate_delta: { min: 0, description: 'Acceptance rate no negative delta vs baseline' }
  },
  
  growth: {
    completion_rate_lift_vs_control: { min: 0.10, description: 'Completion rate lift ≥ +10% vs control' },
    refund_rate_stable: { description: 'Stable refund rates' },
    complaint_rate_stable: { description: 'Stable complaint rates' }
  }
};

export const REPORTING_CADENCE = {
  t_plus_2h: {
    name: 'Initial Health Ping',
    content: ['SLO snapshot', 'Early funnel read'],
    destination: 'A8'
  },
  
  t_plus_6h: {
    name: 'Executive Midpoint Snapshot',
    content: ['Full SLO', 'Funnel metrics', 'A/B performance', 'Any incidents'],
    destination: 'A8 + Executive'
  },
  
  t_plus_24h: {
    name: 'Canary Readout',
    content: ['Full analysis', '10% recommendation', 'A/B winner call', 'Risk assessment'],
    destination: 'A8 + Executive + Stakeholders'
  }
};

export interface PromotionMetrics {
  provider_complaints: number;
  confirmed_violations: number;
  p95_latency_seconds: number;
  error_rate: number;
  queue_depth: number;
  refund_rate_24h: number;
  refund_baseline: number;
  acceptance_rate: number;
  acceptance_rate_baseline: number;
  completion_rate: number;
  completion_rate_control: number;
  timestamp: string;
}

export interface PromotionEvaluation {
  recommended: boolean;
  criteria: { criterion: string; required: string; actual: string; passed: boolean }[];
  blockers: string[];
  summary: string;
}

export function evaluatePromotion(metrics: PromotionMetrics): PromotionEvaluation {
  const criteria: { criterion: string; required: string; actual: string; passed: boolean }[] = [];
  const blockers: string[] = [];
  
  const integrityComplaints = metrics.provider_complaints <= PROMOTION_CRITERIA.integrity.provider_complaints.max;
  criteria.push({
    criterion: 'Provider Complaints',
    required: `≤ ${PROMOTION_CRITERIA.integrity.provider_complaints.max}`,
    actual: `${metrics.provider_complaints}`,
    passed: integrityComplaints
  });
  if (!integrityComplaints) blockers.push('Provider complaints > 0');
  
  const integrityViolations = metrics.confirmed_violations <= PROMOTION_CRITERIA.integrity.confirmed_violations.max;
  criteria.push({
    criterion: 'Integrity Violations',
    required: `≤ ${PROMOTION_CRITERIA.integrity.confirmed_violations.max}`,
    actual: `${metrics.confirmed_violations}`,
    passed: integrityViolations
  });
  if (!integrityViolations) blockers.push('Integrity violations > 0');
  
  const p95Ok = metrics.p95_latency_seconds <= PROMOTION_CRITERIA.performance.p95_latency_seconds.max;
  criteria.push({
    criterion: 'P95 Latency',
    required: `≤ ${PROMOTION_CRITERIA.performance.p95_latency_seconds.max}s`,
    actual: `${metrics.p95_latency_seconds.toFixed(2)}s`,
    passed: p95Ok
  });
  if (!p95Ok) blockers.push(`P95 ${metrics.p95_latency_seconds.toFixed(2)}s > ${PROMOTION_CRITERIA.performance.p95_latency_seconds.max}s`);
  
  const errorOk = metrics.error_rate < PROMOTION_CRITERIA.performance.error_rate.max;
  criteria.push({
    criterion: 'Error Rate',
    required: `< ${(PROMOTION_CRITERIA.performance.error_rate.max * 100)}%`,
    actual: `${(metrics.error_rate * 100).toFixed(2)}%`,
    passed: errorOk
  });
  if (!errorOk) blockers.push(`Error rate ${(metrics.error_rate * 100).toFixed(2)}% >= 1%`);
  
  const queueOk = metrics.queue_depth <= PROMOTION_CRITERIA.performance.queue_depth.max;
  criteria.push({
    criterion: 'Queue Depth',
    required: `≤ ${PROMOTION_CRITERIA.performance.queue_depth.max}`,
    actual: `${metrics.queue_depth}`,
    passed: queueOk
  });
  if (!queueOk) blockers.push(`Queue depth ${metrics.queue_depth} > 30`);
  
  const refundDelta = metrics.refund_rate_24h - metrics.refund_baseline;
  const refundDeltaOk = refundDelta <= PROMOTION_CRITERIA.finance.refund_delta_vs_baseline_pp.max;
  criteria.push({
    criterion: 'Refund Delta',
    required: `≤ +${(PROMOTION_CRITERIA.finance.refund_delta_vs_baseline_pp.max * 100)}pp`,
    actual: `+${(refundDelta * 100).toFixed(2)}pp`,
    passed: refundDeltaOk
  });
  if (!refundDeltaOk) blockers.push(`Refund delta +${(refundDelta * 100).toFixed(2)}pp > +0.25pp`);
  
  const refundAbsOk = metrics.refund_rate_24h < PROMOTION_CRITERIA.finance.refund_absolute_24h.max;
  criteria.push({
    criterion: 'Refund Rate 24h',
    required: `< ${(PROMOTION_CRITERIA.finance.refund_absolute_24h.max * 100)}%`,
    actual: `${(metrics.refund_rate_24h * 100).toFixed(2)}%`,
    passed: refundAbsOk
  });
  if (!refundAbsOk) blockers.push(`Refund rate ${(metrics.refund_rate_24h * 100).toFixed(2)}% >= 2%`);
  
  const acceptanceDelta = metrics.acceptance_rate - metrics.acceptance_rate_baseline;
  const acceptanceOk = acceptanceDelta >= PROMOTION_CRITERIA.provider.acceptance_rate_delta.min;
  criteria.push({
    criterion: 'Acceptance Rate Delta',
    required: `≥ ${PROMOTION_CRITERIA.provider.acceptance_rate_delta.min}`,
    actual: `${acceptanceDelta >= 0 ? '+' : ''}${(acceptanceDelta * 100).toFixed(1)}pp`,
    passed: acceptanceOk
  });
  if (!acceptanceOk) blockers.push(`Acceptance rate delta ${(acceptanceDelta * 100).toFixed(1)}pp < 0`);
  
  const completionLift = metrics.completion_rate_control > 0 
    ? (metrics.completion_rate - metrics.completion_rate_control) / metrics.completion_rate_control 
    : 0;
  const completionOk = completionLift >= PROMOTION_CRITERIA.growth.completion_rate_lift_vs_control.min;
  criteria.push({
    criterion: 'Completion Rate Lift',
    required: `≥ +${(PROMOTION_CRITERIA.growth.completion_rate_lift_vs_control.min * 100)}%`,
    actual: `+${(completionLift * 100).toFixed(1)}%`,
    passed: completionOk
  });
  if (!completionOk) blockers.push(`Completion lift +${(completionLift * 100).toFixed(1)}% < +10%`);
  
  const recommended = blockers.length === 0;
  
  return {
    recommended,
    criteria,
    blockers,
    summary: recommended 
      ? 'All criteria met. Recommend promotion to 10%.'
      : `${blockers.length} blocker(s). Do not promote.`
  };
}

export async function emitReport(
  reportType: keyof typeof REPORTING_CADENCE,
  metrics: Partial<PromotionMetrics>,
  evaluation?: PromotionEvaluation
): Promise<void> {
  const report = REPORTING_CADENCE[reportType];
  
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: `oca_report_${reportType}`,
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: {
          report_name: report.name,
          content_types: report.content,
          metrics,
          evaluation
        }
      })
    });
  } catch {
    console.log(`[OCA Report] Failed to emit ${reportType}`);
  }
}

export function generatePromotionReport(metrics: PromotionMetrics): string {
  const evaluation = evaluatePromotion(metrics);
  
  let md = '# One-Click Apply 10% Promotion Evaluation\n\n';
  md += `**Timestamp:** ${metrics.timestamp}\n`;
  md += `**Recommendation:** ${evaluation.recommended ? '✓ PROMOTE TO 10%' : '✗ DO NOT PROMOTE'}\n\n`;
  
  md += '## Criteria Evaluation\n\n';
  md += '| Criterion | Required | Actual | Status |\n';
  md += '|-----------|----------|--------|--------|\n';
  
  for (const c of evaluation.criteria) {
    const status = c.passed ? '✓' : '✗';
    md += `| ${c.criterion} | ${c.required} | ${c.actual} | ${status} |\n`;
  }
  
  if (evaluation.blockers.length > 0) {
    md += '\n## Blockers\n\n';
    for (const b of evaluation.blockers) {
      md += `- ✗ ${b}\n`;
    }
  }
  
  md += `\n## Summary\n\n${evaluation.summary}\n`;
  
  return md;
}
