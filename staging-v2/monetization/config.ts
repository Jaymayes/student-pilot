/**
 * Monetization Configuration - Shadow Mode Listeners
 * 
 * B2C: 4x AI markup on credit pricing
 * B2B: 3% platform fee on transactions
 * 
 * Mode: DRY-RUN (no actual charges during Shadow)
 */

export const MONETIZATION_CONFIG = {
  mode: 'dry_run' as const,
  shadow_mode: true,
  
  b2c: {
    credit_pricing: {
      base_cost_per_ai_call: 0.01,
      markup_multiplier: 4,
      final_price_per_credit: 0.04,
      
      packages: [
        { credits: 10, price_cents: 499, savings: '0%' },
        { credits: 50, price_cents: 1999, savings: '20%' },
        { credits: 100, price_cents: 2999, savings: '40%' },
        { credits: 500, price_cents: 9999, savings: '50%' }
      ]
    },
    
    trial_credits: 5,
    activation_bonus: 10
  },
  
  b2b: {
    platform_fee_percent: 3,
    minimum_fee_cents: 50,
    
    tiers: [
      { name: 'starter', monthly_cents: 0, fee_percent: 3 },
      { name: 'growth', monthly_cents: 9900, fee_percent: 2.5 },
      { name: 'enterprise', monthly_cents: 49900, fee_percent: 2 }
    ]
  },
  
  cost_caps: {
    shadow_max_usd: 50,
    canary_max_usd: 300
  }
};

export interface MonetizationEvent {
  event_type: 'credit_purchase' | 'platform_fee' | 'ai_usage';
  app_id: string;
  timestamp: string;
  data: {
    user_id?: string;
    provider_id?: string;
    amount_cents: number;
    credits?: number;
    fee_percent?: number;
    dry_run: boolean;
  };
}

export function calculateB2CPrice(credits: number): number {
  const pkg = MONETIZATION_CONFIG.b2c.credit_pricing.packages.find(p => p.credits === credits);
  if (pkg) return pkg.price_cents;
  return credits * MONETIZATION_CONFIG.b2c.credit_pricing.final_price_per_credit * 100;
}

export function calculateB2BFee(transactionCents: number, tier: string = 'starter'): number {
  const tierConfig = MONETIZATION_CONFIG.b2b.tiers.find(t => t.name === tier);
  const feePercent = tierConfig?.fee_percent || MONETIZATION_CONFIG.b2b.platform_fee_percent;
  const fee = Math.floor(transactionCents * (feePercent / 100));
  return Math.max(fee, MONETIZATION_CONFIG.b2b.minimum_fee_cents);
}

export async function emitMonetizationEvent(event: MonetizationEvent): Promise<void> {
  const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';
  
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: `monetization_${event.event_type}`,
        app_id: event.app_id,
        timestamp: event.timestamp,
        data: {
          ...event.data,
          mode: MONETIZATION_CONFIG.mode,
          shadow: MONETIZATION_CONFIG.shadow_mode
        }
      })
    });
  } catch {
    console.log('[Monetization] Failed to emit event (non-blocking)');
  }
}
