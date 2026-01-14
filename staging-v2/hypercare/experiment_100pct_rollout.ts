/**
 * Experiment 100% Rollout
 * 
 * CEO Approved: Immediate rollout to 100% traffic
 * - First-Upload UX (sticky resume CTA + prefilled state)
 * - Credit Pack Framing (3-pack anchor)
 */

const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';

export const EXPERIMENT_ROLLOUT = {
  approved_at: new Date().toISOString(),
  authorization: 'CEO-APPROVED',
  rationale: 'Aligns with Playbook V2.0 - first document upload as primary activation',
  
  experiments: {
    first_upload_ux: {
      id: 'exp_first_upload_ux',
      name: 'First-Upload UX Enhancement',
      previous_traffic: 0.10,
      new_traffic: 1.00,
      treatment: {
        sticky_resume_cta: true,
        prefilled_step_state: true
      },
      success_metrics: ['upload_completion_rate', 'credit_conversion'],
      status: 'ROLLED_OUT_100PCT'
    },
    
    credit_pack_framing: {
      id: 'exp_credit_pack_framing',
      name: 'Credit Pack Value Framing',
      previous_traffic: 0.10,
      new_traffic: 1.00,
      markup: '4x',
      treatment: {
        control: '1_pack_baseline',
        winner: 'value_pack_nudge_3_pack_anchor'
      },
      success_metric: 'arpu_lift',
      auto_disable: {
        trigger: 'refund_spike',
        threshold: 0.01,
        window_hours: 24
      },
      status: 'ROLLED_OUT_100PCT'
    }
  }
};

export interface ExperimentMetrics {
  experiment_id: string;
  control_conversion: number;
  treatment_conversion: number;
  lift_percent: number;
  confidence: number;
  sample_size: number;
}

export function generateRolloutReport(): string {
  let report = '# Experiment 100% Rollout Report\n\n';
  report += `**Approved:** ${EXPERIMENT_ROLLOUT.approved_at}\n`;
  report += `**Authorization:** ${EXPERIMENT_ROLLOUT.authorization}\n`;
  report += `**Rationale:** ${EXPERIMENT_ROLLOUT.rationale}\n\n`;
  
  report += '## Experiments\n\n';
  
  const exp1 = EXPERIMENT_ROLLOUT.experiments.first_upload_ux;
  report += `### ${exp1.name}\n`;
  report += `- **ID:** ${exp1.id}\n`;
  report += `- **Traffic:** ${(exp1.previous_traffic * 100)}% → ${(exp1.new_traffic * 100)}%\n`;
  report += `- **Treatment:** Sticky resume CTA + prefilled state\n`;
  report += `- **Metrics:** ${exp1.success_metrics.join(', ')}\n`;
  report += `- **Status:** ${exp1.status}\n\n`;
  
  const exp2 = EXPERIMENT_ROLLOUT.experiments.credit_pack_framing;
  report += `### ${exp2.name}\n`;
  report += `- **ID:** ${exp2.id}\n`;
  report += `- **Traffic:** ${(exp2.previous_traffic * 100)}% → ${(exp2.new_traffic * 100)}%\n`;
  report += `- **Winner:** 3-pack anchor (${exp2.markup} markup retained)\n`;
  report += `- **Metric:** ${exp2.success_metric}\n`;
  report += `- **Auto-disable:** +${(exp2.auto_disable.threshold * 100)}% refund spike in ${exp2.auto_disable.window_hours}h\n`;
  report += `- **Status:** ${exp2.status}\n`;
  
  return report;
}

export async function emitRolloutActivation(): Promise<void> {
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'experiments_rolled_out_100pct',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: EXPERIMENT_ROLLOUT
      })
    });
  } catch {
    console.log('[Experiments] Failed to emit rollout');
  }
}

export async function emitExperimentImpact(metrics: ExperimentMetrics): Promise<void> {
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'experiment_impact',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: metrics
      })
    });
  } catch {
    console.log('[Experiments] Failed to emit impact');
  }
}
