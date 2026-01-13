/**
 * Phase 3 Provider Payout Configuration
 * 
 * CEO Authorization: HITL-CEO-20260114-CANARY-PH3
 * Staged limits for controlled rollout
 */

const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';

export const PROVIDER_PAYOUT_LIMITS = {
  per_provider_daily_cap_usd: 100,
  global_daily_cap_usd: 1000,
  rolling_holdback_percent: 10,
  
  anomaly_thresholds: {
    refund_rate_max: 0.01,
    dispute_rate_max: 0.01
  },
  
  auto_pause_on_anomaly: true,
  manual_review_required: true
};

export interface ProviderPayoutState {
  provider_id: string;
  daily_total_usd: number;
  holdback_usd: number;
  released_usd: number;
  refund_count: number;
  dispute_count: number;
  transaction_count: number;
  status: 'active' | 'paused' | 'under_review';
}

export interface GlobalPayoutState {
  date: string;
  providers: Map<string, ProviderPayoutState>;
  global_total_usd: number;
  global_holdback_usd: number;
}

const globalState: GlobalPayoutState = {
  date: new Date().toISOString().split('T')[0],
  providers: new Map(),
  global_total_usd: 0,
  global_holdback_usd: 0
};

function resetIfNewDay(): void {
  const today = new Date().toISOString().split('T')[0];
  if (globalState.date !== today) {
    globalState.providers.clear();
    globalState.global_total_usd = 0;
    globalState.global_holdback_usd = 0;
    globalState.date = today;
  }
}

function getOrCreateProvider(providerId: string): ProviderPayoutState {
  resetIfNewDay();
  
  if (!globalState.providers.has(providerId)) {
    globalState.providers.set(providerId, {
      provider_id: providerId,
      daily_total_usd: 0,
      holdback_usd: 0,
      released_usd: 0,
      refund_count: 0,
      dispute_count: 0,
      transaction_count: 0,
      status: 'active'
    });
  }
  
  return globalState.providers.get(providerId)!;
}

export function validatePayout(providerId: string, amountUsd: number): {
  allowed: boolean;
  reason?: string;
  holdback_usd?: number;
} {
  resetIfNewDay();
  const provider = getOrCreateProvider(providerId);
  
  if (provider.status === 'paused') {
    return { allowed: false, reason: 'Provider paused due to anomaly' };
  }
  
  if (provider.status === 'under_review') {
    return { allowed: false, reason: 'Provider under manual review' };
  }
  
  const newProviderTotal = provider.daily_total_usd + amountUsd;
  if (newProviderTotal > PROVIDER_PAYOUT_LIMITS.per_provider_daily_cap_usd) {
    return { 
      allowed: false, 
      reason: `Provider daily cap exceeded: $${newProviderTotal} > $${PROVIDER_PAYOUT_LIMITS.per_provider_daily_cap_usd}` 
    };
  }
  
  const newGlobalTotal = globalState.global_total_usd + amountUsd;
  if (newGlobalTotal > PROVIDER_PAYOUT_LIMITS.global_daily_cap_usd) {
    return { 
      allowed: false, 
      reason: `Global daily cap exceeded: $${newGlobalTotal} > $${PROVIDER_PAYOUT_LIMITS.global_daily_cap_usd}` 
    };
  }
  
  const holdback = amountUsd * (PROVIDER_PAYOUT_LIMITS.rolling_holdback_percent / 100);
  
  return { 
    allowed: true, 
    holdback_usd: holdback 
  };
}

export function recordPayout(providerId: string, amountUsd: number, holdbackUsd: number): void {
  resetIfNewDay();
  const provider = getOrCreateProvider(providerId);
  
  provider.daily_total_usd += amountUsd;
  provider.holdback_usd += holdbackUsd;
  provider.released_usd += (amountUsd - holdbackUsd);
  provider.transaction_count += 1;
  
  globalState.global_total_usd += amountUsd;
  globalState.global_holdback_usd += holdbackUsd;
}

export function recordRefund(providerId: string): void {
  const provider = getOrCreateProvider(providerId);
  provider.refund_count += 1;
  
  checkAnomalyThresholds(providerId);
}

export function recordDispute(providerId: string): void {
  const provider = getOrCreateProvider(providerId);
  provider.dispute_count += 1;
  
  checkAnomalyThresholds(providerId);
}

function checkAnomalyThresholds(providerId: string): void {
  const provider = getOrCreateProvider(providerId);
  
  if (provider.transaction_count === 0) return;
  
  const refundRate = provider.refund_count / provider.transaction_count;
  const disputeRate = provider.dispute_count / provider.transaction_count;
  
  if (refundRate > PROVIDER_PAYOUT_LIMITS.anomaly_thresholds.refund_rate_max) {
    if (PROVIDER_PAYOUT_LIMITS.auto_pause_on_anomaly) {
      provider.status = 'paused';
      emitAnomalyAlert(providerId, 'refund_rate', refundRate);
    }
  }
  
  if (disputeRate > PROVIDER_PAYOUT_LIMITS.anomaly_thresholds.dispute_rate_max) {
    if (PROVIDER_PAYOUT_LIMITS.auto_pause_on_anomaly) {
      provider.status = 'paused';
      emitAnomalyAlert(providerId, 'dispute_rate', disputeRate);
    }
  }
}

async function emitAnomalyAlert(providerId: string, type: string, rate: number): Promise<void> {
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'provider_anomaly_alert',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: {
          provider_id: providerId,
          anomaly_type: type,
          rate: rate,
          threshold: type === 'refund_rate' 
            ? PROVIDER_PAYOUT_LIMITS.anomaly_thresholds.refund_rate_max 
            : PROVIDER_PAYOUT_LIMITS.anomaly_thresholds.dispute_rate_max,
          action: 'auto_paused'
        }
      })
    });
  } catch {
    console.log('[ProviderPayout] Failed to emit anomaly alert');
  }
}

export function getPayoutStats(): {
  global_total_usd: number;
  global_holdback_usd: number;
  global_released_usd: number;
  provider_count: number;
  paused_providers: string[];
} {
  resetIfNewDay();
  
  const pausedProviders: string[] = [];
  globalState.providers.forEach((p, id) => {
    if (p.status === 'paused') pausedProviders.push(id);
  });
  
  return {
    global_total_usd: globalState.global_total_usd,
    global_holdback_usd: globalState.global_holdback_usd,
    global_released_usd: globalState.global_total_usd - globalState.global_holdback_usd,
    provider_count: globalState.providers.size,
    paused_providers: pausedProviders
  };
}
