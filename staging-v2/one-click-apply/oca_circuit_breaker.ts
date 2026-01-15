import { env } from '../../server/environment';
import { db } from '../../server/db';
import { providerBacklog } from '../../shared/schema';
import { eq, lt, and, sql } from 'drizzle-orm';

const A8_BASE_URL = env.AUTO_COM_CENTER_BASE_URL || 'https://auto-com-center-jamarrlmayes.replit.app';
const A6_BASE_URL = process.env.A6_PROVIDER_BASE_URL || 'https://provider-app-jamarrlmayes.replit.app';

export type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  failureWindowMs: number;
  openDurationMs: number;
  halfOpenProbeIntervalMs: number;
  successesToClose: number;
}

export interface BreakerMetrics {
  state: BreakerState;
  failuresLast5m: number;
  openCount1h: number;
  backlogDepth: number;
  dlqDepth: number;
  callP95Ms: number;
  callErrorRate: number;
  lastStateChange: string;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  failureWindowMs: 60 * 1000,
  openDurationMs: 5 * 60 * 1000,
  halfOpenProbeIntervalMs: 30 * 1000,
  successesToClose: 2
};

function isFeatureEnabled(): boolean {
  return env.FEATURE_CIRCUIT_BREAKER_ENABLED === 'true';
}

class A3ToA6CircuitBreaker {
  private static instance: A3ToA6CircuitBreaker;
  
  private state: BreakerState = 'CLOSED';
  private config: CircuitBreakerConfig = DEFAULT_CONFIG;
  
  private recentFailures: number[] = [];
  private consecutiveSuccesses: number = 0;
  private openCount1h: number = 0;
  private lastOpenTime: number = 0;
  private lastStateChange: string = new Date().toISOString();
  
  private callLatencies: number[] = [];
  private callErrors: number = 0;
  private callTotal: number = 0;
  
  private telemetryInterval: NodeJS.Timeout | null = null;
  private retryInterval: NodeJS.Timeout | null = null;
  private probeInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): A3ToA6CircuitBreaker {
    if (!A3ToA6CircuitBreaker.instance) {
      A3ToA6CircuitBreaker.instance = new A3ToA6CircuitBreaker();
    }
    return A3ToA6CircuitBreaker.instance;
  }

  isEnabled(): boolean {
    return isFeatureEnabled();
  }

  enable(config?: Partial<CircuitBreakerConfig>): void {
    if (!isFeatureEnabled()) {
      console.log('⚠️ Circuit breaker flag is OFF, not enabling');
      return;
    }
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startTelemetry();
    this.startRetryProcessor();
    console.log('🔌 A3→A6 Circuit Breaker ENABLED (flag: ON)');
  }

  disable(): void {
    if (this.telemetryInterval) clearInterval(this.telemetryInterval);
    if (this.retryInterval) clearInterval(this.retryInterval);
    if (this.probeInterval) clearInterval(this.probeInterval);
    console.log('🔌 A3→A6 Circuit Breaker DISABLED');
  }

  getState(): BreakerState {
    return this.state;
  }

  private setState(newState: BreakerState): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = new Date().toISOString();
    
    console.log(`⚡ Circuit Breaker: ${oldState} → ${newState}`);
    
    if (newState === 'OPEN') {
      this.openCount1h++;
      this.lastOpenTime = Date.now();
      this.startHalfOpenProbe();
    }
    
    if (newState === 'CLOSED') {
      this.consecutiveSuccesses = 0;
      if (this.probeInterval) {
        clearInterval(this.probeInterval);
        this.probeInterval = null;
      }
    }
  }

  private recordFailure(): void {
    const now = Date.now();
    this.recentFailures.push(now);
    this.recentFailures = this.recentFailures.filter(t => now - t < this.config.failureWindowMs);
    this.callErrors++;
    this.consecutiveSuccesses = 0;

    if (this.state === 'CLOSED' && this.recentFailures.length >= this.config.failureThreshold) {
      this.setState('OPEN');
    } else if (this.state === 'HALF_OPEN') {
      this.setState('OPEN');
    }
  }

  private recordSuccess(latencyMs: number): void {
    this.callLatencies.push(latencyMs);
    if (this.callLatencies.length > 1000) {
      this.callLatencies = this.callLatencies.slice(-500);
    }

    if (this.state === 'HALF_OPEN') {
      this.consecutiveSuccesses++;
      if (this.consecutiveSuccesses >= this.config.successesToClose) {
        this.setState('CLOSED');
      }
    }
  }

  private startHalfOpenProbe(): void {
    if (this.probeInterval) clearInterval(this.probeInterval);

    setTimeout(() => {
      if (this.state === 'OPEN') {
        this.setState('HALF_OPEN');
      }
    }, this.config.openDurationMs);

    this.probeInterval = setInterval(() => {
      if (this.state === 'HALF_OPEN') {
        this.sendProbe();
      }
    }, this.config.halfOpenProbeIntervalMs);
  }

  private async sendProbe(): Promise<void> {
    try {
      const start = Date.now();
      const response = await fetch(`${A6_BASE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      const latency = Date.now() - start;

      if (response.ok) {
        this.recordSuccess(latency);
        console.log(`🔍 Probe success: ${latency}ms`);
      } else {
        this.recordFailure();
        console.log(`🔍 Probe failed: HTTP ${response.status}`);
      }
    } catch (error) {
      this.recordFailure();
      console.log('🔍 Probe failed: network error');
    }
  }

  async callA6<T>(
    endpoint: string,
    payload: Record<string, unknown>,
    idempotencyKey: string
  ): Promise<{ success: boolean; data?: T; queued?: boolean }> {
    if (!this.isEnabled()) {
      return this.directCall<T>(endpoint, payload);
    }

    this.callTotal++;

    if (this.state === 'OPEN') {
      await this.enqueue(endpoint, payload, idempotencyKey);
      return { success: true, queued: true };
    }

    const result = await this.directCall<T>(endpoint, payload);

    if (!result.success) {
      this.recordFailure();
      
      const currentState = this.getState();
      if (currentState === 'OPEN') {
        await this.enqueue(endpoint, payload, idempotencyKey);
        return { success: true, queued: true };
      }
    }

    return result;
  }

  private async directCall<T>(
    endpoint: string,
    payload: Record<string, unknown>
  ): Promise<{ success: boolean; data?: T }> {
    const start = Date.now();
    
    try {
      const response = await fetch(`${A6_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(2000)
      });

      const latency = Date.now() - start;
      
      if (response.ok) {
        this.recordSuccess(latency);
        const data = await response.json() as T;
        return { success: true, data };
      } else {
        return { success: false };
      }
    } catch (error) {
      return { success: false };
    }
  }

  private async enqueue(endpoint: string, payload: Record<string, unknown>, idempotencyKey: string): Promise<void> {
    try {
      const existing = await db.select()
        .from(providerBacklog)
        .where(eq(providerBacklog.idempotencyKey, idempotencyKey))
        .limit(1);

      if (existing.length > 0) {
        console.log(`📋 Duplicate enqueue skipped: ${idempotencyKey}`);
        return;
      }

      const nextRetryAt = this.calculateNextRetry(0);

      await db.insert(providerBacklog).values({
        idempotencyKey,
        payloadJson: JSON.stringify(payload),
        endpoint,
        firstSeenAt: new Date(),
        nextRetryAt: new Date(nextRetryAt),
        attempts: 0,
        status: 'pending'
      });

      console.log(`📋 Enqueued to DB: ${idempotencyKey}`);
    } catch (error) {
      console.error('❌ Failed to enqueue:', error);
    }
  }

  private calculateNextRetry(attempts: number): string {
    const baseMs = 30 * 1000;
    const capMs = 15 * 60 * 1000;
    const jitter = Math.random();
    const delay = Math.min(baseMs * Math.pow(2, attempts) * jitter, capMs);
    return new Date(Date.now() + delay).toISOString();
  }

  private startRetryProcessor(): void {
    if (this.retryInterval) clearInterval(this.retryInterval);

    this.retryInterval = setInterval(async () => {
      if (this.state !== 'CLOSED') return;

      try {
        const now = new Date();
        const toProcess = await db.select()
          .from(providerBacklog)
          .where(and(
            eq(providerBacklog.status, 'pending'),
            lt(providerBacklog.nextRetryAt, now)
          ))
          .limit(5);

        for (const entry of toProcess) {
          await this.processBacklogEntry(entry);
        }
      } catch (error) {
        console.error('❌ Retry processor error:', error);
      }
    }, 5000);
  }

  private async processBacklogEntry(entry: typeof providerBacklog.$inferSelect): Promise<void> {
    const newAttempts = entry.attempts + 1;

    await db.update(providerBacklog)
      .set({ status: 'processing', attempts: newAttempts, updatedAt: new Date() })
      .where(eq(providerBacklog.id, entry.id));

    try {
      const payload = JSON.parse(entry.payloadJson);
      const response = await fetch(`${A6_BASE_URL}${entry.endpoint}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Idempotency-Key': entry.idempotencyKey
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(2000)
      });

      if (response.ok) {
        await db.update(providerBacklog)
          .set({ status: 'completed', updatedAt: new Date() })
          .where(eq(providerBacklog.id, entry.id));
        console.log(`✅ Backlog processed: ${entry.idempotencyKey}`);
      } else {
        await this.handleRetryFailure(entry, newAttempts, `HTTP ${response.status}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await this.handleRetryFailure(entry, newAttempts, errorMsg);
    }
  }

  private async handleRetryFailure(
    entry: typeof providerBacklog.$inferSelect, 
    attempts: number,
    errorMsg: string
  ): Promise<void> {
    const maxAttempts = 10;

    if (attempts >= maxAttempts) {
      await db.update(providerBacklog)
        .set({ status: 'dead_letter', lastError: errorMsg, updatedAt: new Date() })
        .where(eq(providerBacklog.id, entry.id));
      console.log(`💀 Dead-lettered: ${entry.idempotencyKey}`);
      await this.emitDlqAlert(entry);
    } else {
      const nextRetryAt = new Date(this.calculateNextRetry(attempts));
      await db.update(providerBacklog)
        .set({ status: 'pending', nextRetryAt, lastError: errorMsg, updatedAt: new Date() })
        .where(eq(providerBacklog.id, entry.id));
      console.log(`🔄 Retry scheduled: ${entry.idempotencyKey} (attempt ${attempts})`);
    }
  }

  private async emitDlqAlert(entry: typeof providerBacklog.$inferSelect): Promise<void> {
    try {
      const dlqCount = await db.select({ count: sql<number>`count(*)` })
        .from(providerBacklog)
        .where(eq(providerBacklog.status, 'dead_letter'));

      await fetch(`${A8_BASE_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'oca_backlog_dead_letter',
          app_id: 'A5',
          timestamp: new Date().toISOString(),
          data: {
            idempotencyKey: entry.idempotencyKey,
            endpoint: entry.endpoint,
            attempts: entry.attempts,
            firstSeenAt: entry.firstSeenAt,
            dlq_depth: dlqCount[0]?.count || 0
          }
        })
      });
    } catch (error) {
      console.error('Failed to emit DLQ alert:', error);
    }
  }

  private startTelemetry(): void {
    if (this.telemetryInterval) clearInterval(this.telemetryInterval);

    setInterval(() => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      if (this.lastOpenTime < oneHourAgo) {
        this.openCount1h = 0;
      }
    }, 60 * 1000);

    this.telemetryInterval = setInterval(async () => {
      await this.emitTelemetry();
    }, 60 * 1000);
  }

  async getMetrics(): Promise<BreakerMetrics> {
    const now = Date.now();
    const failuresLast5m = this.recentFailures.filter(t => now - t < 5 * 60 * 1000).length;
    
    const sortedLatencies = [...this.callLatencies].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedLatencies.length * 0.95);
    const p95 = sortedLatencies[p95Index] || 0;

    const errorRate = this.callTotal > 0 ? this.callErrors / this.callTotal : 0;

    let backlogDepth = 0;
    let dlqDepth = 0;
    
    try {
      const backlogCount = await db.select({ count: sql<number>`count(*)` })
        .from(providerBacklog)
        .where(eq(providerBacklog.status, 'pending'));
      backlogDepth = backlogCount[0]?.count || 0;

      const dlqCount = await db.select({ count: sql<number>`count(*)` })
        .from(providerBacklog)
        .where(eq(providerBacklog.status, 'dead_letter'));
      dlqDepth = dlqCount[0]?.count || 0;
    } catch (error) {
      console.error('Failed to get backlog metrics:', error);
    }

    return {
      state: this.state,
      failuresLast5m,
      openCount1h: this.openCount1h,
      backlogDepth,
      dlqDepth,
      callP95Ms: p95,
      callErrorRate: errorRate,
      lastStateChange: this.lastStateChange
    };
  }

  private async emitTelemetry(): Promise<void> {
    const metrics = await this.getMetrics();

    try {
      await fetch(`${A8_BASE_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'oca_circuit_breaker_metrics',
          app_id: 'A5',
          timestamp: new Date().toISOString(),
          data: {
            breaker_state: metrics.state,
            failures_last_5m: metrics.failuresLast5m,
            open_count_1h: metrics.openCount1h,
            provider_backlog_depth: metrics.backlogDepth,
            dlq_depth: metrics.dlqDepth,
            a3_call_p95_ms_to_a6: metrics.callP95Ms,
            a3_call_error_rate_to_a6: metrics.callErrorRate,
            feature_flag: this.isEnabled()
          }
        })
      });
    } catch (error) {
      console.error('Failed to emit breaker telemetry:', error);
    }

    if (metrics.backlogDepth >= 10 && metrics.backlogDepth <= 30) {
      console.log(`⚠️ THROTTLE: backlog_depth=${metrics.backlogDepth}`);
    }
    if (metrics.backlogDepth > 30 || metrics.callP95Ms >= 1500 || metrics.callErrorRate >= 0.01) {
      console.log(`🚨 KILL TRIGGER: backlog=${metrics.backlogDepth}, P95=${metrics.callP95Ms}ms, error=${(metrics.callErrorRate * 100).toFixed(2)}%`);
    }
  }

  async shouldThrottle(): Promise<boolean> {
    const metrics = await this.getMetrics();
    return (metrics.backlogDepth >= 10 && metrics.backlogDepth <= 30) || 
           (metrics.callP95Ms >= 1250 && metrics.callP95Ms < 1500);
  }

  async shouldKill(): Promise<boolean> {
    const metrics = await this.getMetrics();
    return metrics.backlogDepth > 30 || 
           metrics.callP95Ms >= 1500 || 
           metrics.callErrorRate >= 0.01;
  }
}

export const circuitBreaker = A3ToA6CircuitBreaker.getInstance();

export async function registerProviderWithBreaker(
  providerData: Record<string, unknown>,
  idempotencyKey: string
): Promise<{ success: boolean; queued: boolean; providerId?: string }> {
  const result = await circuitBreaker.callA6<{ providerId: string }>(
    '/provider/register',
    providerData,
    idempotencyKey
  );

  return {
    success: result.success,
    queued: result.queued || false,
    providerId: result.data?.providerId
  };
}

export async function initializeCircuitBreaker(): Promise<void> {
  if (!isFeatureEnabled()) {
    console.log('⚠️ FEATURE_CIRCUIT_BREAKER_ENABLED is OFF, circuit breaker not initialized');
    
    await fetch(`${A8_BASE_URL}/events`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `breaker-skip-${Date.now()}`
      },
      body: JSON.stringify({
        event_type: 'oca_circuit_breaker_skipped',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: {
          reason: 'feature_flag_off',
          flag: 'FEATURE_CIRCUIT_BREAKER_ENABLED'
        }
      })
    });
    return;
  }

  circuitBreaker.enable();

  await fetch(`${A8_BASE_URL}/events`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `breaker-init-${Date.now()}`
    },
    body: JSON.stringify({
      event_type: 'oca_circuit_breaker_initialized',
      app_id: 'A5',
      timestamp: new Date().toISOString(),
      data: {
        state: circuitBreaker.getState(),
        enabled: circuitBreaker.isEnabled(),
        feature_flag: 'FEATURE_CIRCUIT_BREAKER_ENABLED=true',
        storage: 'postgres:provider_backlog',
        config: {
          failureThreshold: 3,
          failureWindowMs: 60000,
          openDurationMs: 300000,
          halfOpenProbeIntervalMs: 30000,
          successesToClose: 2
        },
        endpoints_protected: ['/provider/register'],
        guardrails: {
          throttle: 'backlog_10_30_or_p95_1.25_1.5s',
          kill: 'backlog_30_or_p95_1.5s_or_error_1pct'
        }
      }
    })
  });

  console.log('🔌 A3→A6 Circuit Breaker initialized with persistent storage (flag: ON)');
}
