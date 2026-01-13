/**
 * Finance Operations
 * 
 * Reserve ledger, payout schedule, and reconciliation
 */

const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';

export const FINANCE_CONFIG = {
  holdback_percent: 10,
  payout_schedule: 'net-14',
  payout_mode: 'simulation' as 'simulation' | 'live',
  
  global_daily_cap_usd: 5000,
  per_provider_daily_cap_usd: 250,
  
  reconciliation: {
    tolerance_usd: 0,
    check_at: 'T+24h'
  }
};

export interface ReserveLedger {
  total_held_usd: number;
  by_provider: Map<string, number>;
  pending_release: { provider_id: string; amount_usd: number; release_date: string }[];
}

export interface PayoutRecord {
  provider_id: string;
  gross_usd: number;
  holdback_usd: number;
  net_usd: number;
  created_at: string;
  release_at: string;
  status: 'pending' | 'released' | 'held';
}

export interface ReconciliationResult {
  timestamp: string;
  stripe_charges_usd: number;
  stripe_refunds_usd: number;
  stripe_net_usd: number;
  platform_ledger_usd: number;
  payout_accruals_usd: number;
  delta_usd: number;
  status: 'matched' | 'discrepancy';
}

const reserveLedger: ReserveLedger = {
  total_held_usd: 0,
  by_provider: new Map(),
  pending_release: []
};

const payoutRecords: PayoutRecord[] = [];

export function recordProviderRevenue(
  providerId: string,
  grossUsd: number
): PayoutRecord {
  const holdbackUsd = grossUsd * (FINANCE_CONFIG.holdback_percent / 100);
  const netUsd = grossUsd - holdbackUsd;
  
  const currentHold = reserveLedger.by_provider.get(providerId) || 0;
  reserveLedger.by_provider.set(providerId, currentHold + holdbackUsd);
  reserveLedger.total_held_usd += holdbackUsd;
  
  const releaseDate = new Date();
  releaseDate.setDate(releaseDate.getDate() + 14);
  
  const record: PayoutRecord = {
    provider_id: providerId,
    gross_usd: grossUsd,
    holdback_usd: holdbackUsd,
    net_usd: netUsd,
    created_at: new Date().toISOString(),
    release_at: releaseDate.toISOString(),
    status: 'pending'
  };
  
  payoutRecords.push(record);
  
  reserveLedger.pending_release.push({
    provider_id: providerId,
    amount_usd: holdbackUsd,
    release_date: releaseDate.toISOString()
  });
  
  return record;
}

export function getReserveLedger(): {
  total_held_usd: number;
  by_provider: { [key: string]: number };
  pending_count: number;
} {
  const byProvider: { [key: string]: number } = {};
  reserveLedger.by_provider.forEach((v, k) => { byProvider[k] = v; });
  
  return {
    total_held_usd: reserveLedger.total_held_usd,
    by_provider: byProvider,
    pending_count: reserveLedger.pending_release.length
  };
}

export function runReconciliation(
  stripeChargesUsd: number,
  stripeRefundsUsd: number,
  platformLedgerUsd: number,
  payoutAccrualsUsd: number
): ReconciliationResult {
  const stripeNetUsd = stripeChargesUsd - stripeRefundsUsd;
  const deltaUsd = Math.abs(stripeNetUsd - platformLedgerUsd);
  
  const result: ReconciliationResult = {
    timestamp: new Date().toISOString(),
    stripe_charges_usd: stripeChargesUsd,
    stripe_refunds_usd: stripeRefundsUsd,
    stripe_net_usd: stripeNetUsd,
    platform_ledger_usd: platformLedgerUsd,
    payout_accruals_usd: payoutAccrualsUsd,
    delta_usd: deltaUsd,
    status: deltaUsd <= FINANCE_CONFIG.reconciliation.tolerance_usd ? 'matched' : 'discrepancy'
  };
  
  emitReconciliationResult(result);
  
  return result;
}

export function getPayoutSummary(): {
  total_gross_usd: number;
  total_holdback_usd: number;
  total_net_usd: number;
  pending_count: number;
  providers_count: number;
} {
  let totalGross = 0;
  let totalHoldback = 0;
  let totalNet = 0;
  let pending = 0;
  
  for (const record of payoutRecords) {
    totalGross += record.gross_usd;
    totalHoldback += record.holdback_usd;
    totalNet += record.net_usd;
    if (record.status === 'pending') pending++;
  }
  
  return {
    total_gross_usd: totalGross,
    total_holdback_usd: totalHoldback,
    total_net_usd: totalNet,
    pending_count: pending,
    providers_count: reserveLedger.by_provider.size
  };
}

async function emitReconciliationResult(result: ReconciliationResult): Promise<void> {
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'finance_reconciliation',
        app_id: 'A5',
        timestamp: result.timestamp,
        data: result
      })
    });
  } catch {
    console.log('[Finance] Failed to emit reconciliation');
  }
}

export async function emitFinanceSnapshot(): Promise<void> {
  const reserve = getReserveLedger();
  const payout = getPayoutSummary();
  
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'finance_snapshot',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: {
          reserve,
          payout,
          config: {
            holdback_percent: FINANCE_CONFIG.holdback_percent,
            payout_schedule: FINANCE_CONFIG.payout_schedule,
            mode: FINANCE_CONFIG.payout_mode,
            global_cap_usd: FINANCE_CONFIG.global_daily_cap_usd,
            per_provider_cap_usd: FINANCE_CONFIG.per_provider_daily_cap_usd
          }
        }
      })
    });
  } catch {
    console.log('[Finance] Failed to emit snapshot');
  }
}
