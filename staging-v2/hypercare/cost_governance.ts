/**
 * Cost Governance Framework
 * 
 * CEO Directive: Keep COST_THROTTLE=ACTIVE until ≤$280 for 3h
 */

const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';

export const COST_GOVERNANCE = {
  throttle_active: true,
  
  thresholds: {
    safe_projection_usd: 280,
    cap_usd: 300,
    alert_usd: 240,
    consecutive_hours_required: 3
  },
  
  step_down_plan: {
    phase1: {
      condition: 'projection_lte_280_for_3h',
      action: 'background_tasks_75pct',
      duration_hours: 1
    },
    phase2: {
      condition: 'projection_lte_300_after_phase1',
      action: 'background_tasks_100pct'
    }
  },
  
  cache_ttl: {
    search_match_seconds: 60,
    review_at: 'T+24h'
  },
  
  queue_watch: {
    endpoint: '/documents/analyze',
    depth_max: 30,
    p95_max_seconds: 1.5,
    breach_window_minutes: 15,
    action: 'add_worker'
  }
};

export interface CostState {
  current_projection_usd: number;
  hours_under_280: number;
  throttle_active: boolean;
  background_tasks_percent: number;
  last_check: string;
}

const costState: CostState = {
  current_projection_usd: 0,
  hours_under_280: 0,
  throttle_active: true,
  background_tasks_percent: 50,
  last_check: new Date().toISOString()
};

export function updateCostProjection(projectionUsd: number): CostState {
  costState.current_projection_usd = projectionUsd;
  costState.last_check = new Date().toISOString();
  
  if (projectionUsd <= COST_GOVERNANCE.thresholds.safe_projection_usd) {
    costState.hours_under_280 += 1;
  } else {
    costState.hours_under_280 = 0;
  }
  
  return { ...costState };
}

export function evaluateStepDown(): {
  action: 'hold' | 'step_down_75' | 'step_down_100';
  reason: string;
} {
  if (costState.hours_under_280 < COST_GOVERNANCE.thresholds.consecutive_hours_required) {
    return {
      action: 'hold',
      reason: `${costState.hours_under_280}/3 consecutive hours under $280`
    };
  }
  
  if (costState.background_tasks_percent < 75) {
    return {
      action: 'step_down_75',
      reason: 'Reached 3h under $280, stepping to 75% background tasks'
    };
  }
  
  if (costState.current_projection_usd <= COST_GOVERNANCE.thresholds.cap_usd) {
    return {
      action: 'step_down_100',
      reason: 'Phase 1 complete, stepping to 100% background tasks'
    };
  }
  
  return {
    action: 'hold',
    reason: 'Projection exceeds $300, holding at current level'
  };
}

export function applyStepDown(action: 'step_down_75' | 'step_down_100'): void {
  if (action === 'step_down_75') {
    costState.background_tasks_percent = 75;
  } else if (action === 'step_down_100') {
    costState.background_tasks_percent = 100;
    costState.throttle_active = false;
  }
}

export interface QueueMetrics {
  depth: number;
  p95_seconds: number;
  breach_minutes: number;
}

export function evaluateQueueWatch(metrics: QueueMetrics): {
  action: 'none' | 'add_worker';
  reason?: string;
} {
  const config = COST_GOVERNANCE.queue_watch;
  
  const depthBreach = metrics.depth > config.depth_max;
  const p95Breach = metrics.p95_seconds > config.p95_max_seconds;
  
  if ((depthBreach || p95Breach) && metrics.breach_minutes >= config.breach_window_minutes) {
    return {
      action: 'add_worker',
      reason: `Queue breach for ${metrics.breach_minutes}min: depth=${metrics.depth}, P95=${metrics.p95_seconds}s`
    };
  }
  
  return { action: 'none' };
}

export function getCostState(): CostState {
  return { ...costState };
}

export async function emitCostGovernanceUpdate(state: CostState, action?: string): Promise<void> {
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'cost_governance_update',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: {
          state,
          action: action || 'check',
          thresholds: COST_GOVERNANCE.thresholds
        }
      })
    });
  } catch {
    console.log('[CostGov] Failed to emit update');
  }
}
