/**
 * Paid Pilot Authorization
 * 
 * CEO Token: CEO-20260114-PAID-PILOT-72H
 * Pre-authorized pending T+24h green status
 */

const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';

export const PAID_PILOT_CONFIG = {
  token: 'CEO-20260114-PAID-PILOT-72H',
  
  conditions: {
    t24h_fully_green: true,
    privacy_compliance_green: true
  },
  
  parameters: {
    daily_budget_max_usd: 150,
    rolling_24h_spend: true,
    cac_ceiling_usd: 12,
    cac_breach_auto_pause_hours: 24,
    arpu_min_usd: 18,
    arpu_cac_multiplier: 1.5,
    arpu_window_days: 7,
    channel: 'retargeting_only',
    prospecting: false,
    duration_hours: 72
  },
  
  auto_pause_triggers: [
    'cac_breach_24h_continuous',
    'arpu_below_18_after_7d',
    'privacy_compliance_violation'
  ]
};

export interface PilotState {
  active: boolean;
  started_at: string | null;
  spend_today_usd: number;
  spend_rolling_24h_usd: number;
  cac_current_usd: number;
  cac_breach_hours: number;
  arpu_current_usd: number;
  conversions: number;
  paused: boolean;
  pause_reason: string | null;
}

const pilotState: PilotState = {
  active: false,
  started_at: null,
  spend_today_usd: 0,
  spend_rolling_24h_usd: 0,
  cac_current_usd: 0,
  cac_breach_hours: 0,
  arpu_current_usd: 0,
  conversions: 0,
  paused: false,
  pause_reason: null
};

export function canConsumePilotToken(
  t24hGreen: boolean,
  privacyCompliant: boolean
): { allowed: boolean; blockers: string[] } {
  const blockers: string[] = [];
  
  if (!t24hGreen) blockers.push('T+24h not fully green');
  if (!privacyCompliant) blockers.push('Privacy compliance not verified');
  
  return { allowed: blockers.length === 0, blockers };
}

export function activatePilot(): void {
  pilotState.active = true;
  pilotState.started_at = new Date().toISOString();
  pilotState.paused = false;
  pilotState.pause_reason = null;
}

export function recordSpend(amountUsd: number, conversions: number): void {
  pilotState.spend_today_usd += amountUsd;
  pilotState.spend_rolling_24h_usd += amountUsd;
  pilotState.conversions += conversions;
  
  if (conversions > 0) {
    pilotState.cac_current_usd = pilotState.spend_rolling_24h_usd / pilotState.conversions;
  }
  
  checkAutoPause();
}

export function updateArpu(arpuUsd: number): void {
  pilotState.arpu_current_usd = arpuUsd;
}

function checkAutoPause(): void {
  const config = PAID_PILOT_CONFIG.parameters;
  
  if (pilotState.spend_rolling_24h_usd > config.daily_budget_max_usd) {
    pausePilot('daily_budget_exceeded');
    return;
  }
  
  if (pilotState.cac_current_usd > config.cac_ceiling_usd) {
    pilotState.cac_breach_hours += 1;
    if (pilotState.cac_breach_hours >= config.cac_breach_auto_pause_hours) {
      pausePilot('cac_breach_24h_continuous');
    }
  } else {
    pilotState.cac_breach_hours = 0;
  }
}

export function checkArpuTarget(daysSinceStart: number): void {
  const config = PAID_PILOT_CONFIG.parameters;
  
  if (daysSinceStart >= config.arpu_window_days) {
    if (pilotState.arpu_current_usd < config.arpu_min_usd) {
      pausePilot('arpu_below_18_after_7d');
    }
  }
}

function pausePilot(reason: string): void {
  pilotState.paused = true;
  pilotState.pause_reason = reason;
  
  emitPilotPaused(reason);
}

export function getPilotState(): PilotState {
  return { ...pilotState };
}

export function evaluatePilotHealth(): {
  status: 'healthy' | 'warning' | 'paused';
  metrics: {
    budget_utilization: number;
    cac_headroom: number;
    arpu_cac_ratio: number;
  };
} {
  if (pilotState.paused) {
    return {
      status: 'paused',
      metrics: {
        budget_utilization: 0,
        cac_headroom: 0,
        arpu_cac_ratio: 0
      }
    };
  }
  
  const config = PAID_PILOT_CONFIG.parameters;
  const budgetUtil = pilotState.spend_rolling_24h_usd / config.daily_budget_max_usd;
  const cacHeadroom = (config.cac_ceiling_usd - pilotState.cac_current_usd) / config.cac_ceiling_usd;
  const arpuCacRatio = pilotState.cac_current_usd > 0 
    ? pilotState.arpu_current_usd / pilotState.cac_current_usd 
    : 0;
  
  let status: 'healthy' | 'warning' = 'healthy';
  if (budgetUtil > 0.8 || cacHeadroom < 0.2 || arpuCacRatio < config.arpu_cac_multiplier) {
    status = 'warning';
  }
  
  return {
    status,
    metrics: {
      budget_utilization: budgetUtil,
      cac_headroom: cacHeadroom,
      arpu_cac_ratio: arpuCacRatio
    }
  };
}

async function emitPilotPaused(reason: string): Promise<void> {
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'paid_pilot_paused',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: {
          reason,
          state: pilotState
        }
      })
    });
  } catch {
    console.log('[PaidPilot] Failed to emit pause event');
  }
}

export async function emitPilotMetrics(): Promise<void> {
  const health = evaluatePilotHealth();
  
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'paid_pilot_metrics',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: {
          state: pilotState,
          health,
          config: PAID_PILOT_CONFIG.parameters
        }
      })
    });
  } catch {
    console.log('[PaidPilot] Failed to emit metrics');
  }
}
