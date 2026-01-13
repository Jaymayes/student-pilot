/**
 * Revenue Guardrails for Phase 2 (25% Traffic)
 * 
 * CFO Authorization: CFO-20260114-STRIPE-LIVE-25
 */

export const REVENUE_GUARDRAILS = {
  per_user_daily_cap_usd: 50,
  global_daily_cap_usd: 1500,
  max_single_charge_usd: 49,
  
  provider_payouts: 'simulation_only' as const,
  
  auto_refund_on_failure: true,
  webhook_retry_backoff: {
    initial_delay_ms: 1000,
    max_delay_ms: 60000,
    multiplier: 2,
    max_retries: 5
  }
};

export interface ChargeAttempt {
  user_id: string;
  amount_cents: number;
  timestamp: string;
}

export interface DailyLimits {
  user_totals: Map<string, number>;
  global_total: number;
  date: string;
}

const dailyLimits: DailyLimits = {
  user_totals: new Map(),
  global_total: 0,
  date: new Date().toISOString().split('T')[0]
};

function resetIfNewDay(): void {
  const today = new Date().toISOString().split('T')[0];
  if (dailyLimits.date !== today) {
    dailyLimits.user_totals.clear();
    dailyLimits.global_total = 0;
    dailyLimits.date = today;
  }
}

export function validateCharge(attempt: ChargeAttempt): {
  allowed: boolean;
  reason?: string;
} {
  resetIfNewDay();
  
  const amountUsd = attempt.amount_cents / 100;
  
  if (amountUsd > REVENUE_GUARDRAILS.max_single_charge_usd) {
    return {
      allowed: false,
      reason: `Single charge $${amountUsd} exceeds max $${REVENUE_GUARDRAILS.max_single_charge_usd}`
    };
  }
  
  const userTotal = (dailyLimits.user_totals.get(attempt.user_id) || 0) + amountUsd;
  if (userTotal > REVENUE_GUARDRAILS.per_user_daily_cap_usd) {
    return {
      allowed: false,
      reason: `User daily total $${userTotal} would exceed cap $${REVENUE_GUARDRAILS.per_user_daily_cap_usd}`
    };
  }
  
  const globalTotal = dailyLimits.global_total + amountUsd;
  if (globalTotal > REVENUE_GUARDRAILS.global_daily_cap_usd) {
    return {
      allowed: false,
      reason: `Global daily total $${globalTotal} would exceed cap $${REVENUE_GUARDRAILS.global_daily_cap_usd}`
    };
  }
  
  return { allowed: true };
}

export function recordCharge(attempt: ChargeAttempt): void {
  resetIfNewDay();
  const amountUsd = attempt.amount_cents / 100;
  
  const currentUserTotal = dailyLimits.user_totals.get(attempt.user_id) || 0;
  dailyLimits.user_totals.set(attempt.user_id, currentUserTotal + amountUsd);
  dailyLimits.global_total += amountUsd;
}

export function getDailyStats(): {
  global_total_usd: number;
  global_cap_usd: number;
  utilization_percent: number;
  unique_users: number;
} {
  resetIfNewDay();
  return {
    global_total_usd: dailyLimits.global_total,
    global_cap_usd: REVENUE_GUARDRAILS.global_daily_cap_usd,
    utilization_percent: (dailyLimits.global_total / REVENUE_GUARDRAILS.global_daily_cap_usd) * 100,
    unique_users: dailyLimits.user_totals.size
  };
}

export interface WebhookRetryState {
  attempt: number;
  next_retry_ms: number;
  exhausted: boolean;
}

export function calculateWebhookRetry(currentAttempt: number): WebhookRetryState {
  const config = REVENUE_GUARDRAILS.webhook_retry_backoff;
  
  if (currentAttempt >= config.max_retries) {
    return { attempt: currentAttempt, next_retry_ms: 0, exhausted: true };
  }
  
  const delay = Math.min(
    config.initial_delay_ms * Math.pow(config.multiplier, currentAttempt),
    config.max_delay_ms
  );
  
  return {
    attempt: currentAttempt,
    next_retry_ms: delay,
    exhausted: false
  };
}
