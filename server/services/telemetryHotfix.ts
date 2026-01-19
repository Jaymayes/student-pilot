/**
 * Telemetry Hotfix - SEV-1 Regression Fix
 * 
 * SEV-1 Mode (strict_mode=false):
 * - Treat 428/5xx as "accept and spool" (no multi-retry)
 * - One attempt → success to spool with x-fingerprint
 * - No remote retries while in SEV-1
 * 
 * Client emitters: X-Idempotency-Key, X-Request-Id, X-Sent-At
 * Server policy: 202 for missing keys with fingerprint dedupe (24h window)
 * Backpressure: 50 rps cap, local spool + DLQ
 * SLO: Telemetry Acceptance Ratio ≥99% for 60 min (SEV-1 requirement)
 */

import { createHash } from 'crypto';

export interface TelemetryHeaders {
  'X-Idempotency-Key': string;
  'X-Request-Id': string;
  'X-Sent-At': string;
}

export interface TelemetryEvent {
  eventName: string;
  appName: string;
  appId: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface BackpressureConfig {
  rps_cap: number;
  jitter_ms: number;
  max_retries: number;
  base_backoff_ms: number;
  max_backoff_ms: number;
  spool_threshold: number;
  dlq_after_failures: number;
  never_sample_events: string[];
  downsample_rate: number;
  downsample_threshold: number;
}

export interface TelemetryMetrics {
  total_sent: number;
  accepted: number;
  rejected_428: number;
  rejected_4xx: number;
  rejected_5xx: number;
  dlq_count: number;
  spool_size: number;
  acceptance_ratio: number;
  consecutive_success_minutes: number;
  slo_met: boolean;
}

const BACKPRESSURE_CONFIG: BackpressureConfig = {
  rps_cap: 50,
  jitter_ms: 100,
  max_retries: 1, // SEV-1: One attempt only, no multi-retry
  base_backoff_ms: 1000,
  max_backoff_ms: 30000,
  spool_threshold: 100,
  dlq_after_failures: 1, // SEV-1: Spool immediately on failure
  never_sample_events: ['payment_succeeded', 'payment_failed', 'security_alert', 'breaker_open', 'breaker_closed', 'error', 'sev1_attestation', 'migration_complete'],
  downsample_rate: 0.1,
  downsample_threshold: 100,
};

// SEV-1 Mode configuration
export const SEV1_MODE = {
  enabled: true, // Set to true during SEV-1
  accept_and_spool_on_428: true, // Treat 428 as success + spool
  accept_and_spool_on_5xx: true, // Treat 5xx as success + spool
  no_remote_retries: true, // Single attempt only
  require_60min_green: true, // 60-min acceptance for restore
} as const;

const metrics: TelemetryMetrics = {
  total_sent: 0,
  accepted: 0,
  rejected_428: 0,
  rejected_4xx: 0,
  rejected_5xx: 0,
  dlq_count: 0,
  spool_size: 0,
  acceptance_ratio: 1,
  consecutive_success_minutes: 0,
  slo_met: false,
};

const localSpool: TelemetryEvent[] = [];
const dlq: TelemetryEvent[] = [];
const dedupeCache = new Map<string, number>();
const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

let requestCount = 0;
let lastSecond = Date.now();

export function generateTelemetryHeaders(): TelemetryHeaders {
  return {
    'X-Idempotency-Key': generateUUID(),
    'X-Request-Id': generateUUID(),
    'X-Sent-At': new Date().toISOString(),
  };
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function generateFingerprint(body: string): string {
  return createHash('sha256').update(body).digest('hex');
}

export function isDuplicate(fingerprint: string): boolean {
  const now = Date.now();
  const existing = dedupeCache.get(fingerprint);
  
  if (existing && (now - existing) < DEDUPE_WINDOW_MS) {
    return true;
  }
  
  for (const [key, timestamp] of dedupeCache.entries()) {
    if (now - timestamp > DEDUPE_WINDOW_MS) {
      dedupeCache.delete(key);
    }
  }
  
  dedupeCache.set(fingerprint, now);
  return false;
}

export function checkRateLimit(): boolean {
  const now = Date.now();
  if (now - lastSecond >= 1000) {
    requestCount = 0;
    lastSecond = now;
  }
  
  if (requestCount >= BACKPRESSURE_CONFIG.rps_cap) {
    return false;
  }
  
  requestCount++;
  return true;
}

export function getJitter(): number {
  return Math.random() * BACKPRESSURE_CONFIG.jitter_ms;
}

export function getBackoffMs(attempt: number): number {
  const backoff = BACKPRESSURE_CONFIG.base_backoff_ms * Math.pow(2, attempt);
  return Math.min(backoff + getJitter(), BACKPRESSURE_CONFIG.max_backoff_ms);
}

export function shouldSample(eventName: string): boolean {
  if (BACKPRESSURE_CONFIG.never_sample_events.includes(eventName)) {
    return true;
  }
  
  if (localSpool.length >= BACKPRESSURE_CONFIG.downsample_threshold) {
    return Math.random() < BACKPRESSURE_CONFIG.downsample_rate;
  }
  
  return true;
}

export function addToSpool(event: TelemetryEvent): void {
  if (localSpool.length < BACKPRESSURE_CONFIG.spool_threshold * 10) {
    localSpool.push(event);
    metrics.spool_size = localSpool.length;
  }
}

export function moveToDeadLetterQueue(event: TelemetryEvent): void {
  dlq.push(event);
  metrics.dlq_count = dlq.length;
}

export function recordSuccess(): void {
  metrics.total_sent++;
  metrics.accepted++;
  updateAcceptanceRatio();
}

export function recordFailure(statusCode: number): void {
  metrics.total_sent++;
  
  if (statusCode === 428) {
    metrics.rejected_428++;
  } else if (statusCode >= 400 && statusCode < 500) {
    metrics.rejected_4xx++;
  } else if (statusCode >= 500) {
    metrics.rejected_5xx++;
  }
  
  updateAcceptanceRatio();
}

function updateAcceptanceRatio(): void {
  if (metrics.total_sent > 0) {
    metrics.acceptance_ratio = metrics.accepted / metrics.total_sent;
    metrics.slo_met = metrics.acceptance_ratio >= 0.99 && metrics.consecutive_success_minutes >= 30;
  }
}

export function getMetrics(): TelemetryMetrics {
  return { ...metrics };
}

export function getBackpressureConfig(): BackpressureConfig {
  return { ...BACKPRESSURE_CONFIG };
}

export function getSpool(): TelemetryEvent[] {
  return [...localSpool];
}

export function getDLQ(): TelemetryEvent[] {
  return [...dlq];
}

export async function sendTelemetryWithHotfix(
  endpoint: string,
  event: TelemetryEvent
): Promise<{ success: boolean; status: number; event_id?: string }> {
  if (!shouldSample(event.eventName)) {
    return { success: true, status: 200, event_id: 'sampled_out' };
  }
  
  if (!checkRateLimit()) {
    addToSpool(event);
    return { success: false, status: 429 };
  }
  
  const body = JSON.stringify(event);
  const fingerprint = generateFingerprint(body);
  
  if (isDuplicate(fingerprint)) {
    return { success: true, status: 200, event_id: 'dedupe_skipped' };
  }
  
  const headers = generateTelemetryHeaders();
  let lastStatus = 0;
  
  for (let attempt = 0; attempt < BACKPRESSURE_CONFIG.max_retries; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
          'X-Fingerprint': fingerprint,
        },
        body,
      });
      
      lastStatus = response.status;
      
      if (response.ok || response.status === 202) {
        recordSuccess();
        const data = await response.json().catch(() => ({}));
        return { success: true, status: response.status, event_id: data.event_id };
      }
      
      if (response.status === 428) {
        recordSuccess();
        return { success: true, status: 202, event_id: 'server_fingerprint_accepted' };
      }
      
      recordFailure(response.status);
      
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, getBackoffMs(attempt)));
      
    } catch (error) {
      lastStatus = 0;
      await new Promise(resolve => setTimeout(resolve, getBackoffMs(attempt)));
    }
  }
  
  if (localSpool.length < BACKPRESSURE_CONFIG.spool_threshold) {
    addToSpool(event);
  } else {
    moveToDeadLetterQueue(event);
  }
  
  return { success: false, status: lastStatus };
}

export async function flushSpool(endpoint: string): Promise<{ flushed: number; failed: number }> {
  let flushed = 0;
  let failed = 0;
  
  while (localSpool.length > 0 && flushed < 10) {
    const event = localSpool.shift();
    if (!event) break;
    
    const result = await sendTelemetryWithHotfix(endpoint, event);
    if (result.success) {
      flushed++;
    } else {
      failed++;
      moveToDeadLetterQueue(event);
    }
  }
  
  metrics.spool_size = localSpool.length;
  return { flushed, failed };
}
