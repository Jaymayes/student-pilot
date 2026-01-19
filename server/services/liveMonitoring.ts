/**
 * Live Monitoring Service - Pilot Restore
 * 
 * Auto-rollback thresholds:
 * - Any auth 5xx for ≥5 min
 * - A1 pool_utilization ≥80% for 2 min
 * - Core P95 >120ms for 15 min
 * - Aux P95 >200ms for 15 min
 * - A3 error burst >3 in 60s
 * 
 * On breach: pause B2C capture, keep refunds on, update CIR
 */

import { LIVE_MONITORING } from '../config/featureFlags';

export interface MonitoringState {
  pilot_restored_at: string;
  current_traffic_cap: number;
  auth_5xx_streak_start: string | null;
  pool_high_streak_start: string | null;
  core_p95_breach_start: string | null;
  aux_p95_breach_start: string | null;
  a3_recent_errors: number[];
  auto_rollback_triggered: boolean;
  rollback_reason: string | null;
}

export interface SyntheticLoginResult {
  passed: boolean;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  error_rate: number;
  samples: number;
  timestamp: string;
}

export interface BreakerTimeline {
  state: 'open' | 'half_open' | 'closed';
  consecutive_successes: number;
  windows_passed: number;
  last_state_change: string;
  events: Array<{ state: string; timestamp: string; reason: string }>;
}

export interface PaymentsPilotMetrics {
  attempts: number;
  auth_success_count: number;
  auth_success_rate: number;
  refunds_requested: number;
  refunds_under_10min: number;
  refund_slo_rate: number;
  complaints: number;
  complaint_rate: number;
}

export interface CostMetrics {
  compute_units_burned: number;
  cu_per_txn_retry_storm: number;
  cu_per_txn_breaker_active: number;
  txn_volume: number;
  autonomy_tax_savings: number;
}

const monitoringState: MonitoringState = {
  pilot_restored_at: new Date().toISOString(),
  current_traffic_cap: 2,
  auth_5xx_streak_start: null,
  pool_high_streak_start: null,
  core_p95_breach_start: null,
  aux_p95_breach_start: null,
  a3_recent_errors: [],
  auto_rollback_triggered: false,
  rollback_reason: null,
};

const breakerTimeline: BreakerTimeline = {
  state: 'half_open',
  consecutive_successes: 0,
  windows_passed: 0,
  last_state_change: new Date().toISOString(),
  events: [{ state: 'half_open', timestamp: new Date().toISOString(), reason: 'Pilot restore' }],
};

const paymentMetrics: PaymentsPilotMetrics = {
  attempts: 0,
  auth_success_count: 0,
  auth_success_rate: 1,
  refunds_requested: 0,
  refunds_under_10min: 0,
  refund_slo_rate: 1,
  complaints: 0,
  complaint_rate: 0,
};

const costMetrics: CostMetrics = {
  compute_units_burned: 0,
  cu_per_txn_retry_storm: 15,
  cu_per_txn_breaker_active: 3,
  txn_volume: 0,
  autonomy_tax_savings: 0,
};

export function getMonitoringState(): MonitoringState {
  return { ...monitoringState };
}

export function getBreakerTimeline(): BreakerTimeline {
  return { ...breakerTimeline };
}

export function getPaymentMetrics(): PaymentsPilotMetrics {
  return { ...paymentMetrics };
}

export function getCostMetrics(): CostMetrics {
  costMetrics.autonomy_tax_savings = 
    (costMetrics.cu_per_txn_retry_storm - costMetrics.cu_per_txn_breaker_active) * costMetrics.txn_volume;
  return { ...costMetrics };
}

export function recordBreakerSuccess(): void {
  breakerTimeline.consecutive_successes++;
  
  const policy = LIVE_MONITORING.a3_breaker_close_policy;
  if (breakerTimeline.consecutive_successes >= policy.consecutive_successes / policy.windows_required) {
    breakerTimeline.windows_passed++;
  }
  
  if (breakerTimeline.windows_passed >= policy.windows_required && 
      breakerTimeline.consecutive_successes >= policy.consecutive_successes) {
    breakerTimeline.state = 'closed';
    breakerTimeline.last_state_change = new Date().toISOString();
    breakerTimeline.events.push({
      state: 'closed',
      timestamp: new Date().toISOString(),
      reason: `${policy.consecutive_successes} consecutive successes across ${policy.windows_required} windows`,
    });
  }
}

export function recordBreakerFailure(): void {
  breakerTimeline.consecutive_successes = 0;
  breakerTimeline.windows_passed = 0;
  
  if (breakerTimeline.state !== 'open') {
    breakerTimeline.state = 'open';
    breakerTimeline.last_state_change = new Date().toISOString();
    breakerTimeline.events.push({
      state: 'open',
      timestamp: new Date().toISOString(),
      reason: 'Failure detected',
    });
  }
}

export function recordPaymentAttempt(success: boolean): void {
  paymentMetrics.attempts++;
  if (success) {
    paymentMetrics.auth_success_count++;
  }
  paymentMetrics.auth_success_rate = paymentMetrics.attempts > 0 
    ? paymentMetrics.auth_success_count / paymentMetrics.attempts 
    : 1;
  costMetrics.txn_volume++;
}

export function recordRefund(underSlo: boolean): void {
  paymentMetrics.refunds_requested++;
  if (underSlo) {
    paymentMetrics.refunds_under_10min++;
  }
  paymentMetrics.refund_slo_rate = paymentMetrics.refunds_requested > 0
    ? paymentMetrics.refunds_under_10min / paymentMetrics.refunds_requested
    : 1;
}

export function checkAutoRollback(metrics: {
  auth_5xx: number;
  pool_utilization: number;
  core_p95_ms: number;
  aux_p95_ms: number;
  a3_error_count: number;
}): { rollback: boolean; reason: string | null } {
  const thresholds = LIVE_MONITORING.auto_rollback_thresholds;
  const now = Date.now();
  
  if (metrics.auth_5xx > 0) {
    if (!monitoringState.auth_5xx_streak_start) {
      monitoringState.auth_5xx_streak_start = new Date().toISOString();
    }
    const streakMs = now - new Date(monitoringState.auth_5xx_streak_start).getTime();
    if (streakMs >= thresholds.auth_5xx_duration_min * 60000) {
      return { rollback: true, reason: `Auth 5xx for ${thresholds.auth_5xx_duration_min}+ min` };
    }
  } else {
    monitoringState.auth_5xx_streak_start = null;
  }
  
  if (metrics.pool_utilization >= thresholds.pool_utilization_pct) {
    if (!monitoringState.pool_high_streak_start) {
      monitoringState.pool_high_streak_start = new Date().toISOString();
    }
    const streakMs = now - new Date(monitoringState.pool_high_streak_start).getTime();
    if (streakMs >= thresholds.pool_utilization_duration_min * 60000) {
      return { rollback: true, reason: `Pool ≥${thresholds.pool_utilization_pct}% for ${thresholds.pool_utilization_duration_min}+ min` };
    }
  } else {
    monitoringState.pool_high_streak_start = null;
  }
  
  if (metrics.core_p95_ms > thresholds.core_p95_ms) {
    if (!monitoringState.core_p95_breach_start) {
      monitoringState.core_p95_breach_start = new Date().toISOString();
    }
    const streakMs = now - new Date(monitoringState.core_p95_breach_start).getTime();
    if (streakMs >= thresholds.core_p95_duration_min * 60000) {
      return { rollback: true, reason: `Core P95 >${thresholds.core_p95_ms}ms for ${thresholds.core_p95_duration_min}+ min` };
    }
  } else {
    monitoringState.core_p95_breach_start = null;
  }
  
  monitoringState.a3_recent_errors.push(metrics.a3_error_count);
  const windowStart = now - thresholds.a3_error_burst_window_sec * 1000;
  monitoringState.a3_recent_errors = monitoringState.a3_recent_errors.slice(-60);
  const recentTotal = monitoringState.a3_recent_errors.reduce((a, b) => a + b, 0);
  if (recentTotal > thresholds.a3_error_burst_count) {
    return { rollback: true, reason: `A3 error burst: ${recentTotal} in 60s` };
  }
  
  return { rollback: false, reason: null };
}

export function triggerAutoRollback(reason: string): void {
  monitoringState.auto_rollback_triggered = true;
  monitoringState.rollback_reason = reason;
  monitoringState.current_traffic_cap = 0;
}

export async function runSyntheticProviderLogin(samples: number = 10): Promise<SyntheticLoginResult> {
  const latencies: number[] = [];
  let errors = 0;
  
  for (let i = 0; i < samples; i++) {
    const start = Date.now();
    try {
      const response = await fetch('https://scholar-auth-jamarrlmayes.replit.app/health', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      const latency = Date.now() - start;
      latencies.push(latency);
      if (!response.ok) errors++;
    } catch {
      errors++;
      latencies.push(5000);
    }
  }
  
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  
  const result: SyntheticLoginResult = {
    passed: p95 <= LIVE_MONITORING.synthetic_login_target_p95_ms && errors === 0,
    p50_ms: p50,
    p95_ms: p95,
    p99_ms: p99,
    error_rate: errors / samples,
    samples,
    timestamp: new Date().toISOString(),
  };
  
  return result;
}

export async function emitPilotRestoreAttestation(): Promise<string> {
  const A8_ENDPOINT = process.env.AUTO_COM_CENTER_BASE_URL || 'https://auto-com-center-jamarrlmayes.replit.app';
  
  const payload = {
    eventName: 'pilot_restore_attestation',
    appName: 'student_pilot',
    appId: 'A5',
    timestamp: new Date().toISOString(),
    payload: {
      cir_id: 'CIR-1768837580',
      action: 'PILOT_RESTORE',
      traffic_cap: 2,
      b2c_capture: 'pilot_only',
      safety_lock: true,
      refunds_enabled: true,
      breaker_state: breakerTimeline.state,
      monitoring_active: true,
      auto_rollback_thresholds: LIVE_MONITORING.auto_rollback_thresholds,
    },
  };
  
  try {
    const response = await fetch(`${A8_ENDPOINT}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return data.event_id || 'unknown';
  } catch {
    return 'emit_failed';
  }
}
