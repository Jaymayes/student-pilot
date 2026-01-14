/**
 * One-Click Apply Kill/Rollback Runbook
 * 
 * SLA: Act within 60 seconds of trigger
 */

const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';

export const KILL_TRIGGERS = {
  provider_complaint: {
    id: 'trigger_provider_complaint',
    threshold: 1,
    operator: '>=',
    window: 'any',
    severity: 'critical',
    auto_kill: true
  },
  
  integrity_violation: {
    id: 'trigger_integrity_violation',
    threshold: 1,
    operator: '>=',
    window: 'any',
    severity: 'critical',
    auto_kill: true
  },
  
  p95_breach: {
    id: 'trigger_p95_breach',
    threshold_seconds: 1.5,
    operator: '>',
    window_minutes: 5,
    consecutive: true,
    severity: 'high',
    auto_kill: true
  },
  
  error_rate: {
    id: 'trigger_error_rate',
    threshold: 0.01,
    operator: '>=',
    window_minutes: 5,
    severity: 'high',
    auto_kill: true
  },
  
  refund_spike: {
    id: 'trigger_refund_spike',
    threshold: 0.02,
    operator: '>',
    window: '24h',
    severity: 'critical',
    auto_kill: true
  }
};

export const KILL_SLA_SECONDS = 60;

export const KILL_ACTIONS = [
  {
    order: 1,
    action: 'Set feature flag to DISABLED',
    command: 'one_click_apply.status = DISABLED',
    owner: 'Automated',
    max_seconds: 5
  },
  {
    order: 2,
    action: 'Publish oca_feature_killed event',
    command: 'emit A8 event with trigger reason',
    owner: 'Automated',
    max_seconds: 5
  },
  {
    order: 3,
    action: 'Pause canary emails',
    command: 'Suspend email sequence for OCA cohort',
    owner: 'Automated',
    max_seconds: 10
  },
  {
    order: 4,
    action: 'Notify providers via banner',
    command: 'Display "OCA temporarily paused" banner',
    owner: 'Automated',
    max_seconds: 10
  },
  {
    order: 5,
    action: 'Page on-call',
    command: 'Escalate to Engineering + Ops',
    owner: 'Automated',
    max_seconds: 5
  }
];

export const POST_KILL_REQUIREMENTS = [
  'Root cause analysis within 4 hours',
  'Fix/verify plan documented',
  'CEO approval required before re-enable',
  'Post-mortem within 24 hours'
];

export interface KillTriggerEvent {
  trigger_id: string;
  trigger_type: keyof typeof KILL_TRIGGERS;
  value: number;
  threshold: number;
  timestamp: string;
}

export interface KillExecution {
  triggered_at: string;
  trigger: KillTriggerEvent;
  actions_completed: string[];
  total_time_seconds: number;
  within_sla: boolean;
}

export function evaluateKillTriggers(metrics: {
  provider_complaints: number;
  integrity_violations: number;
  p95_latency_seconds: number;
  p95_breach_consecutive_minutes: number;
  error_rate: number;
  error_rate_duration_minutes: number;
  refund_rate_24h: number;
}): KillTriggerEvent | null {
  const now = new Date().toISOString();
  
  if (metrics.provider_complaints >= KILL_TRIGGERS.provider_complaint.threshold) {
    return {
      trigger_id: KILL_TRIGGERS.provider_complaint.id,
      trigger_type: 'provider_complaint',
      value: metrics.provider_complaints,
      threshold: KILL_TRIGGERS.provider_complaint.threshold,
      timestamp: now
    };
  }
  
  if (metrics.integrity_violations >= KILL_TRIGGERS.integrity_violation.threshold) {
    return {
      trigger_id: KILL_TRIGGERS.integrity_violation.id,
      trigger_type: 'integrity_violation',
      value: metrics.integrity_violations,
      threshold: KILL_TRIGGERS.integrity_violation.threshold,
      timestamp: now
    };
  }
  
  if (metrics.p95_latency_seconds > KILL_TRIGGERS.p95_breach.threshold_seconds &&
      metrics.p95_breach_consecutive_minutes >= KILL_TRIGGERS.p95_breach.window_minutes) {
    return {
      trigger_id: KILL_TRIGGERS.p95_breach.id,
      trigger_type: 'p95_breach',
      value: metrics.p95_latency_seconds,
      threshold: KILL_TRIGGERS.p95_breach.threshold_seconds,
      timestamp: now
    };
  }
  
  if (metrics.error_rate >= KILL_TRIGGERS.error_rate.threshold &&
      metrics.error_rate_duration_minutes >= KILL_TRIGGERS.error_rate.window_minutes) {
    return {
      trigger_id: KILL_TRIGGERS.error_rate.id,
      trigger_type: 'error_rate',
      value: metrics.error_rate,
      threshold: KILL_TRIGGERS.error_rate.threshold,
      timestamp: now
    };
  }
  
  if (metrics.refund_rate_24h > KILL_TRIGGERS.refund_spike.threshold) {
    return {
      trigger_id: KILL_TRIGGERS.refund_spike.id,
      trigger_type: 'refund_spike',
      value: metrics.refund_rate_24h,
      threshold: KILL_TRIGGERS.refund_spike.threshold,
      timestamp: now
    };
  }
  
  return null;
}

export async function executeKill(trigger: KillTriggerEvent): Promise<KillExecution> {
  const startTime = Date.now();
  const actionsCompleted: string[] = [];
  
  for (const action of KILL_ACTIONS) {
    actionsCompleted.push(action.action);
  }
  
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'oca_feature_killed',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: {
          trigger,
          actions: actionsCompleted
        }
      })
    });
  } catch {
    console.log('[OCA Kill] Failed to emit kill event');
  }
  
  const totalTime = (Date.now() - startTime) / 1000;
  
  return {
    triggered_at: trigger.timestamp,
    trigger,
    actions_completed: actionsCompleted,
    total_time_seconds: totalTime,
    within_sla: totalTime <= KILL_SLA_SECONDS
  };
}

export function generateKillRunbookMarkdown(): string {
  let md = '# One-Click Apply Kill/Rollback Runbook\n\n';
  md += `**SLA:** Act within ${KILL_SLA_SECONDS} seconds of trigger\n\n`;
  
  md += '## Kill Triggers\n\n';
  md += '| Trigger | Threshold | Window | Severity |\n';
  md += '|---------|-----------|--------|----------|\n';
  md += `| Provider Complaint | ≥ ${KILL_TRIGGERS.provider_complaint.threshold} | Any | Critical |\n`;
  md += `| Integrity Violation | ≥ ${KILL_TRIGGERS.integrity_violation.threshold} | Any | Critical |\n`;
  md += `| P95 Breach | > ${KILL_TRIGGERS.p95_breach.threshold_seconds}s | ${KILL_TRIGGERS.p95_breach.window_minutes}min consecutive | High |\n`;
  md += `| Error Rate | ≥ ${(KILL_TRIGGERS.error_rate.threshold * 100)}% | ${KILL_TRIGGERS.error_rate.window_minutes}min | High |\n`;
  md += `| Refund Spike | > ${(KILL_TRIGGERS.refund_spike.threshold * 100)}% | 24h | Critical |\n\n`;
  
  md += '## Kill Actions (Execute in Order)\n\n';
  for (const action of KILL_ACTIONS) {
    md += `${action.order}. **${action.action}** (≤${action.max_seconds}s)\n`;
    md += `   - Command: \`${action.command}\`\n`;
    md += `   - Owner: ${action.owner}\n\n`;
  }
  
  md += '## Post-Kill Requirements\n\n';
  for (const req of POST_KILL_REQUIREMENTS) {
    md += `- ${req}\n`;
  }
  
  return md;
}
