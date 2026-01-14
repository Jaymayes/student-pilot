/**
 * Paid Pilot Day 3 Configuration
 * 
 * Budget: $300/day (hold) - Segment rebalancing + experiments
 */

const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';

export const DAY3_PILOT_CONFIG = {
  effective_at: new Date().toISOString(),
  
  budget: {
    daily_max_usd: 300,
    rolling_window: '24h',
    pacing: {
      am: 0.30,
      pm: 0.30,
      evening: 0.40
    }
  },
  
  segment_mix: {
    checkout_abandoners: {
      allocation: 0.60,
      budget_usd: 180,
      auto_pause: null
    },
    upload_abandoners: {
      allocation: 0.30,
      budget_usd: 90,
      auto_pause: null
    },
    essay_transcript_viewers: {
      allocation: 0.10,
      budget_usd: 30,
      auto_pause: {
        trigger: 'cac_breach',
        threshold_usd: 8,
        window_hours: 6
      }
    }
  },
  
  creative_plan: {
    winner: {
      id: 'complete_your_app',
      allocation: 0.70,
      status: 'active'
    },
    challenger: {
      id: 'last_chance_match',
      allocation: 0.20,
      status: 'testing',
      kill_criteria: {
        min_impressions: 500,
        ctr_drop_vs_control: -0.30,
        cac_increase_vs_cohort: 0.25,
        observation_window_hours: 6
      }
    },
    exploratory: {
      id: 'resume_upload_2_clicks',
      copy: 'Resume your upload in 2 clicks',
      allocation: 0.10,
      status: 'new',
      kill_criteria: {
        min_impressions: 500,
        ctr_drop_vs_control: -0.30,
        cac_increase_vs_cohort: 0.25,
        observation_window_hours: 6
      }
    }
  },
  
  experiments: {
    first_upload_ux: {
      id: 'exp_first_upload_ux',
      traffic_percent: 10,
      treatment: 'sticky_resume_cta_prefilled_state',
      control: 'current_flow',
      success_metrics: ['upload_completion_rate', 'credit_conversion'],
      status: 'running'
    },
    credit_pack_framing: {
      id: 'exp_credit_pack_framing',
      traffic_percent: 10,
      markup: '4x',
      variants: {
        control: '1_pack_baseline',
        treatment: 'value_pack_nudge_3_pack_anchor'
      },
      success_metric: 'arpu_lift',
      auto_disable: {
        trigger: 'refund_spike',
        threshold: 0.01,
        window_hours: 24
      },
      status: 'running'
    }
  },
  
  cost_slo_guardrails: {
    analyze_queue: {
      depth_max: 30,
      p95_max_seconds: 1.5,
      breach_window_minutes: 15,
      action: 'throttle_non_revenue_50pct',
      page: ['ops', 'finance']
    },
    platform_spend: {
      projection_max_usd: 300,
      breach_window_hours: 1,
      actions: ['enable_throttle', 'cut_exploratory_creative_0pct']
    }
  },
  
  provider_ops: {
    target_48h: {
      new_providers: 7,
      new_listings: 12
    },
    priority_outreach: 'checkout_abandoning_providers',
    fee_instrumentation: '3%_verified'
  },
  
  scale_criteria: {
    from_usd: 300,
    to_usd: 400,
    conditions: {
      cac_max_usd: 7,
      arpu_7d_cac_multiplier: 2.0,
      refunds_max: 0.03,
      stripe_success_min: 0.985,
      incidents: 0
    },
    window: 'last_24h',
    requires: 'explicit_ceo_authorization'
  }
};

export interface SegmentMetrics {
  segment_id: string;
  spend_usd: number;
  conversions: number;
  cac_usd: number;
  cac_6h_avg_usd: number;
}

export function evaluateSegmentAutoPause(metrics: SegmentMetrics): {
  pause: boolean;
  reason?: string;
} {
  const config = DAY3_PILOT_CONFIG.segment_mix;
  
  if (metrics.segment_id === 'essay_transcript_viewers') {
    const rule = config.essay_transcript_viewers.auto_pause;
    if (rule && metrics.cac_6h_avg_usd > rule.threshold_usd) {
      return {
        pause: true,
        reason: `CAC $${metrics.cac_6h_avg_usd.toFixed(2)} > $${rule.threshold_usd} for 6h`
      };
    }
  }
  
  return { pause: false };
}

export interface CreativeMetrics {
  creative_id: string;
  impressions: number;
  ctr: number;
  cac_usd: number;
}

export function evaluateCreativeKillDay3(
  creative: CreativeMetrics,
  controlCtr: number,
  cohortCacUsd: number
): { kill: boolean; reason?: string } {
  const creativeConfig = creative.creative_id === 'last_chance_match'
    ? DAY3_PILOT_CONFIG.creative_plan.challenger
    : DAY3_PILOT_CONFIG.creative_plan.exploratory;
  
  const criteria = creativeConfig.kill_criteria;
  
  if (creative.impressions < criteria.min_impressions) {
    return { kill: false };
  }
  
  const ctrDrop = (creative.ctr - controlCtr) / controlCtr;
  if (ctrDrop < criteria.ctr_drop_vs_control) {
    return { kill: true, reason: `CTR ${(ctrDrop * 100).toFixed(1)}% vs control` };
  }
  
  const cacIncrease = (creative.cac_usd - cohortCacUsd) / cohortCacUsd;
  if (cacIncrease > criteria.cac_increase_vs_cohort) {
    return { kill: true, reason: `CAC +${(cacIncrease * 100).toFixed(1)}% vs cohort` };
  }
  
  return { kill: false };
}

export interface ExperimentResult {
  experiment_id: string;
  control_value: number;
  treatment_value: number;
  lift: number;
  significant: boolean;
  refund_delta?: number;
}

export function evaluateExperimentAutoDisable(
  result: ExperimentResult
): { disable: boolean; reason?: string } {
  if (result.experiment_id === 'exp_credit_pack_framing') {
    const rule = DAY3_PILOT_CONFIG.experiments.credit_pack_framing.auto_disable;
    if (result.refund_delta && result.refund_delta >= rule.threshold) {
      return {
        disable: true,
        reason: `Refund spike +${(result.refund_delta * 100).toFixed(1)}% >= +${(rule.threshold * 100)}%`
      };
    }
  }
  return { disable: false };
}

export function evaluateScaleEligibility(metrics: {
  cac_24h_usd: number;
  arpu_7d_usd: number;
  refund_rate: number;
  stripe_success: number;
  incidents: number;
}): { eligible: boolean; blockers: string[]; evidence: string[] } {
  const criteria = DAY3_PILOT_CONFIG.scale_criteria.conditions;
  const blockers: string[] = [];
  const evidence: string[] = [];
  
  if (metrics.cac_24h_usd <= criteria.cac_max_usd) {
    evidence.push(`CAC $${metrics.cac_24h_usd.toFixed(2)} ≤ $${criteria.cac_max_usd}`);
  } else {
    blockers.push(`CAC $${metrics.cac_24h_usd.toFixed(2)} > $${criteria.cac_max_usd}`);
  }
  
  const arpuCacRatio = metrics.cac_24h_usd > 0 ? metrics.arpu_7d_usd / metrics.cac_24h_usd : 0;
  if (arpuCacRatio >= criteria.arpu_7d_cac_multiplier) {
    evidence.push(`ARPU:CAC ${arpuCacRatio.toFixed(2)}× ≥ ${criteria.arpu_7d_cac_multiplier}×`);
  } else {
    blockers.push(`ARPU:CAC ${arpuCacRatio.toFixed(2)}× < ${criteria.arpu_7d_cac_multiplier}×`);
  }
  
  if (metrics.refund_rate <= criteria.refunds_max) {
    evidence.push(`Refunds ${(metrics.refund_rate * 100).toFixed(1)}% ≤ ${(criteria.refunds_max * 100)}%`);
  } else {
    blockers.push(`Refunds ${(metrics.refund_rate * 100).toFixed(1)}% > ${(criteria.refunds_max * 100)}%`);
  }
  
  if (metrics.stripe_success >= criteria.stripe_success_min) {
    evidence.push(`Stripe ${(metrics.stripe_success * 100).toFixed(1)}% ≥ ${(criteria.stripe_success_min * 100)}%`);
  } else {
    blockers.push(`Stripe ${(metrics.stripe_success * 100).toFixed(1)}% < ${(criteria.stripe_success_min * 100)}%`);
  }
  
  if (metrics.incidents === criteria.incidents) {
    evidence.push(`Incidents: ${metrics.incidents}`);
  } else {
    blockers.push(`Incidents: ${metrics.incidents} > ${criteria.incidents}`);
  }
  
  return {
    eligible: blockers.length === 0,
    blockers,
    evidence
  };
}

export async function emitDay3Config(): Promise<void> {
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'paid_pilot_day3_activated',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: DAY3_PILOT_CONFIG
      })
    });
  } catch {
    console.log('[Day3Pilot] Failed to emit config');
  }
}

export async function emitSegmentPause(segment: string, reason: string): Promise<void> {
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'segment_auto_paused',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: { segment, reason }
      })
    });
  } catch {
    console.log('[Day3Pilot] Failed to emit segment pause');
  }
}

export async function emitExperimentUpdate(result: ExperimentResult): Promise<void> {
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'experiment_update',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: result
      })
    });
  } catch {
    console.log('[Day3Pilot] Failed to emit experiment update');
  }
}
