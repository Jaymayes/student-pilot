/**
 * /metrics/p95 endpoint - SEV-1 Required
 * 
 * Returns JSON with window_sec, p50_ms, p95_ms, sample_count
 */

import { Router, Request, Response } from 'express';

const router = Router();

// In-memory metrics storage (ring buffer)
interface MetricsSample {
  timestamp: number;
  latency_ms: number;
  endpoint: string;
}

const WINDOW_SEC = 600; // 10 minutes
const samples: MetricsSample[] = [];
const MAX_SAMPLES = 10000;

/**
 * Record a latency sample
 */
export function recordLatency(endpoint: string, latency_ms: number): void {
  const now = Date.now();
  samples.push({ timestamp: now, latency_ms, endpoint });
  
  // Trim old samples and enforce max size
  const cutoff = now - (WINDOW_SEC * 1000);
  while (samples.length > 0 && (samples[0].timestamp < cutoff || samples.length > MAX_SAMPLES)) {
    samples.shift();
  }
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * GET /metrics/p95 - Return performance metrics (route is mounted at root)
 */
router.get('/', (req: Request, res: Response) => {
  const now = Date.now();
  const cutoff = now - (WINDOW_SEC * 1000);
  
  // Filter samples within window
  const windowSamples = samples.filter(s => s.timestamp >= cutoff);
  
  if (windowSamples.length === 0) {
    return res.json({
      window_sec: WINDOW_SEC,
      p50_ms: 0,
      p95_ms: 0,
      sample_count: 0,
      timestamp: new Date().toISOString(),
    });
  }
  
  // Sort latencies
  const latencies = windowSamples.map(s => s.latency_ms).sort((a, b) => a - b);
  
  res.json({
    window_sec: WINDOW_SEC,
    p50_ms: Math.round(percentile(latencies, 50)),
    p95_ms: Math.round(percentile(latencies, 95)),
    sample_count: windowSamples.length,
    timestamp: new Date().toISOString(),
    endpoints: getEndpointBreakdown(windowSamples),
  });
});

/**
 * Get breakdown by endpoint
 */
function getEndpointBreakdown(samples: MetricsSample[]): Record<string, { p50_ms: number; p95_ms: number; count: number }> {
  const byEndpoint: Record<string, number[]> = {};
  
  for (const s of samples) {
    if (!byEndpoint[s.endpoint]) byEndpoint[s.endpoint] = [];
    byEndpoint[s.endpoint].push(s.latency_ms);
  }
  
  const result: Record<string, { p50_ms: number; p95_ms: number; count: number }> = {};
  for (const [endpoint, latencies] of Object.entries(byEndpoint)) {
    latencies.sort((a, b) => a - b);
    result[endpoint] = {
      p50_ms: Math.round(percentile(latencies, 50)),
      p95_ms: Math.round(percentile(latencies, 95)),
      count: latencies.length,
    };
  }
  
  return result;
}

export { router as metricsP95Router };
