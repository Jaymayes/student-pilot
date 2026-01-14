/**
 * One-Click Apply Variant Quality Safeguard
 * 
 * CEO Directive: Pause variant if provider acceptance dips below baseline
 */

const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';

export const VARIANT_SAFEGUARD = {
  trigger: 'provider_acceptance_below_baseline',
  action: 'pause_variant',
  notification: 'page_ceo',
  requires: 'rapid_qa_plan'
};

export const CEO_PAGE_TRIGGERS = [
  { event: 'oca_canary_started', priority: 'info' },
  { event: 'gate_miss', priority: 'high' },
  { event: 'provider_complaint', priority: 'critical' },
  { event: 'kill_trigger', priority: 'critical' },
  { event: 'variant_paused', priority: 'high' },
  { event: 't2h_report', priority: 'info' },
  { event: 't6h_report', priority: 'info' },
  { event: 't24h_report', priority: 'info' }
];

export interface VariantAcceptance {
  variant: 'A' | 'B';
  acceptance_rate: number;
  baseline: number;
  sample_size: number;
  timestamp: string;
}

export interface VariantPauseEvent {
  variant: 'A' | 'B';
  reason: string;
  acceptance_rate: number;
  baseline: number;
  delta: number;
  qa_plan_required: boolean;
  timestamp: string;
}

export function evaluateVariantAcceptance(data: VariantAcceptance): {
  pause: boolean;
  delta: number;
} {
  const delta = data.acceptance_rate - data.baseline;
  return {
    pause: delta < 0,
    delta
  };
}

export async function pauseVariant(event: VariantPauseEvent): Promise<void> {
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'oca_variant_paused',
        app_id: 'A5',
        timestamp: event.timestamp,
        data: {
          ...event,
          ceo_paged: true,
          action_required: 'rapid_qa_plan'
        }
      })
    });
  } catch {
    console.log('[OCA Safeguard] Failed to emit variant pause');
  }
}

export async function pageCeo(trigger: string, priority: string, details: Record<string, unknown>): Promise<void> {
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'ceo_paged',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: {
          trigger,
          priority,
          details,
          oca_canary: true
        }
      })
    });
  } catch {
    console.log('[OCA Safeguard] Failed to page CEO');
  }
}

export function monitorVariantAcceptance(
  variantA: VariantAcceptance,
  variantB: VariantAcceptance
): { A: { pause: boolean; delta: number }; B: { pause: boolean; delta: number } } {
  return {
    A: evaluateVariantAcceptance(variantA),
    B: evaluateVariantAcceptance(variantB)
  };
}
