/**
 * Paid Pilot Step-Up Authorization
 * 
 * Token: CEO-20260114-PAID-PILOT-STEPUP
 * Budget: $150/day → $300/day
 */

const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';

export const STEPUP_CONFIG = {
  token: 'CEO-20260114-PAID-PILOT-STEPUP',
  current_budget_usd: 150,
  target_budget_usd: 300,
  
  conditions: {
    cac_max_usd: 8,
    cac_window: '24h_continuous',
    arpu_7d_cac_multiplier: 1.8,
    refunds_max: 0.04,
    stripe_success_min: 0.985
  }
};

export interface StepUpGateCheck {
  cac_24h_continuous_usd: number;
  arpu_7d_usd: number;
  refund_rate: number;
  stripe_success_rate: number;
}

export function evaluateStepUpEligibility(gates: StepUpGateCheck): {
  eligible: boolean;
  blockers: string[];
  gates_passed: string[];
} {
  const conditions = STEPUP_CONFIG.conditions;
  const blockers: string[] = [];
  const passed: string[] = [];
  
  if (gates.cac_24h_continuous_usd <= conditions.cac_max_usd) {
    passed.push(`CAC $${gates.cac_24h_continuous_usd} ≤ $${conditions.cac_max_usd}`);
  } else {
    blockers.push(`CAC $${gates.cac_24h_continuous_usd} > $${conditions.cac_max_usd} (24h continuous)`);
  }
  
  const arpuCacRatio = gates.cac_24h_continuous_usd > 0 
    ? gates.arpu_7d_usd / gates.cac_24h_continuous_usd 
    : 0;
  
  if (arpuCacRatio >= conditions.arpu_7d_cac_multiplier) {
    passed.push(`ARPU:CAC ${arpuCacRatio.toFixed(2)}× ≥ ${conditions.arpu_7d_cac_multiplier}×`);
  } else {
    blockers.push(`ARPU:CAC ${arpuCacRatio.toFixed(2)}× < ${conditions.arpu_7d_cac_multiplier}× required`);
  }
  
  if (gates.refund_rate <= conditions.refunds_max) {
    passed.push(`Refunds ${(gates.refund_rate * 100).toFixed(1)}% ≤ ${(conditions.refunds_max * 100)}%`);
  } else {
    blockers.push(`Refunds ${(gates.refund_rate * 100).toFixed(1)}% > ${(conditions.refunds_max * 100)}%`);
  }
  
  if (gates.stripe_success_rate >= conditions.stripe_success_min) {
    passed.push(`Stripe ${(gates.stripe_success_rate * 100).toFixed(1)}% ≥ ${(conditions.stripe_success_min * 100)}%`);
  } else {
    blockers.push(`Stripe ${(gates.stripe_success_rate * 100).toFixed(1)}% < ${(conditions.stripe_success_min * 100)}%`);
  }
  
  return {
    eligible: blockers.length === 0,
    blockers,
    gates_passed: passed
  };
}

export async function requestStepUp(gates: StepUpGateCheck): Promise<{
  approved: boolean;
  message: string;
}> {
  const evaluation = evaluateStepUpEligibility(gates);
  
  if (!evaluation.eligible) {
    return {
      approved: false,
      message: `Step-up blocked: ${evaluation.blockers.join('; ')}`
    };
  }
  
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'pilot_stepup_requested',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: {
          token: STEPUP_CONFIG.token,
          current_budget_usd: STEPUP_CONFIG.current_budget_usd,
          target_budget_usd: STEPUP_CONFIG.target_budget_usd,
          gates,
          evaluation
        }
      })
    });
    
    return {
      approved: true,
      message: `Step-up approved: Budget $${STEPUP_CONFIG.current_budget_usd} → $${STEPUP_CONFIG.target_budget_usd}`
    };
  } catch {
    return {
      approved: false,
      message: 'Failed to submit step-up request to A8'
    };
  }
}

export async function consumeStepUpToken(gates: StepUpGateCheck): Promise<void> {
  const evaluation = evaluateStepUpEligibility(gates);
  
  if (!evaluation.eligible) {
    throw new Error(`Cannot consume token: ${evaluation.blockers.join('; ')}`);
  }
  
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'ceo_token_consumed',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: {
          token: STEPUP_CONFIG.token,
          purpose: `Paid pilot budget step-up $${STEPUP_CONFIG.current_budget_usd} → $${STEPUP_CONFIG.target_budget_usd}`,
          consumed_by: 'Orchestrator',
          conditions_verified: gates,
          new_budget_usd: STEPUP_CONFIG.target_budget_usd
        }
      })
    });
  } catch {
    console.log('[StepUp] Failed to log token consumption');
  }
}
