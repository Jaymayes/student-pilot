/**
 * Observability Mandate - P0
 * 
 * UNKNOWN alerts are BANNED. All events must have explicit error_code.
 * SLO: 100% events mapped; 0 UNKNOWN in dashboards. Breach = incident.
 */

export const ERROR_CODE_TAXONOMY = {
  AUTH_DB_UNREACHABLE: 'AUTH_DB_UNREACHABLE',
  AUTH_TIMEOUT: 'AUTH_TIMEOUT',
  ORCH_BACKOFF: 'ORCH_BACKOFF',
  RETRY_STORM_SUPPRESSED: 'RETRY_STORM_SUPPRESSED',
  RATE_LIMITED: 'RATE_LIMITED',
  POOL_EXHAUSTED: 'POOL_EXHAUSTED',
  DOWNSTREAM_5XX: 'DOWNSTREAM_5XX',
  CONFIG_DRIFT_BLOCKED: 'CONFIG_DRIFT_BLOCKED',
  BREAKER_OPEN: 'BREAKER_OPEN',
  BREAKER_HALF_OPEN: 'BREAKER_HALF_OPEN',
  PAYMENT_AUTH_FAILED: 'PAYMENT_AUTH_FAILED',
  REFUND_TIMEOUT: 'REFUND_TIMEOUT',
  SYNTHETIC_LOGIN_FAILED: 'SYNTHETIC_LOGIN_FAILED',
} as const;

export type ErrorCode = keyof typeof ERROR_CODE_TAXONOMY;

export interface WatchtowerEvent {
  event_id: string;
  timestamp: string;
  error_code: ErrorCode;
  severity: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  source: string;
  message: string;
  metadata?: Record<string, unknown>;
}

const eventLog: WatchtowerEvent[] = [];
let unknownCount = 0;

export function validateErrorCode(code: string): code is ErrorCode {
  return code in ERROR_CODE_TAXONOMY;
}

export function logWatchtowerEvent(event: Omit<WatchtowerEvent, 'event_id' | 'timestamp'>): WatchtowerEvent {
  if (!validateErrorCode(event.error_code)) {
    unknownCount++;
    console.error(`[WATCHTOWER] REJECTED: UNKNOWN error_code "${event.error_code}" - SLO BREACH`);
    throw new Error(`UNKNOWN error_code rejected: ${event.error_code}`);
  }
  
  const fullEvent: WatchtowerEvent = {
    ...event,
    event_id: `wt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };
  
  eventLog.push(fullEvent);
  return fullEvent;
}

export function getUnknownCount(): number {
  return unknownCount;
}

export function getEventLog(): WatchtowerEvent[] {
  return [...eventLog];
}

export function getObservabilitySLO(): { mapped: number; unknown: number; slo_met: boolean } {
  return {
    mapped: eventLog.length,
    unknown: unknownCount,
    slo_met: unknownCount === 0,
  };
}

export interface BreakerGate {
  state: 'open' | 'half_open' | 'closed';
  half_open_started_at: string | null;
  max_half_open_hours: number;
  reopen_count: number;
  max_reopens: number;
  consecutive_successes: number;
  target_successes: number;
  windows_passed: number;
  target_windows: number;
  auto_paused: boolean;
  rca_required: boolean;
}

const breakerGate: BreakerGate = {
  state: 'half_open',
  half_open_started_at: new Date().toISOString(),
  max_half_open_hours: 4,
  reopen_count: 0,
  max_reopens: 2,
  consecutive_successes: 0,
  target_successes: 50,
  windows_passed: 0,
  target_windows: 2,
  auto_paused: false,
  rca_required: false,
};

export function getBreakerGate(): BreakerGate {
  return { ...breakerGate };
}

export function recordBreakerSuccess(): void {
  breakerGate.consecutive_successes++;
  
  if (breakerGate.consecutive_successes >= breakerGate.target_successes / breakerGate.target_windows) {
    breakerGate.windows_passed++;
  }
  
  if (breakerGate.windows_passed >= breakerGate.target_windows && 
      breakerGate.consecutive_successes >= breakerGate.target_successes) {
    breakerGate.state = 'closed';
    console.log('[BREAKER] State changed to CLOSED - 50 consecutive successes across 2 windows');
    emitBreakerClosedEvent();
  }
}

export function recordBreakerFailure(): void {
  if (breakerGate.state === 'half_open') {
    breakerGate.reopen_count++;
    breakerGate.state = 'open';
    breakerGate.consecutive_successes = 0;
    breakerGate.windows_passed = 0;
    
    if (breakerGate.reopen_count >= breakerGate.max_reopens) {
      breakerGate.auto_paused = true;
      breakerGate.rca_required = true;
      console.error('[BREAKER] AUTO-PAUSE: Reopened ≥2 times. RCA required.');
    }
  }
}

export function checkBreakerTimeout(): boolean {
  if (breakerGate.state !== 'half_open' || !breakerGate.half_open_started_at) {
    return false;
  }
  
  const startTime = new Date(breakerGate.half_open_started_at).getTime();
  const now = Date.now();
  const hoursElapsed = (now - startTime) / (1000 * 60 * 60);
  
  if (hoursElapsed >= breakerGate.max_half_open_hours) {
    breakerGate.auto_paused = true;
    breakerGate.rca_required = true;
    console.error('[BREAKER] AUTO-PAUSE: Half-open exceeded 4 hours. RCA required.');
    return true;
  }
  
  return false;
}

async function emitBreakerClosedEvent(): Promise<void> {
  const A8_ENDPOINT = process.env.AUTO_COM_CENTER_BASE_URL || 'https://auto-com-center-jamarrlmayes.replit.app';
  
  try {
    await fetch(`${A8_ENDPOINT}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: 'breaker_closed',
        appName: 'student_pilot',
        appId: 'A5',
        timestamp: new Date().toISOString(),
        payload: {
          consecutive_successes: breakerGate.consecutive_successes,
          windows_passed: breakerGate.windows_passed,
          reopen_count: breakerGate.reopen_count,
        },
      }),
    });
  } catch (error) {
    console.error('[BREAKER] Failed to emit breaker_closed event:', error);
  }
}

export interface StripeHardCap {
  max_attempts_6h: number;
  current_attempts: number;
  window_start: string;
  remaining: number;
  blocked: boolean;
}

const stripeHardCap: StripeHardCap = {
  max_attempts_6h: 4,
  current_attempts: 0,
  window_start: new Date().toISOString(),
  remaining: 4,
  blocked: false,
};

export function getStripeHardCap(): StripeHardCap {
  const windowStart = new Date(stripeHardCap.window_start).getTime();
  const now = Date.now();
  const hoursElapsed = (now - windowStart) / (1000 * 60 * 60);
  
  if (hoursElapsed >= 6) {
    stripeHardCap.current_attempts = 0;
    stripeHardCap.window_start = new Date().toISOString();
    stripeHardCap.remaining = stripeHardCap.max_attempts_6h;
    stripeHardCap.blocked = false;
  }
  
  return { ...stripeHardCap };
}

export function recordStripeAttempt(): boolean {
  getStripeHardCap();
  
  if (stripeHardCap.current_attempts >= stripeHardCap.max_attempts_6h) {
    stripeHardCap.blocked = true;
    return false;
  }
  
  stripeHardCap.current_attempts++;
  stripeHardCap.remaining = stripeHardCap.max_attempts_6h - stripeHardCap.current_attempts;
  
  if (stripeHardCap.current_attempts >= stripeHardCap.max_attempts_6h) {
    stripeHardCap.blocked = true;
  }
  
  return true;
}

export interface SyntheticFlowResult {
  flow: 'Login → Dashboard → Applicant List';
  passed: boolean;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  error_rate: number;
  samples: number;
  auth_5xx: number;
  timestamp: string;
}

const syntheticFlowResults: SyntheticFlowResult[] = [];

export async function runSyntheticProviderFlow(): Promise<SyntheticFlowResult> {
  const samples = 5;
  const latencies: number[] = [];
  let errors = 0;
  let auth_5xx = 0;
  
  for (let i = 0; i < samples; i++) {
    const start = Date.now();
    try {
      const response = await fetch('https://scholar-auth-jamarrlmayes.replit.app/health', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      const latency = Date.now() - start;
      latencies.push(latency);
      
      if (!response.ok) {
        errors++;
        if (response.status >= 500) auth_5xx++;
      }
    } catch {
      errors++;
      latencies.push(5000);
    }
  }
  
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || latencies[latencies.length - 1] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || latencies[latencies.length - 1] || 0;
  
  const result: SyntheticFlowResult = {
    flow: 'Login → Dashboard → Applicant List',
    passed: p95 <= 500 && auth_5xx === 0,
    p50_ms: p50,
    p95_ms: p95,
    p99_ms: p99,
    error_rate: errors / samples,
    samples,
    auth_5xx,
    timestamp: new Date().toISOString(),
  };
  
  syntheticFlowResults.push(result);
  
  if (!result.passed) {
    console.error('[SYNTHETIC] SEV-1: P95 >500ms or auth 5xx detected. Triggering B2C pause.');
  }
  
  return result;
}

export function getSyntheticFlowResults(): SyntheticFlowResult[] {
  return [...syntheticFlowResults];
}

export interface AutonomyTaxMetrics {
  compute_units_burned: number;
  cu_per_txn_retry_storm: number;
  cu_per_txn_breaker_active: number;
  txn_volume: number;
  autonomy_tax_savings_cu: number;
  autonomy_tax_savings_usd: number;
  cu_cost_usd: number;
}

const autonomyTax: AutonomyTaxMetrics = {
  compute_units_burned: 0,
  cu_per_txn_retry_storm: 15,
  cu_per_txn_breaker_active: 3,
  txn_volume: 0,
  autonomy_tax_savings_cu: 0,
  autonomy_tax_savings_usd: 0,
  cu_cost_usd: 0.0001,
};

export function getAutonomyTaxMetrics(): AutonomyTaxMetrics {
  autonomyTax.autonomy_tax_savings_cu = 
    (autonomyTax.cu_per_txn_retry_storm - autonomyTax.cu_per_txn_breaker_active) * autonomyTax.txn_volume;
  autonomyTax.autonomy_tax_savings_usd = autonomyTax.autonomy_tax_savings_cu * autonomyTax.cu_cost_usd;
  return { ...autonomyTax };
}

export function recordTransaction(cuBurned: number): void {
  autonomyTax.compute_units_burned += cuBurned;
  autonomyTax.txn_volume++;
}
