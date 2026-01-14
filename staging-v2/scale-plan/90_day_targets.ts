/**
 * 90-Day Scale Plan Configuration
 * 
 * Aligned to $10M ARR objective
 * Data-first, SEO-led growth engine
 */

const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';

export const NORTH_STAR_TARGETS = {
  reliability: {
    uptime_min: 0.999,
    p95_max_ms: 110,
    p95_stretch_ms: 100,
    error_rate_max: 0.005
  },
  
  unit_economics: {
    ai_gross_margin_min: 0.60,
    refund_rate_max: 0.05,
    chargebacks_max: 0
  },
  
  growth_mix: {
    organic_seo_sessions_min: 0.85,
    paid_traffic: 'controlled_accelerator'
  },
  
  revenue: {
    b2c: {
      arpu_near_term_usd: 22,
      arpu_day90_stretch_usd: 28
    },
    b2b: {
      provider_fee_rate: 0.03,
      active_providers_target: 150,
      listings_target: 500
    }
  }
};

export const WEEK1_STABILIZATION = {
  cost_governance: {
    spend_telemetry_visible: true,
    auto_throttle_active: true,
    reenable_background_condition: 'projected_spend_lte_300_and_slo_green_4h'
  },
  
  payouts: {
    per_provider_daily_usd: 250,
    global_daily_usd: 5000,
    holdback_percent: 10,
    schedule: 'net-14',
    mode: 'simulation',
    live_conditions: {
      observation_days: 7,
      disputes_max: 0,
      fraud_max: 0.005
    }
  },
  
  v1_retirement: {
    day: 7,
    actions: ['archive', 'revoke_access', 'checksum', 'data_retention_manifest']
  },
  
  security: {
    privacy_audit: 'post_cutover',
    key_rotation: 'T+48h',
    legacy_key_denylist: 'verify'
  }
};

export const PAID_PILOT_RULES = {
  budget_cap_usd: 150,
  budget_rolling: '24h',
  
  scale_conditions: {
    cac_max_usd: 8,
    cac_window: '24h_continuous',
    arpu_7d_multiplier: 1.8,
    refunds_max: 0.04,
    stripe_success_min: 0.985
  },
  
  stepup_token: 'CEO-20260114-PAID-PILOT-STEPUP',
  stepup_budget_usd: 300,
  
  auto_pause: {
    cac_breach_usd: 12,
    cac_breach_window: '24h_continuous',
    arpu_7d_min_usd: 18,
    fraud_max: 0.005,
    stripe_success_min: 0.985,
    stripe_breach_window: '30min'
  }
};

export const SEO_GROWTH = {
  weekly_pages_indexed_target: 7500,
  quality_guardrails: ['dedupe', 'thin_content_filter'],
  metrics: ['ctr', 'indexed_to_click_ratio', 'bounce_rate']
};

export const FUNNEL_TARGETS = {
  first_upload_improvement_weekly: 0.10,
  verifier_fp_max: 0.01,
  verifier_self_correction_min: 0.90
};

export const PERFORMANCE_BASELINE = {
  p95_reduction_target: 0.20,
  weekly_regression_report: true,
  metrics: ['cache_hit_rates', 'query_plans', 'accuracy']
};

export interface DailyMetrics {
  date: string;
  
  reliability: {
    uptime: number;
    p95_ms: number;
    error_rate: number;
  };
  
  revenue: {
    b2c_net_usd: number;
    b2b_fees_usd: number;
    arpu_usd: number;
    refunds_usd: number;
    gross_margin: number;
  };
  
  cost: {
    llm_api_usd: number;
    proxy_usd: number;
    storage_usd: number;
    total_usd: number;
    projection_24h_usd: number;
  };
  
  seo: {
    pages_indexed_net: number;
    ctr: number;
    organic_sessions: number;
  };
  
  funnel: {
    visitor_to_signup: number;
    signup_to_first_upload: number;
    first_upload_to_paid: number;
  };
  
  paid_pilot?: {
    spend_usd: number;
    cac_usd: number;
    arpu_7d_usd: number;
    conversions: number;
  };
}

export function evaluateDayAgainstTargets(metrics: DailyMetrics): {
  status: 'GREEN' | 'YELLOW' | 'RED';
  flags: { dimension: string; status: string; detail: string }[];
} {
  const flags: { dimension: string; status: string; detail: string }[] = [];
  
  if (metrics.reliability.uptime < NORTH_STAR_TARGETS.reliability.uptime_min) {
    flags.push({ dimension: 'reliability', status: 'RED', detail: `Uptime ${(metrics.reliability.uptime * 100).toFixed(2)}% < 99.9%` });
  }
  if (metrics.reliability.p95_ms > NORTH_STAR_TARGETS.reliability.p95_max_ms) {
    flags.push({ dimension: 'reliability', status: 'YELLOW', detail: `P95 ${metrics.reliability.p95_ms}ms > 110ms` });
  }
  
  if (metrics.revenue.gross_margin < NORTH_STAR_TARGETS.unit_economics.ai_gross_margin_min) {
    flags.push({ dimension: 'unit_economics', status: 'YELLOW', detail: `Margin ${(metrics.revenue.gross_margin * 100).toFixed(1)}% < 60%` });
  }
  
  const hasRed = flags.some(f => f.status === 'RED');
  const hasYellow = flags.some(f => f.status === 'YELLOW');
  
  return {
    status: hasRed ? 'RED' : hasYellow ? 'YELLOW' : 'GREEN',
    flags
  };
}

export async function emitDailyMetrics(metrics: DailyMetrics): Promise<void> {
  const evaluation = evaluateDayAgainstTargets(metrics);
  
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'daily_scale_metrics',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: { metrics, evaluation, targets: NORTH_STAR_TARGETS }
      })
    });
  } catch {
    console.log('[ScalePlan] Failed to emit daily metrics');
  }
}
