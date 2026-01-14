/**
 * Paid Pilot Day 2 Configuration
 * 
 * Step-Up Token Consumed: CEO-20260114-PAID-PILOT-STEPUP
 * Budget: $300/day (rolling 24h) - Retargeting Only
 */

const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';

export const DAY2_PILOT_CONFIG = {
  stepup_token_consumed: 'CEO-20260114-PAID-PILOT-STEPUP',
  
  budget: {
    daily_max_usd: 300,
    rolling_window: '24h',
    pacing: {
      am: 0.30,
      pm: 0.30,
      evening: 0.40
    }
  },
  
  auto_downshift: {
    trigger_budget_usd: 150,
    window: '6h_moving_average',
    conditions: {
      cac_breach_usd: 10,
      stripe_success_min: 0.985,
      stripe_breach_duration_min: 30,
      fraud_max: 0.005,
      refund_rate_max: 0.04
    }
  },
  
  targeting: {
    segments: [
      { id: 'first_upload_abandoners', priority: 1 },
      { id: 'checkout_cart_abandoners', priority: 2 },
      { id: 'high_intent_essay_transcript_viewers', priority: 3 }
    ],
    frequency_caps: {
      impressions_per_day: 3,
      impressions_per_week: 7,
      converter_suppression_days: 14
    },
    channel: 'retargeting_only',
    prospecting: false
  },
  
  creative_test: {
    budget_mix: {
      winner: 0.70,
      challenger: 0.20,
      exploratory: 0.10
    },
    kill_criteria: {
      min_impressions: 500,
      ctr_drop_vs_control: -0.30,
      cac_increase_vs_cohort: 0.25,
      observation_window_hours: 6
    },
    landing_flows: ['first_upload', 'credit_gate'],
    required_events: ['upload_started', 'upload_completed', 'credit_purchase']
  },
  
  compliance: {
    minors_do_not_sell: true,
    pii_in_logs: false,
    api_key_enforcement: 'daily_verification',
    refund_p50_target_seconds: 30,
    disputes_max: 0,
    fraud_max: 0.005
  },
  
  forecast: {
    cac_target_usd: 8,
    arpu_target_usd: 25,
    daily_purchases_low: 37,
    daily_purchases_high: 40,
    daily_gross_b2c_low_usd: 930,
    daily_gross_b2c_high_usd: 1000,
    monthly_net_b2c_low_usd: 28000,
    monthly_net_b2c_high_usd: 30000
  }
};

export interface MovingAverageMetrics {
  cac_6h_avg_usd: number;
  stripe_success_rate: number;
  stripe_breach_minutes: number;
  fraud_rate: number;
  refund_rate: number;
}

export function evaluateAutoDownshift(metrics: MovingAverageMetrics): {
  downshift: boolean;
  triggers: string[];
} {
  const triggers: string[] = [];
  const config = DAY2_PILOT_CONFIG.auto_downshift.conditions;
  
  if (metrics.cac_6h_avg_usd > config.cac_breach_usd) {
    triggers.push(`CAC ${metrics.cac_6h_avg_usd.toFixed(2)} > $${config.cac_breach_usd}`);
  }
  
  if (metrics.stripe_success_rate < config.stripe_success_min && 
      metrics.stripe_breach_minutes >= config.stripe_breach_duration_min) {
    triggers.push(`Stripe ${(metrics.stripe_success_rate * 100).toFixed(1)}% < ${(config.stripe_success_min * 100)}% for ${metrics.stripe_breach_minutes}min`);
  }
  
  if (metrics.fraud_rate >= config.fraud_max) {
    triggers.push(`Fraud ${(metrics.fraud_rate * 100).toFixed(2)}% >= ${(config.fraud_max * 100)}%`);
  }
  
  if (metrics.refund_rate >= config.refund_rate_max) {
    triggers.push(`Refunds ${(metrics.refund_rate * 100).toFixed(1)}% >= ${(config.refund_rate_max * 100)}%`);
  }
  
  return {
    downshift: triggers.length > 0,
    triggers
  };
}

export interface CreativePerformance {
  creative_id: string;
  impressions: number;
  ctr: number;
  cac_usd: number;
}

export function evaluateCreativeKill(
  creative: CreativePerformance,
  controlCtr: number,
  cohortCacUsd: number
): { kill: boolean; reason?: string } {
  const criteria = DAY2_PILOT_CONFIG.creative_test.kill_criteria;
  
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

export interface PacingState {
  period: 'am' | 'pm' | 'evening';
  period_budget_usd: number;
  period_spent_usd: number;
  utilization: number;
}

export function calculatePacing(currentHour: number, totalSpentTodayUsd: number): PacingState {
  const budget = DAY2_PILOT_CONFIG.budget;
  
  let period: 'am' | 'pm' | 'evening';
  let periodBudget: number;
  let expectedSpent: number;
  
  if (currentHour < 12) {
    period = 'am';
    periodBudget = budget.daily_max_usd * budget.pacing.am;
    expectedSpent = periodBudget * (currentHour / 12);
  } else if (currentHour < 18) {
    period = 'pm';
    periodBudget = budget.daily_max_usd * budget.pacing.pm;
    expectedSpent = (budget.daily_max_usd * budget.pacing.am) + 
                    (periodBudget * ((currentHour - 12) / 6));
  } else {
    period = 'evening';
    periodBudget = budget.daily_max_usd * budget.pacing.evening;
    expectedSpent = (budget.daily_max_usd * (budget.pacing.am + budget.pacing.pm)) + 
                    (periodBudget * ((currentHour - 18) / 6));
  }
  
  return {
    period,
    period_budget_usd: periodBudget,
    period_spent_usd: totalSpentTodayUsd,
    utilization: expectedSpent > 0 ? totalSpentTodayUsd / expectedSpent : 0
  };
}

export async function emitDay2Status(
  metrics: MovingAverageMetrics,
  pacing: PacingState,
  downshiftEval: { downshift: boolean; triggers: string[] }
): Promise<void> {
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'paid_pilot_day2_status',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: {
          config: DAY2_PILOT_CONFIG,
          metrics,
          pacing,
          downshift_evaluation: downshiftEval
        }
      })
    });
  } catch {
    console.log('[Day2Pilot] Failed to emit status');
  }
}

export async function emitCreativeDecision(
  creative: CreativePerformance,
  decision: { kill: boolean; reason?: string }
): Promise<void> {
  if (!decision.kill) return;
  
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'creative_killed',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: { creative, reason: decision.reason }
      })
    });
  } catch {
    console.log('[Day2Pilot] Failed to emit creative decision');
  }
}
