/**
 * One-Click Apply Operational SLOs and Guardrails
 * 
 * Kill-switches for safety, complaints, and refunds
 */

const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';

export const OPERATIONAL_SLOS = {
  performance: {
    p95_latency_seconds: 1.5,
    queue_depth_max: 30,
    breach_window_minutes: 15,
    breach_action: {
      throttle_non_revenue_percent: 50,
      page: ['ops']
    }
  },
  
  refund_guardrail: {
    absolute_threshold_24h: 0.02,
    delta_vs_baseline_pp: 0.0075,
    action: 'auto_revert_one_click_apply'
  },
  
  safety_guardrail: {
    provider_complaints_threshold: 1,
    academic_integrity_violations_threshold: 1,
    action: 'auto_disable_immediately'
  }
};

export const KILL_SWITCHES = {
  provider_complaint: {
    enabled: true,
    threshold: 1,
    window: 'any',
    action: 'hard_block',
    auto_trigger: true
  },
  
  academic_integrity_violation: {
    enabled: true,
    threshold: 1,
    window: 'any',
    action: 'hard_block',
    auto_trigger: true
  },
  
  refund_spike: {
    enabled: true,
    conditions: [
      { metric: 'refund_rate_24h', threshold: 0.02, operator: '>' },
      { metric: 'refund_delta_vs_baseline', threshold: 0.0075, operator: '>' }
    ],
    action: 'auto_revert',
    auto_trigger: true
  },
  
  latency_breach: {
    enabled: true,
    conditions: [
      { metric: 'p95_latency', threshold: 1.5, operator: '>', window_minutes: 15 },
      { metric: 'queue_depth', threshold: 30, operator: '>', window_minutes: 15 }
    ],
    action: 'throttle_50pct',
    auto_trigger: true
  }
};

export interface SloMetrics {
  p95_latency_seconds: number;
  queue_depth: number;
  refund_rate_24h: number;
  refund_baseline: number;
  provider_complaints: number;
  academic_integrity_violations: number;
  timestamp: string;
}

export function evaluateSloBreaches(metrics: SloMetrics): {
  breaches: string[];
  actions: string[];
  kill_switch_triggered: boolean;
} {
  const breaches: string[] = [];
  const actions: string[] = [];
  let kill = false;
  
  if (metrics.p95_latency_seconds > OPERATIONAL_SLOS.performance.p95_latency_seconds) {
    breaches.push(`P95 latency ${metrics.p95_latency_seconds}s > ${OPERATIONAL_SLOS.performance.p95_latency_seconds}s`);
    actions.push('throttle_non_revenue_50pct', 'page_ops');
  }
  
  if (metrics.queue_depth > OPERATIONAL_SLOS.performance.queue_depth_max) {
    breaches.push(`Queue depth ${metrics.queue_depth} > ${OPERATIONAL_SLOS.performance.queue_depth_max}`);
    actions.push('throttle_non_revenue_50pct', 'page_ops');
  }
  
  if (metrics.refund_rate_24h > OPERATIONAL_SLOS.refund_guardrail.absolute_threshold_24h) {
    breaches.push(`Refund rate ${(metrics.refund_rate_24h * 100).toFixed(2)}% > ${(OPERATIONAL_SLOS.refund_guardrail.absolute_threshold_24h * 100)}%`);
    actions.push('auto_revert_one_click_apply');
    kill = true;
  }
  
  const refundDelta = metrics.refund_rate_24h - metrics.refund_baseline;
  if (refundDelta > OPERATIONAL_SLOS.refund_guardrail.delta_vs_baseline_pp) {
    breaches.push(`Refund delta +${(refundDelta * 100).toFixed(2)}pp > +${(OPERATIONAL_SLOS.refund_guardrail.delta_vs_baseline_pp * 100)}pp`);
    actions.push('auto_revert_one_click_apply');
    kill = true;
  }
  
  if (metrics.provider_complaints >= KILL_SWITCHES.provider_complaint.threshold) {
    breaches.push(`Provider complaints ${metrics.provider_complaints} >= ${KILL_SWITCHES.provider_complaint.threshold}`);
    actions.push('hard_block_one_click_apply');
    kill = true;
  }
  
  if (metrics.academic_integrity_violations >= KILL_SWITCHES.academic_integrity_violation.threshold) {
    breaches.push(`Academic integrity violations ${metrics.academic_integrity_violations} >= ${KILL_SWITCHES.academic_integrity_violation.threshold}`);
    actions.push('hard_block_one_click_apply');
    kill = true;
  }
  
  return {
    breaches,
    actions: [...new Set(actions)],
    kill_switch_triggered: kill
  };
}

export async function executeKillSwitch(
  switch_type: keyof typeof KILL_SWITCHES,
  reason: string
): Promise<{ executed: boolean; message: string }> {
  const switchConfig = KILL_SWITCHES[switch_type];
  
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'one_click_apply_kill_switch',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: {
          switch_type,
          action: switchConfig.action,
          reason,
          auto_triggered: switchConfig.auto_trigger
        }
      })
    });
    
    return {
      executed: true,
      message: `Kill switch ${switch_type} executed: ${switchConfig.action}`
    };
  } catch {
    return {
      executed: false,
      message: 'Failed to execute kill switch'
    };
  }
}

export async function emitSloStatus(metrics: SloMetrics): Promise<void> {
  const evaluation = evaluateSloBreaches(metrics);
  
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'one_click_apply_slo_status',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: {
          metrics,
          evaluation,
          status: evaluation.breaches.length === 0 ? 'healthy' : 'breached'
        }
      })
    });
  } catch {
    console.log('[OneClickApply] Failed to emit SLO status');
  }
}

export function generateSloReport(metrics: SloMetrics): string {
  const evaluation = evaluateSloBreaches(metrics);
  
  let report = '# One-Click Apply SLO Report\n\n';
  report += `**Timestamp:** ${metrics.timestamp}\n`;
  report += `**Status:** ${evaluation.breaches.length === 0 ? '✓ Healthy' : '✗ Breached'}\n\n`;
  
  report += '## Performance\n\n';
  report += `| Metric | Current | SLO | Status |\n`;
  report += `|--------|---------|-----|--------|\n`;
  report += `| P95 Latency | ${metrics.p95_latency_seconds}s | ≤${OPERATIONAL_SLOS.performance.p95_latency_seconds}s | ${metrics.p95_latency_seconds <= OPERATIONAL_SLOS.performance.p95_latency_seconds ? '✓' : '✗'} |\n`;
  report += `| Queue Depth | ${metrics.queue_depth} | ≤${OPERATIONAL_SLOS.performance.queue_depth_max} | ${metrics.queue_depth <= OPERATIONAL_SLOS.performance.queue_depth_max ? '✓' : '✗'} |\n\n`;
  
  report += '## Safety\n\n';
  report += `| Metric | Current | Threshold | Status |\n`;
  report += `|--------|---------|-----------|--------|\n`;
  report += `| Refund Rate 24h | ${(metrics.refund_rate_24h * 100).toFixed(2)}% | ≤${(OPERATIONAL_SLOS.refund_guardrail.absolute_threshold_24h * 100)}% | ${metrics.refund_rate_24h <= OPERATIONAL_SLOS.refund_guardrail.absolute_threshold_24h ? '✓' : '✗'} |\n`;
  report += `| Provider Complaints | ${metrics.provider_complaints} | <${KILL_SWITCHES.provider_complaint.threshold} | ${metrics.provider_complaints < KILL_SWITCHES.provider_complaint.threshold ? '✓' : '✗'} |\n`;
  report += `| Integrity Violations | ${metrics.academic_integrity_violations} | <${KILL_SWITCHES.academic_integrity_violation.threshold} | ${metrics.academic_integrity_violations < KILL_SWITCHES.academic_integrity_violation.threshold ? '✓' : '✗'} |\n\n`;
  
  if (evaluation.breaches.length > 0) {
    report += '## Breaches\n\n';
    for (const breach of evaluation.breaches) {
      report += `- ${breach}\n`;
    }
    report += '\n## Actions Required\n\n';
    for (const action of evaluation.actions) {
      report += `- ${action}\n`;
    }
  }
  
  return report;
}
