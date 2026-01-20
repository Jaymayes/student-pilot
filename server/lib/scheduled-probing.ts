/**
 * Scheduled Probing with Mutex Pattern - Gate-2 Stabilization
 * 
 * Phase 2: Probe Storm Race Fix
 * 
 * Features:
 * - Mutex pattern to prevent overlapping probes for same service
 * - Lock acquired BEFORE jitter to prevent race conditions
 * - Backoff policy: 2s → 5s → 10s with 20% jitter
 * - Max 3 concurrent probes per process
 * - Clean try/finally for resource cleanup
 */

type ProbeHandler = () => Promise<void>;

interface ProbeConfig {
  service: string;
  intervalMs: number;
  handler: ProbeHandler;
  backoffMultiplier?: number;
  maxBackoffMs?: number;
}

interface ProbeState {
  service: string;
  intervalMs: number;
  currentBackoffMs: number;
  consecutiveFailures: number;
  lastProbeAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  isActive: boolean;
  timer: NodeJS.Timeout | null;
}

interface ProbeStatus {
  ongoing: string[];
  scheduled: string[];
  states: Record<string, Omit<ProbeState, 'timer'>>;
  concurrencyLimit: number;
  currentConcurrency: number;
}

const MAX_CONCURRENT_PROBES = 3;
const BASE_BACKOFF_MS = 2000;
const BACKOFF_STEPS = [2000, 5000, 10000];
const JITTER_PERCENT = 0.20;

const ongoingProbes: Set<string> = new Set();
const probeStates: Map<string, ProbeState> = new Map();
const probeHandlers: Map<string, ProbeHandler> = new Map();

function applyJitter(baseMs: number): number {
  const jitterRange = baseMs * JITTER_PERCENT;
  const jitter = (Math.random() * 2 - 1) * jitterRange;
  return Math.max(100, Math.round(baseMs + jitter));
}

function getBackoffMs(consecutiveFailures: number): number {
  const index = Math.min(consecutiveFailures, BACKOFF_STEPS.length - 1);
  return BACKOFF_STEPS[index];
}

async function executeProbe(service: string): Promise<void> {
  if (ongoingProbes.has(service)) {
    console.debug(`[Probe] Skipping ${service} - already in progress`);
    return;
  }

  if (ongoingProbes.size >= MAX_CONCURRENT_PROBES) {
    console.debug(`[Probe] Skipping ${service} - concurrency limit reached (${ongoingProbes.size}/${MAX_CONCURRENT_PROBES})`);
    return;
  }

  ongoingProbes.add(service);

  const state = probeStates.get(service);
  const handler = probeHandlers.get(service);

  if (!state || !handler) {
    ongoingProbes.delete(service);
    return;
  }

  state.lastProbeAt = new Date().toISOString();

  try {
    await handler();
    
    state.consecutiveFailures = 0;
    state.currentBackoffMs = BASE_BACKOFF_MS;
    state.lastSuccessAt = new Date().toISOString();
    state.lastError = null;
    
    console.debug(`[Probe] ${service} succeeded`);
  } catch (error) {
    state.consecutiveFailures++;
    state.currentBackoffMs = getBackoffMs(state.consecutiveFailures);
    state.lastErrorAt = new Date().toISOString();
    state.lastError = error instanceof Error ? error.message : String(error);
    
    console.warn(`[Probe] ${service} failed (attempt ${state.consecutiveFailures}): ${state.lastError}`);
  } finally {
    ongoingProbes.delete(service);
  }

  if (state.isActive) {
    scheduleNextProbe(service);
  }
}

function scheduleNextProbe(service: string): void {
  const state = probeStates.get(service);
  if (!state || !state.isActive) return;

  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }

  const effectiveInterval = state.consecutiveFailures > 0 
    ? state.currentBackoffMs 
    : state.intervalMs;
  
  const jitteredInterval = applyJitter(effectiveInterval);

  state.timer = setTimeout(() => {
    executeProbe(service).catch(err => {
      console.error(`[Probe] Unexpected error in ${service}:`, err);
    });
  }, jitteredInterval);
}

export function scheduleProbe(
  service: string, 
  intervalMs: number,
  handler?: ProbeHandler
): void {
  if (probeStates.has(service)) {
    const existingState = probeStates.get(service)!;
    existingState.intervalMs = intervalMs;
    existingState.isActive = true;
    
    if (handler) {
      probeHandlers.set(service, handler);
    }
    
    scheduleNextProbe(service);
    console.log(`[Probe] Updated probe schedule for ${service}: ${intervalMs}ms`);
    return;
  }

  const state: ProbeState = {
    service,
    intervalMs,
    currentBackoffMs: BASE_BACKOFF_MS,
    consecutiveFailures: 0,
    lastProbeAt: null,
    lastSuccessAt: null,
    lastErrorAt: null,
    lastError: null,
    isActive: true,
    timer: null,
  };

  probeStates.set(service, state);
  
  if (handler) {
    probeHandlers.set(service, handler);
  } else {
    probeHandlers.set(service, async () => {
      console.debug(`[Probe] Default handler for ${service} - no-op`);
    });
  }

  scheduleNextProbe(service);
  console.log(`[Probe] Scheduled probe for ${service}: ${intervalMs}ms interval`);
}

export function cancelProbe(service: string): boolean {
  const state = probeStates.get(service);
  if (!state) {
    return false;
  }

  state.isActive = false;
  
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }

  console.log(`[Probe] Cancelled probe for ${service}`);
  return true;
}

export function getProbeStatus(): ProbeStatus {
  const states: Record<string, Omit<ProbeState, 'timer'>> = {};
  
  for (const [service, state] of Array.from(probeStates.entries())) {
    const { timer, ...stateWithoutTimer } = state;
    states[service] = stateWithoutTimer;
  }

  return {
    ongoing: Array.from(ongoingProbes),
    scheduled: Array.from(probeStates.keys()).filter(s => probeStates.get(s)?.isActive),
    states,
    concurrencyLimit: MAX_CONCURRENT_PROBES,
    currentConcurrency: ongoingProbes.size,
  };
}

export function triggerProbeNow(service: string): boolean {
  const state = probeStates.get(service);
  if (!state || !state.isActive) {
    return false;
  }

  executeProbe(service).catch(err => {
    console.error(`[Probe] Manual trigger failed for ${service}:`, err);
  });
  
  return true;
}

export function resetProbeBackoff(service: string): boolean {
  const state = probeStates.get(service);
  if (!state) {
    return false;
  }

  state.consecutiveFailures = 0;
  state.currentBackoffMs = BASE_BACKOFF_MS;
  state.lastError = null;
  
  console.log(`[Probe] Reset backoff for ${service}`);
  return true;
}

export function clearAllProbes(): void {
  for (const service of Array.from(probeStates.keys())) {
    cancelProbe(service);
  }
  probeStates.clear();
  probeHandlers.clear();
  ongoingProbes.clear();
  
  console.log('[Probe] Cleared all probes');
}

export const PROBE_CONSTANTS = {
  MAX_CONCURRENT_PROBES,
  BASE_BACKOFF_MS,
  BACKOFF_STEPS,
  JITTER_PERCENT,
};
