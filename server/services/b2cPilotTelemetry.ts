/**
 * B2C Pilot Telemetry Service
 * 
 * Executive Implementation Order SAA-EO-2026-01-19-01
 * 
 * A8 telemetry fields required on every charge/refund:
 * run_id=ZT3G-056, cohort_id=B2C-PILOT-001, event_type, status, 
 * trace_id, checksum, latency_ms, refund_settled_at
 */

import crypto from 'crypto';
import { B2C_PILOT_CONFIG, FEATURE_FLAGS, isSafetyLockActive } from '../config/featureFlags';

export interface ChargeEvent {
  event_type: 'charge';
  user_id: string;
  amount_cents: number;
  credits: number;
  stripe_payment_intent_id?: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  error_code?: string;
}

export interface RefundEvent {
  event_type: 'refund';
  user_id: string;
  original_charge_id: string;
  amount_cents: number;
  status: 'pending' | 'succeeded' | 'failed';
  refund_settled_at?: string;
  settlement_time_ms?: number;
}

export interface PilotTelemetryPayload {
  run_id: string;
  cohort_id: string;
  event_type: 'charge' | 'refund';
  status: string;
  trace_id: string;
  checksum: string;
  latency_ms: number;
  refund_settled_at?: string;
  user_id: string;
  amount_cents: number;
  credits?: number;
  safety_lock_active: boolean;
  within_budget: boolean;
  timestamp: string;
}

const pilotMetrics = {
  charges_attempted: 0,
  charges_succeeded: 0,
  charges_failed: 0,
  refunds_requested: 0,
  refunds_settled: 0,
  total_charged_cents: 0,
  total_refunded_cents: 0,
  pilot_users: new Set<string>(),
  latencies: [] as number[],
};

function generateTraceId(): string {
  return `trace_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function generateChecksum(payload: Record<string, unknown>): string {
  const serialized = JSON.stringify(payload);
  return crypto.createHash('sha256').update(serialized).digest('hex').substring(0, 16);
}

export function isWithinPilotBudget(): boolean {
  const currentSpendCents = pilotMetrics.total_charged_cents - pilotMetrics.total_refunded_cents;
  const currentUsers = pilotMetrics.pilot_users.size;
  return (
    currentSpendCents < B2C_PILOT_CONFIG.budget.max_usd * 100 &&
    currentUsers < B2C_PILOT_CONFIG.budget.max_users
  );
}

export async function emitChargeEvent(event: ChargeEvent, startTime: number): Promise<PilotTelemetryPayload> {
  const latencyMs = Date.now() - startTime;
  const traceId = generateTraceId();
  
  pilotMetrics.charges_attempted++;
  if (event.status === 'succeeded') {
    pilotMetrics.charges_succeeded++;
    pilotMetrics.total_charged_cents += event.amount_cents;
    pilotMetrics.pilot_users.add(event.user_id);
  } else if (event.status === 'failed') {
    pilotMetrics.charges_failed++;
  }
  pilotMetrics.latencies.push(latencyMs);
  
  const payload: PilotTelemetryPayload = {
    run_id: B2C_PILOT_CONFIG.run_id,
    cohort_id: B2C_PILOT_CONFIG.cohort_id,
    event_type: 'charge',
    status: event.status,
    trace_id: traceId,
    checksum: generateChecksum({ ...event, trace_id: traceId }),
    latency_ms: latencyMs,
    user_id: event.user_id,
    amount_cents: event.amount_cents,
    credits: event.credits,
    safety_lock_active: isSafetyLockActive(),
    within_budget: isWithinPilotBudget(),
    timestamp: new Date().toISOString(),
  };
  
  await sendToA8(payload);
  
  return payload;
}

export async function emitRefundEvent(event: RefundEvent, startTime: number): Promise<PilotTelemetryPayload> {
  const latencyMs = Date.now() - startTime;
  const traceId = generateTraceId();
  
  pilotMetrics.refunds_requested++;
  if (event.status === 'succeeded') {
    pilotMetrics.refunds_settled++;
    pilotMetrics.total_refunded_cents += event.amount_cents;
  }
  
  const payload: PilotTelemetryPayload = {
    run_id: B2C_PILOT_CONFIG.run_id,
    cohort_id: B2C_PILOT_CONFIG.cohort_id,
    event_type: 'refund',
    status: event.status,
    trace_id: traceId,
    checksum: generateChecksum({ ...event, trace_id: traceId }),
    latency_ms: latencyMs,
    refund_settled_at: event.refund_settled_at,
    user_id: event.user_id,
    amount_cents: event.amount_cents,
    safety_lock_active: isSafetyLockActive(),
    within_budget: isWithinPilotBudget(),
    timestamp: new Date().toISOString(),
  };
  
  await sendToA8(payload);
  
  return payload;
}

async function sendToA8(payload: PilotTelemetryPayload): Promise<void> {
  const A8_ENDPOINT = process.env.AUTO_COM_CENTER_BASE_URL || 'https://auto-com-center-jamarrlmayes.replit.app';
  
  try {
    await fetch(`${A8_ENDPOINT}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Trace-Id': payload.trace_id,
        'X-Idempotency-Key': payload.checksum,
      },
      body: JSON.stringify({
        eventName: `b2c_pilot_${payload.event_type}`,
        appName: 'student_pilot',
        appId: 'A5',
        timestamp: payload.timestamp,
        payload,
      }),
    });
  } catch (error) {
    console.log('[B2C Pilot] Failed to emit to A8 (non-blocking)');
  }
}

export function getPilotMetrics(): {
  auth_success_rate: number;
  refund_settlement_rate: number;
  p95_latency_ms: number;
  total_users: number;
  net_revenue_cents: number;
  within_budget: boolean;
} {
  const authRate = pilotMetrics.charges_attempted > 0
    ? pilotMetrics.charges_succeeded / pilotMetrics.charges_attempted
    : 1;
  
  const refundRate = pilotMetrics.refunds_requested > 0
    ? pilotMetrics.refunds_settled / pilotMetrics.refunds_requested
    : 1;
  
  const sortedLatencies = [...pilotMetrics.latencies].sort((a, b) => a - b);
  const p95Index = Math.floor(sortedLatencies.length * 0.95);
  const p95 = sortedLatencies[p95Index] || 0;
  
  return {
    auth_success_rate: authRate,
    refund_settlement_rate: refundRate,
    p95_latency_ms: p95,
    total_users: pilotMetrics.pilot_users.size,
    net_revenue_cents: pilotMetrics.total_charged_cents - pilotMetrics.total_refunded_cents,
    within_budget: isWithinPilotBudget(),
  };
}
