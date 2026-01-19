/**
 * Canary Monitoring Service
 * 
 * Emits telemetry to A8 each minute:
 * - A1: db_connected, pool metrics, auth_5xx, p95_ms
 * - A3: breaker_state, req_rate, error_rate, queue_depth
 * - A5/A7: http_200_markers, p95_ms
 * - Aux: p95_ms, 5xx rate
 * - Cost: compute_units_burned, retry_suppressed_count
 */

import { CANARY_CONFIG } from '../config/featureFlags';

export interface CanaryState {
  phase: 'pre_canary' | 'step1' | 'step2' | 'green_clock' | 'aborted' | 'complete';
  started_at: string | null;
  current_step_started_at: string | null;
  green_clock_started_at: string | null;
  green_minutes_elapsed: number;
  abort_reason: string | null;
}

export interface PreCanaryGates {
  a1_db_connected: boolean;
  a1_auth_5xx: number;
  a1_pool_utilization: number;
  a1_p95_ms: number;
  a3_concurrency: number;
  a3_queues_paused: boolean;
  a3_breaker_open: boolean;
  a3_no_database_url: boolean;
  a5_200_ok: boolean;
  a5_markers: boolean;
  a7_200_ok: boolean;
  a7_markers: boolean;
  confirmations_3of3: boolean;
  a8_cir_active: boolean;
  hold_start_time: string | null;
  hold_minutes_elapsed: number;
}

export interface MinuteMetrics {
  timestamp: string;
  a1: {
    db_connected: boolean;
    pool_in_use: number;
    pool_idle: number;
    pool_total: number;
    pool_utilization_pct: number;
    auth_5xx: number;
    p95_ms: number;
  };
  a3: {
    breaker_state: 'open' | 'half_open' | 'closed';
    req_rate: number;
    error_rate: number;
    backoff_state: string;
    queue_depth: number;
    dlq_count: number;
  };
  a5: {
    http_200: boolean;
    markers: string[];
    p95_ms: number;
  };
  a7: {
    http_200: boolean;
    markers: string[];
    p95_ms: number;
  };
  aux: {
    a6_p95_ms: number;
    a8_p95_ms: number;
    a6_5xx_rate: number;
    a8_5xx_rate: number;
  };
  cost: {
    compute_units_burned: number;
    retry_suppressed_count: number;
    autonomy_tax_delta: number;
  };
}

const canaryState: CanaryState = {
  phase: 'pre_canary',
  started_at: null,
  current_step_started_at: null,
  green_clock_started_at: null,
  green_minutes_elapsed: 0,
  abort_reason: null,
};

const preCanaryGates: PreCanaryGates = {
  a1_db_connected: false,
  a1_auth_5xx: 0,
  a1_pool_utilization: 0,
  a1_p95_ms: 0,
  a3_concurrency: 0,
  a3_queues_paused: true,
  a3_breaker_open: true,
  a3_no_database_url: true,
  a5_200_ok: false,
  a5_markers: false,
  a7_200_ok: false,
  a7_markers: false,
  confirmations_3of3: false,
  a8_cir_active: true,
  hold_start_time: null,
  hold_minutes_elapsed: 0,
};

const metricsHistory: MinuteMetrics[] = [];

export function getCanaryState(): CanaryState {
  return { ...canaryState };
}

export function getPreCanaryGates(): PreCanaryGates {
  return { ...preCanaryGates };
}

export function updatePreCanaryGates(updates: Partial<PreCanaryGates>): void {
  Object.assign(preCanaryGates, updates);
}

export function checkPreCanaryGatesMet(): { met: boolean; blockers: string[] } {
  const blockers: string[] = [];
  
  if (!preCanaryGates.a1_db_connected) blockers.push('A1 db_connected=false');
  if (preCanaryGates.a1_auth_5xx > 0) blockers.push(`A1 auth_5xx=${preCanaryGates.a1_auth_5xx}`);
  if (preCanaryGates.a1_pool_utilization > 50) blockers.push(`A1 pool_utilization=${preCanaryGates.a1_pool_utilization}% > 50%`);
  if (preCanaryGates.a1_p95_ms > 120) blockers.push(`A1 P95=${preCanaryGates.a1_p95_ms}ms > 120ms`);
  if (preCanaryGates.a3_concurrency !== 0) blockers.push(`A3 concurrency=${preCanaryGates.a3_concurrency} != 0`);
  if (!preCanaryGates.a3_queues_paused) blockers.push('A3 queues not paused');
  if (!preCanaryGates.a3_breaker_open) blockers.push('A3 breaker not open');
  if (!preCanaryGates.a3_no_database_url) blockers.push('A3 has DATABASE_URL (violation)');
  if (!preCanaryGates.a5_200_ok) blockers.push('A5 not 200 OK');
  if (!preCanaryGates.a5_markers) blockers.push('A5 missing markers');
  if (!preCanaryGates.a7_200_ok) blockers.push('A7 not 200 OK');
  if (!preCanaryGates.a7_markers) blockers.push('A7 missing markers');
  if (!preCanaryGates.confirmations_3of3) blockers.push('Missing 3-of-3 confirmations');
  if (!preCanaryGates.a8_cir_active) blockers.push('A8 CIR not active');
  if (preCanaryGates.hold_minutes_elapsed < 10) blockers.push(`Hold time ${preCanaryGates.hold_minutes_elapsed}/10 min`);
  
  return { met: blockers.length === 0, blockers };
}

export function startCanary(): void {
  canaryState.phase = 'step1';
  canaryState.started_at = new Date().toISOString();
  canaryState.current_step_started_at = new Date().toISOString();
}

export function advanceToStep2(): void {
  canaryState.phase = 'step2';
  canaryState.current_step_started_at = new Date().toISOString();
  canaryState.green_clock_started_at = new Date().toISOString();
}

export function abortCanary(reason: string): void {
  canaryState.phase = 'aborted';
  canaryState.abort_reason = reason;
}

export function checkAbortConditions(metrics: MinuteMetrics): { abort: boolean; reason: string | null } {
  if (metrics.a1.auth_5xx > 0) {
    return { abort: true, reason: `Auth 5xx detected: ${metrics.a1.auth_5xx}` };
  }
  if (metrics.a1.pool_utilization_pct > CANARY_CONFIG.abort_thresholds.pool_utilization_2min) {
    return { abort: true, reason: `Pool utilization ${metrics.a1.pool_utilization_pct}% > 80%` };
  }
  if (metrics.a3.error_rate > CANARY_CONFIG.abort_thresholds.a3_errors_per_60s) {
    return { abort: true, reason: `A3 error rate ${metrics.a3.error_rate} > 3/60s` };
  }
  return { abort: false, reason: null };
}

export function recordMinuteMetrics(metrics: MinuteMetrics): void {
  metricsHistory.push(metrics);
  if (metricsHistory.length > 120) {
    metricsHistory.shift();
  }
  
  if (canaryState.phase === 'step2' || canaryState.phase === 'green_clock') {
    if (canaryState.green_clock_started_at) {
      const elapsed = (Date.now() - new Date(canaryState.green_clock_started_at).getTime()) / 60000;
      canaryState.green_minutes_elapsed = Math.floor(elapsed);
      
      if (canaryState.green_minutes_elapsed >= 60) {
        canaryState.phase = 'complete';
      }
    }
  }
}

export async function emitMinuteMetricsToA8(metrics: MinuteMetrics): Promise<void> {
  const A8_ENDPOINT = process.env.AUTO_COM_CENTER_BASE_URL || 'https://auto-com-center-jamarrlmayes.replit.app';
  
  try {
    await fetch(`${A8_ENDPOINT}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: 'canary_minute_metrics',
        appName: 'student_pilot',
        appId: 'A5',
        timestamp: metrics.timestamp,
        payload: {
          cir_id: 'CIR-1768837580',
          canary_state: canaryState,
          metrics,
        },
      }),
    });
  } catch {
    console.log('[Canary] Failed to emit metrics to A8');
  }
}

export function getMetricsHistory(): MinuteMetrics[] {
  return [...metricsHistory];
}

export function checkExitCriteriaMet(): { met: boolean; blockers: string[] } {
  if (canaryState.green_minutes_elapsed < 60) {
    return { met: false, blockers: [`Green clock: ${canaryState.green_minutes_elapsed}/60 min`] };
  }
  
  const recent = metricsHistory.slice(-60);
  const blockers: string[] = [];
  
  const any5xx = recent.some(m => m.a1.auth_5xx > 0);
  if (any5xx) blockers.push('Auth 5xx detected in green window');
  
  const anyDbDisconnect = recent.some(m => !m.a1.db_connected);
  if (anyDbDisconnect) blockers.push('DB disconnect in green window');
  
  const maxPool = Math.max(...recent.map(m => m.a1.pool_utilization_pct));
  if (maxPool >= 80) blockers.push(`Max pool utilization ${maxPool}% >= 80%`);
  
  const maxCoreP95 = Math.max(...recent.map(m => Math.max(m.a5.p95_ms, m.a7.p95_ms)));
  if (maxCoreP95 > 120) blockers.push(`Core P95 ${maxCoreP95}ms > 120ms`);
  
  const maxAuxP95 = Math.max(...recent.map(m => Math.max(m.aux.a6_p95_ms, m.aux.a8_p95_ms)));
  if (maxAuxP95 > 200) blockers.push(`Aux P95 ${maxAuxP95}ms > 200ms`);
  
  return { met: blockers.length === 0, blockers };
}
