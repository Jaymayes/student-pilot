/**
 * Capacity Monitoring - Gate-2 Stabilization
 * 
 * Phase 3: Event Loop Alert Tuning
 * 
 * Features:
 * - Event loop lag threshold: 300ms (raised from 200ms)
 * - Alert only for sustained >300ms OR ≥2 consecutive samples
 * - Health alert threshold (internal warning): 150ms
 * - Histogram metrics: eventLoop_ms, p50_ms, p95_ms, sample_count, window_sec
 */

interface EventLoopSample {
  timestamp: number;
  lagMs: number;
}

interface EventLoopHistogram {
  eventLoop_ms: number;
  p50_ms: number;
  p95_ms: number;
  sample_count: number;
  window_sec: number;
  max_ms: number;
  min_ms: number;
  mean_ms: number;
}

interface CapacityAlert {
  type: 'warning' | 'critical';
  source: 'event_loop' | 'memory' | 'cpu';
  message: string;
  value: number;
  threshold: number;
  timestamp: string;
  consecutive_breaches: number;
}

interface CapacityStatus {
  event_loop: {
    current_lag_ms: number;
    consecutive_breaches: number;
    alert_active: boolean;
    health_warning: boolean;
    last_sample_at: string | null;
  };
  histogram: EventLoopHistogram;
  alerts: CapacityAlert[];
  thresholds: {
    event_loop_critical_ms: number;
    event_loop_warning_ms: number;
    consecutive_samples_for_alert: number;
  };
}

const EVENT_LOOP_CRITICAL_THRESHOLD_MS = 300;
const EVENT_LOOP_WARNING_THRESHOLD_MS = 150;
const CONSECUTIVE_SAMPLES_FOR_ALERT = 2;
const SAMPLE_INTERVAL_MS = 1000;
const SAMPLE_WINDOW_SIZE = 60;

const eventLoopSamples: EventLoopSample[] = [];
let consecutiveBreaches = 0;
let alertActive = false;
let healthWarning = false;
let lastMeasuredLag = 0;
let lastSampleAt: string | null = null;
let monitoringInterval: NodeJS.Timeout | null = null;

const alertHistory: CapacityAlert[] = [];
const MAX_ALERT_HISTORY = 100;

function measureEventLoopLag(): Promise<number> {
  return new Promise((resolve) => {
    const start = Date.now();
    setImmediate(() => {
      const lag = Date.now() - start;
      resolve(lag);
    });
  });
}

function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)];
}

function calculateHistogram(): EventLoopHistogram {
  const now = Date.now();
  const windowMs = SAMPLE_WINDOW_SIZE * 1000;
  
  const recentSamples = eventLoopSamples.filter(
    s => now - s.timestamp <= windowMs
  );
  
  if (recentSamples.length === 0) {
    return {
      eventLoop_ms: 0,
      p50_ms: 0,
      p95_ms: 0,
      sample_count: 0,
      window_sec: SAMPLE_WINDOW_SIZE,
      max_ms: 0,
      min_ms: 0,
      mean_ms: 0,
    };
  }
  
  const lags = recentSamples.map(s => s.lagMs).sort((a, b) => a - b);
  const sum = lags.reduce((acc, lag) => acc + lag, 0);
  
  return {
    eventLoop_ms: lastMeasuredLag,
    p50_ms: calculatePercentile(lags, 50),
    p95_ms: calculatePercentile(lags, 95),
    sample_count: recentSamples.length,
    window_sec: SAMPLE_WINDOW_SIZE,
    max_ms: lags[lags.length - 1],
    min_ms: lags[0],
    mean_ms: Math.round(sum / lags.length),
  };
}

function emitAlert(alert: CapacityAlert): void {
  alertHistory.push(alert);
  
  if (alertHistory.length > MAX_ALERT_HISTORY) {
    alertHistory.shift();
  }
  
  if (alert.type === 'critical') {
    console.error(`🚨 [CAPACITY ALERT] ${alert.message} | Value: ${alert.value}ms | Threshold: ${alert.threshold}ms | Breaches: ${alert.consecutive_breaches}`);
  } else {
    console.warn(`⚠️ [CAPACITY WARNING] ${alert.message} | Value: ${alert.value}ms | Threshold: ${alert.threshold}ms`);
  }
}

async function collectSample(): Promise<void> {
  const lag = await measureEventLoopLag();
  const now = Date.now();
  
  lastMeasuredLag = lag;
  lastSampleAt = new Date(now).toISOString();
  
  eventLoopSamples.push({ timestamp: now, lagMs: lag });
  
  while (eventLoopSamples.length > SAMPLE_WINDOW_SIZE * 2) {
    eventLoopSamples.shift();
  }
  
  if (lag > EVENT_LOOP_WARNING_THRESHOLD_MS && lag <= EVENT_LOOP_CRITICAL_THRESHOLD_MS) {
    if (!healthWarning) {
      healthWarning = true;
      emitAlert({
        type: 'warning',
        source: 'event_loop',
        message: 'Event loop lag above warning threshold',
        value: lag,
        threshold: EVENT_LOOP_WARNING_THRESHOLD_MS,
        timestamp: lastSampleAt,
        consecutive_breaches: 1,
      });
    }
  } else if (lag <= EVENT_LOOP_WARNING_THRESHOLD_MS) {
    healthWarning = false;
  }
  
  if (lag > EVENT_LOOP_CRITICAL_THRESHOLD_MS) {
    consecutiveBreaches++;
    
    if (consecutiveBreaches >= CONSECUTIVE_SAMPLES_FOR_ALERT && !alertActive) {
      alertActive = true;
      emitAlert({
        type: 'critical',
        source: 'event_loop',
        message: `Sustained event loop lag detected (${consecutiveBreaches} consecutive samples)`,
        value: lag,
        threshold: EVENT_LOOP_CRITICAL_THRESHOLD_MS,
        timestamp: lastSampleAt,
        consecutive_breaches: consecutiveBreaches,
      });
    }
  } else {
    if (consecutiveBreaches > 0 && alertActive) {
      console.log(`✅ [CAPACITY] Event loop recovered after ${consecutiveBreaches} breaches`);
    }
    consecutiveBreaches = 0;
    alertActive = false;
  }
}

export function startCapacityMonitoring(): void {
  if (monitoringInterval) {
    console.log('[Capacity] Monitoring already running');
    return;
  }
  
  monitoringInterval = setInterval(() => {
    collectSample().catch(err => {
      console.error('[Capacity] Sample collection failed:', err);
    });
  }, SAMPLE_INTERVAL_MS);
  
  collectSample().catch(() => {});
  
  console.log(`[Capacity] Started event loop monitoring: critical=${EVENT_LOOP_CRITICAL_THRESHOLD_MS}ms, warning=${EVENT_LOOP_WARNING_THRESHOLD_MS}ms`);
}

export function stopCapacityMonitoring(): void {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    console.log('[Capacity] Stopped event loop monitoring');
  }
}

export function getCapacityStatus(): CapacityStatus {
  return {
    event_loop: {
      current_lag_ms: lastMeasuredLag,
      consecutive_breaches: consecutiveBreaches,
      alert_active: alertActive,
      health_warning: healthWarning,
      last_sample_at: lastSampleAt,
    },
    histogram: calculateHistogram(),
    alerts: alertHistory.slice(-10),
    thresholds: {
      event_loop_critical_ms: EVENT_LOOP_CRITICAL_THRESHOLD_MS,
      event_loop_warning_ms: EVENT_LOOP_WARNING_THRESHOLD_MS,
      consecutive_samples_for_alert: CONSECUTIVE_SAMPLES_FOR_ALERT,
    },
  };
}

export function getEventLoopHistogram(): EventLoopHistogram {
  return calculateHistogram();
}

export function resetCapacityMetrics(): void {
  eventLoopSamples.length = 0;
  consecutiveBreaches = 0;
  alertActive = false;
  healthWarning = false;
  lastMeasuredLag = 0;
  lastSampleAt = null;
  alertHistory.length = 0;
  
  console.log('[Capacity] Metrics reset');
}

export function isEventLoopHealthy(): boolean {
  return !alertActive && !healthWarning;
}

export function isEventLoopCritical(): boolean {
  return alertActive;
}

export const CAPACITY_THRESHOLDS = {
  EVENT_LOOP_CRITICAL_THRESHOLD_MS,
  EVENT_LOOP_WARNING_THRESHOLD_MS,
  CONSECUTIVE_SAMPLES_FOR_ALERT,
  SAMPLE_INTERVAL_MS,
  SAMPLE_WINDOW_SIZE,
};
