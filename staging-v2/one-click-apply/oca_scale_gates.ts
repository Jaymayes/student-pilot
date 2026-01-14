/**
 * One-Click Apply Scale Gates
 * 
 * 10% → 25% promotion criteria (pre-declared)
 */

const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';

export const SCALE_GATES = {
  '5_to_10': {
    from_percent: 5,
    to_percent: 10,
    evaluation_window_hours: 24,
    requires_ceo_approval: false,
    token: 'CEO-20260119-OCA-PROMOTE-10PCT-PREAUTH',
    criteria: {
      integrity: { complaints: 0, violations: 0 },
      performance: { p95_max: 1.5, error_max: 0.01 },
      finance: { refund_max: 0.02, refund_delta_max_pp: 0.0025 },
      growth: { completion_lift_min: 0.10 },
      provider: { acceptance_delta_min: 0 }
    }
  },
  
  '10_to_25': {
    from_percent: 10,
    to_percent: 25,
    evaluation_window_hours: 36,
    requires_ceo_approval: true,
    brief_required: true,
    criteria: {
      performance: {
        p95_last_6h_max: 1.2,
        error_max: 0.007,
        description: 'P95 ≤1.2s for last 6h, error <0.7%'
      },
      growth: {
        completion_lift_vs_control_min: 0.12,
        description: '≥+12% completion lift vs control'
      },
      provider: {
        acceptance_vs_baseline_min: 0,
        description: 'Provider acceptance ≥ baseline'
      },
      cost: {
        cost_per_completion_within_margin: true,
        description: 'Cost-per-completion within target margin window'
      }
    }
  }
};

export const SUCCESS_TARGETS = {
  canary_5pct: {
    completion_lift_vs_control: 0.10,
    provider_acceptance: 'neutral_to_positive',
    refund_rate_max: 0.02,
    cost_per_completed_supports_scale: true
  }
};

export interface ScaleMetrics10to25 {
  p95_last_6h: number;
  error_rate: number;
  completion_rate: number;
  completion_rate_control: number;
  provider_acceptance: number;
  provider_acceptance_baseline: number;
  cost_per_completion: number;
  cost_per_completion_target: number;
  timestamp: string;
}

export interface ScaleEvaluation {
  scale_gate: '10_to_25';
  eligible: boolean;
  criteria_results: { criterion: string; required: string; actual: string; passed: boolean }[];
  blockers: string[];
  brief_due_at: string;
}

export function evaluate10to25(metrics: ScaleMetrics10to25): ScaleEvaluation {
  const gate = SCALE_GATES['10_to_25'];
  const results: { criterion: string; required: string; actual: string; passed: boolean }[] = [];
  const blockers: string[] = [];
  
  const p95Ok = metrics.p95_last_6h <= gate.criteria.performance.p95_last_6h_max;
  results.push({
    criterion: 'P95 (last 6h)',
    required: `≤${gate.criteria.performance.p95_last_6h_max}s`,
    actual: `${metrics.p95_last_6h.toFixed(2)}s`,
    passed: p95Ok
  });
  if (!p95Ok) blockers.push(`P95 ${metrics.p95_last_6h.toFixed(2)}s > 1.2s`);
  
  const errorOk = metrics.error_rate < gate.criteria.performance.error_max;
  results.push({
    criterion: 'Error Rate',
    required: `<${(gate.criteria.performance.error_max * 100).toFixed(1)}%`,
    actual: `${(metrics.error_rate * 100).toFixed(2)}%`,
    passed: errorOk
  });
  if (!errorOk) blockers.push(`Error ${(metrics.error_rate * 100).toFixed(2)}% >= 0.7%`);
  
  const completionLift = metrics.completion_rate_control > 0
    ? (metrics.completion_rate - metrics.completion_rate_control) / metrics.completion_rate_control
    : 0;
  const completionOk = completionLift >= gate.criteria.growth.completion_lift_vs_control_min;
  results.push({
    criterion: 'Completion Lift vs Control',
    required: `≥+${(gate.criteria.growth.completion_lift_vs_control_min * 100)}%`,
    actual: `+${(completionLift * 100).toFixed(1)}%`,
    passed: completionOk
  });
  if (!completionOk) blockers.push(`Completion lift +${(completionLift * 100).toFixed(1)}% < +12%`);
  
  const acceptanceDelta = metrics.provider_acceptance - metrics.provider_acceptance_baseline;
  const acceptanceOk = acceptanceDelta >= gate.criteria.provider.acceptance_vs_baseline_min;
  results.push({
    criterion: 'Provider Acceptance',
    required: `≥ baseline`,
    actual: `${acceptanceDelta >= 0 ? '+' : ''}${(acceptanceDelta * 100).toFixed(1)}pp`,
    passed: acceptanceOk
  });
  if (!acceptanceOk) blockers.push(`Acceptance ${(acceptanceDelta * 100).toFixed(1)}pp < 0`);
  
  const costMargin = metrics.cost_per_completion <= metrics.cost_per_completion_target * 1.1;
  results.push({
    criterion: 'Cost per Completion',
    required: `≤$${metrics.cost_per_completion_target.toFixed(2)} (+10% margin)`,
    actual: `$${metrics.cost_per_completion.toFixed(2)}`,
    passed: costMargin
  });
  if (!costMargin) blockers.push(`Cost $${metrics.cost_per_completion.toFixed(2)} exceeds target margin`);
  
  const briefDue = new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString();
  
  return {
    scale_gate: '10_to_25',
    eligible: blockers.length === 0,
    criteria_results: results,
    blockers,
    brief_due_at: briefDue
  };
}

export async function emitScaleEvaluation(evaluation: ScaleEvaluation, metrics: ScaleMetrics10to25): Promise<void> {
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'oca_scale_evaluation',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: {
          evaluation,
          metrics,
          next_gate: evaluation.eligible ? '25%' : 'hold_at_10%'
        }
      })
    });
  } catch {
    console.log('[OCA Scale] Failed to emit evaluation');
  }
}

export function generatePromotionBrief(metrics: ScaleMetrics10to25, evaluation: ScaleEvaluation): string {
  let md = '# OCA 10% → 25% Promotion Brief\n\n';
  md += `**Generated:** ${new Date().toISOString()}\n`;
  md += `**Eligibility:** ${evaluation.eligible ? '✓ ELIGIBLE' : '✗ NOT ELIGIBLE'}\n\n`;
  
  md += '## Criteria Evaluation\n\n';
  md += '| Criterion | Required | Actual | Status |\n';
  md += '|-----------|----------|--------|--------|\n';
  
  for (const c of evaluation.criteria_results) {
    md += `| ${c.criterion} | ${c.required} | ${c.actual} | ${c.passed ? '✓' : '✗'} |\n`;
  }
  
  if (evaluation.blockers.length > 0) {
    md += '\n## Blockers\n\n';
    for (const b of evaluation.blockers) {
      md += `- ✗ ${b}\n`;
    }
  }
  
  md += '\n## Metrics Summary\n\n';
  md += `- P95 (last 6h): ${metrics.p95_last_6h.toFixed(2)}s\n`;
  md += `- Error Rate: ${(metrics.error_rate * 100).toFixed(2)}%\n`;
  md += `- Completion Rate: ${(metrics.completion_rate * 100).toFixed(1)}%\n`;
  md += `- Control Completion: ${(metrics.completion_rate_control * 100).toFixed(1)}%\n`;
  md += `- Provider Acceptance: ${(metrics.provider_acceptance * 100).toFixed(1)}%\n`;
  md += `- Cost per Completion: $${metrics.cost_per_completion.toFixed(2)}\n`;
  
  md += '\n## Recommendation\n\n';
  if (evaluation.eligible) {
    md += '**PROMOTE TO 25%** - All criteria met. Recommend CEO approval.\n';
  } else {
    md += `**HOLD AT 10%** - ${evaluation.blockers.length} blocker(s) require attention.\n`;
  }
  
  return md;
}
