/**
 * One-Click Apply Measurement Directives
 * 
 * CEO Authorization: CEO-20260119-OCA-PROMOTE-10PCT-PREAUTH
 * Core Activation Metric: First Document Upload
 */

const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';

export const CEO_AUTHORIZATION = {
  token: 'CEO-20260119-OCA-PROMOTE-10PCT-PREAUTH',
  issued_at: new Date().toISOString(),
  scope: 'oca_canary_5_to_10_percent',
  auto_promote_enabled: true
};

export const MEASUREMENT_CONFIG = {
  core_activation_metric: 'first_document_upload',
  
  control_holdout: {
    enabled: true,
    percent: 10,
    flag: 'holdout_control',
    description: 'No notifications, measure true lift'
  },
  
  cost_telemetry: {
    fields: [
      'cost_per_notified',
      'cost_per_started',
      'cost_per_completed'
    ],
    compute_per_completion: true,
    budget_cap_usd: 500
  },
  
  compliance_line: 'No AI essays. Students write; we only assist.',
  positioning: 'Editor/Coach'
};

export const THROTTLE_POLICY = {
  trigger: {
    metric: 'p95_latency_seconds',
    threshold: 1.3,
    duration_minutes: 10
  },
  action: {
    reduce_rate_limit_to: 4,
    from_rate_limit: 5
  },
  restore: {
    metric: 'p95_latency_seconds',
    threshold: 1.0,
    duration_minutes: 30
  }
};

export const SCHEMA_FLAGS = {
  holdout_control: {
    type: 'boolean',
    default: true,
    description: '10% control group receives no notifications'
  },
  cost_per_notified: {
    type: 'number',
    unit: 'usd',
    description: 'Cost per user notified'
  },
  cost_per_started: {
    type: 'number',
    unit: 'usd',
    description: 'Cost per user who started application'
  },
  cost_per_completed: {
    type: 'number',
    unit: 'usd',
    description: 'Cost per completed application'
  }
};

export interface CostTelemetry {
  total_spend_usd: number;
  users_notified: number;
  users_started: number;
  users_completed: number;
  cost_per_notified: number;
  cost_per_started: number;
  cost_per_completed: number;
  compute_per_completion: number;
}

export interface FunnelMetrics {
  variant: 'A' | 'B' | 'control';
  emails_sent: number;
  opens: number;
  clicks: number;
  modal_starts: number;
  completions: number;
  open_rate: number;
  click_rate: number;
  start_rate: number;
  completion_rate: number;
}

export interface T2hPacket {
  timestamp: string;
  slo_by_variant: {
    A: { p95_seconds: number; error_rate: number };
    B: { p95_seconds: number; error_rate: number };
  };
  queue_depth: number;
  funnel: FunnelMetrics[];
  suppression_match_rate: number;
  complaints: number;
  violations: number;
  cost: CostTelemetry;
}

export interface T6hPacket {
  timestamp: string;
  trend_vs_t2h: {
    p95_delta: number;
    error_delta: number;
    completion_delta: number;
  };
  refunds: number;
  chargebacks: number;
  provider_acceptance_vs_baseline: number;
  top_failure_signatures: string[];
  ab_lift: { A_vs_B: number; winner: 'A' | 'B' | 'inconclusive' };
  control_lift: number;
  cost: CostTelemetry;
}

export interface T24hPacket {
  timestamp: string;
  full_slo: {
    p95_seconds: number;
    error_rate: number;
    queue_depth_max: number;
    refund_rate: number;
    complaints: number;
    violations: number;
  };
  funnel_final: FunnelMetrics[];
  seed_validations: {
    packet_id: string;
    oca_header: boolean;
    banner: boolean;
    report_issue: boolean;
    audit_entry: boolean;
    a8_id: string;
  }[];
  roi: {
    arpu_lift: number;
    payback_days: number;
    unit_economics_vs_cap: number;
  };
  cost: CostTelemetry;
  promotion_decision: {
    promote: boolean;
    token: string;
    blockers: string[];
  };
}

export function calculateCostTelemetry(
  totalSpend: number,
  notified: number,
  started: number,
  completed: number,
  computeCost: number
): CostTelemetry {
  return {
    total_spend_usd: totalSpend,
    users_notified: notified,
    users_started: started,
    users_completed: completed,
    cost_per_notified: notified > 0 ? totalSpend / notified : 0,
    cost_per_started: started > 0 ? totalSpend / started : 0,
    cost_per_completed: completed > 0 ? totalSpend / completed : 0,
    compute_per_completion: completed > 0 ? computeCost / completed : 0
  };
}

export function evaluateThrottle(p95History: { timestamp: string; value: number }[]): {
  shouldThrottle: boolean;
  shouldRestore: boolean;
  currentP95: number;
} {
  const now = Date.now();
  const tenMinAgo = now - (THROTTLE_POLICY.trigger.duration_minutes * 60 * 1000);
  const thirtyMinAgo = now - (THROTTLE_POLICY.restore.duration_minutes * 60 * 1000);
  
  const recentHighValues = p95History.filter(h => 
    new Date(h.timestamp).getTime() > tenMinAgo && h.value > THROTTLE_POLICY.trigger.threshold
  );
  
  const recentLowValues = p95History.filter(h => 
    new Date(h.timestamp).getTime() > thirtyMinAgo && h.value < THROTTLE_POLICY.restore.threshold
  );
  
  const currentP95 = p95History.length > 0 ? p95History[p95History.length - 1].value : 0;
  
  const shouldThrottle = recentHighValues.length >= 10;
  const shouldRestore = recentLowValues.length >= 30 && currentP95 < THROTTLE_POLICY.restore.threshold;
  
  return { shouldThrottle, shouldRestore, currentP95 };
}

export async function emitT2hPacket(packet: T2hPacket): Promise<void> {
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'oca_report_t2h',
        app_id: 'A5',
        timestamp: packet.timestamp,
        data: packet
      })
    });
  } catch {
    console.log('[OCA Measurement] Failed to emit T+2h packet');
  }
}

export async function emitT6hPacket(packet: T6hPacket): Promise<void> {
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'oca_report_t6h',
        app_id: 'A5',
        timestamp: packet.timestamp,
        data: packet
      })
    });
  } catch {
    console.log('[OCA Measurement] Failed to emit T+6h packet');
  }
}

export async function emitT24hPacket(packet: T24hPacket): Promise<void> {
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'oca_report_t24h',
        app_id: 'A5',
        timestamp: packet.timestamp,
        data: packet
      })
    });
  } catch {
    console.log('[OCA Measurement] Failed to emit T+24h packet');
  }
}
