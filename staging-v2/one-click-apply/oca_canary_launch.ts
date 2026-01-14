/**
 * One-Click Apply 5% Canary Launch Configuration
 * 
 * Executive Decision: Auto-GO once A6 green + Legal sign-off
 * Channel: Production
 * Traffic: 5% eligible users, randomization locked
 * Window: 24h or 1,000 exposures (whichever first)
 */

const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';

export const CANARY_LAUNCH_CONFIG = {
  version: '1.0.0',
  status: 'pending_gates',
  
  authorization: {
    type: 'auto_go',
    condition: 'a6_green_and_legal_signoff',
    approved_by: 'CEO',
    approved_at: new Date().toISOString()
  },
  
  canary: {
    channel: 'production',
    traffic_percent: 0.05,
    randomization: 'locked',
    window: {
      hours: 24,
      exposures: 1000,
      trigger: 'whichever_first'
    },
    rate_limit_per_user_per_day: 5
  },
  
  ab_split: {
    variant_a: 0.50,
    variant_b: 0.50
  },
  
  budget: {
    canary_window_max_usd: 500,
    t1_spend_usd: 45,
    remaining_usd: 455
  }
};

export const PRE_LAUNCH_GATES = {
  a6_provider_service: {
    id: 'gate_a6_health',
    owner: 'Engineering Lead',
    deadline_hours: 12,
    requirements: {
      health_window_minutes: 60,
      uptime_min: 0.999,
      p95_latency_max_ms: 200,
      error_rate_max: 0.005,
      smoke_test: {
        endpoint: '/api/provider_register',
        expected_status: 200,
        oca_header_present: true
      }
    },
    status: 'pending'
  },
  
  legal_signoff: {
    id: 'gate_legal',
    owner: 'General Counsel',
    deadline_hours: 4,
    requirements: {
      copy_deck_approved: true,
      consent_language_approved: true,
      approval_stored_in_repo: true,
      approval_linked_in_a8: true
    },
    status: 'pending'
  },
  
  code_freeze: {
    id: 'gate_freeze',
    owner: 'Engineering',
    requirements: {
      repos: ['student-pilot', 'scholarship-api', 'auto-com-center'],
      duration_hours: 24,
      scope: 'oca_touching_code'
    },
    status: 'pending'
  }
};

export const LAUNCH_CHECKLIST = [
  {
    step: 1,
    action: 'Flip feature flag',
    details: {
      flag: 'one_click_apply.status',
      value: 'CANARY_5',
      cap: 0.05,
      rate_limit: 5,
      experiment_window: '24h_or_1000_exposures'
    },
    owner: 'Engineering'
  },
  {
    step: 2,
    action: 'Enable provider dashboard banner',
    details: {
      components: ['oca_badge', 'report_issue_button'],
      auto_disable_on_report: true
    },
    owner: 'Engineering'
  },
  {
    step: 3,
    action: 'Send canary student emails',
    details: {
      ab_split: '50/50',
      eligible_cohort_only: true,
      suppressions: ['under_13', 'no_consent']
    },
    owner: 'Marketing/Ops'
  },
  {
    step: 4,
    action: 'Emit A8 oca_canary_started event',
    details: {
      fields: ['cohort_id', 'variant_allocations', 'slo_snapshot']
    },
    owner: 'Engineering'
  },
  {
    step: 5,
    action: 'Start real-time A8 watch',
    details: {
      dashboards: ['slo', 'integrity', 'refunds', 'funnel']
    },
    owner: 'Ops'
  }
];

export const REAL_TIME_WATCH = {
  slo: {
    p95_latency_max_seconds: 1.5,
    error_rate_max: 0.01,
    queue_depth_max: 30
  },
  
  integrity: {
    ghostwriting_refusal_rate_min: 1.00,
    provider_complaints_max: 0
  },
  
  refunds: {
    absolute_24h_max: 0.02,
    delta_vs_baseline_max_pp: 0.0025
  },
  
  funnel: {
    open_rate_min: 0.35,
    ctr_min: 0.08,
    modal_completion_min: 0.70,
    submit_success_min: 0.50
  }
};

export interface GateStatus {
  gate_id: string;
  status: 'pending' | 'green' | 'red';
  checked_at: string;
  details?: Record<string, unknown>;
}

export interface LaunchReadiness {
  ready: boolean;
  gates: GateStatus[];
  blockers: string[];
}

export function checkLaunchReadiness(gates: GateStatus[]): LaunchReadiness {
  const blockers: string[] = [];
  
  for (const gate of gates) {
    if (gate.status !== 'green') {
      blockers.push(`${gate.gate_id}: ${gate.status}`);
    }
  }
  
  return {
    ready: blockers.length === 0,
    gates,
    blockers
  };
}

export async function emitCanaryStarted(
  cohortId: string,
  variantAllocations: { a: number; b: number },
  sloSnapshot: Record<string, number>
): Promise<void> {
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'oca_canary_started',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: {
          cohort_id: cohortId,
          variant_allocations: variantAllocations,
          slo_snapshot: sloSnapshot,
          config: CANARY_LAUNCH_CONFIG.canary
        }
      })
    });
  } catch {
    console.log('[OCA Canary] Failed to emit start event');
  }
}

export async function emitGateStatus(gate: GateStatus): Promise<void> {
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'oca_gate_status',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: gate
      })
    });
  } catch {
    console.log('[OCA Canary] Failed to emit gate status');
  }
}
