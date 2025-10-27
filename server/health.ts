/**
 * Health Check & SLO Metrics Endpoints
 * Exposes operational health and performance metrics for canary monitoring
 */

import { Request, Response, Router } from 'express';
import { db } from './db';
import { sql } from 'drizzle-orm';

const router = Router();

interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  uptime: number;
  version?: string;
  checks: {
    database: 'ok' | 'error';
    storage?: 'ok' | 'error';
  };
}

interface SLOMetrics {
  availability: {
    uptime: number;
    errorRate: number;
    last24h: {
      requests: number;
      errors: number;
      availability: number;
    };
  };
  latency: {
    p50: number;
    p95: number;
    p99: number;
    last24h: {
      p50: number;
      p95: number;
      p99: number;
    };
  };
  dataIntegrity: {
    schemaValidationRate: number;
    piiLeakageDetected: boolean;
  };
  infrastructure: {
    cpu: number;
    memory: number;
    dbConnections: number;
    queueBacklog: number;
  };
}

// In-memory metrics tracking (replace with Redis/TimescaleDB in production)
const metrics: {
  requests: Array<{ timestamp: number; path: string; latency: number; status: number }>;
} = {
  requests: [],
};

// Track request metrics (exported for middleware)
function trackRequest(path: string, latency: number, status: number) {
  metrics.requests.push({
    timestamp: Date.now(),
    path,
    latency,
    status,
  });

  // Keep only last 24 hours
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  metrics.requests = metrics.requests.filter(r => r.timestamp > oneDayAgo);
}

// GET /health - Basic health check
router.get('/health', async (req: Request, res: Response) => {
  const startTime = process.uptime();
  
  let dbStatus: 'ok' | 'error' = 'ok';
  try {
    await db.execute(sql`SELECT 1`);
  } catch (error) {
    dbStatus = 'error';
  }

  const health: HealthStatus = {
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: startTime,
    version: process.env.BUILD_ID || process.env.GIT_SHA,
    checks: {
      database: dbStatus,
      agent: 'active',
      capabilities: 9
    } as any,
  };

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// GET /ready - Readiness probe (can accept traffic)
router.get('/ready', async (req: Request, res: Response) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not_ready', error: 'database_unavailable' });
  }
});

// GET /metrics - SLO metrics for canary monitoring
router.get('/metrics', async (req: Request, res: Response) => {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const last24h = metrics.requests.filter(r => r.timestamp > oneDayAgo);

  // Calculate availability
  const totalRequests = last24h.length;
  const errors = last24h.filter(r => r.status >= 500).length;
  const errorRate = totalRequests > 0 ? errors / totalRequests : 0;
  const availability = totalRequests > 0 ? 1 - errorRate : 1;

  // Calculate latency percentiles
  const latencies = last24h.map(r => r.latency).sort((a, b) => a - b);
  const percentile = (p: number) => {
    if (latencies.length === 0) return 0;
    const index = Math.ceil((p / 100) * latencies.length) - 1;
    return latencies[index];
  };

  // Infrastructure metrics (mock - replace with actual metrics in production)
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  const sloMetrics: SLOMetrics = {
    availability: {
      uptime: process.uptime(),
      errorRate,
      last24h: {
        requests: totalRequests,
        errors,
        availability,
      },
    },
    latency: {
      p50: percentile(50),
      p95: percentile(95),
      p99: percentile(99),
      last24h: {
        p50: percentile(50),
        p95: percentile(95),
        p99: percentile(99),
      },
    },
    dataIntegrity: {
      schemaValidationRate: 1.0, // 100% - would track actual validation failures
      piiLeakageDetected: false,
    },
    infrastructure: {
      cpu: cpuUsage.user / 1000000, // Convert to ms
      memory: memUsage.heapUsed / memUsage.heapTotal,
      dbConnections: 0, // Would query actual pool stats
      queueBacklog: 0, // Would query actual queue depth
    },
  };

  res.json(sloMetrics);
});

// GET /metrics/prometheus - Prometheus-compatible metrics
router.get('/metrics/prometheus', (req: Request, res: Response) => {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const last24h = metrics.requests.filter(r => r.timestamp > oneDayAgo);

  const totalRequests = last24h.length;
  const errors = last24h.filter(r => r.status >= 500).length;
  const latencies = last24h.map(r => r.latency).sort((a, b) => a - b);
  
  const percentile = (p: number) => {
    if (latencies.length === 0) return 0;
    const index = Math.ceil((p / 100) * latencies.length) - 1;
    return latencies[index];
  };

  const prometheusMetrics = `
# HELP scholarlink_requests_total Total number of HTTP requests
# TYPE scholarlink_requests_total counter
scholarlink_requests_total ${totalRequests}

# HELP scholarlink_requests_errors_total Total number of HTTP 5xx errors
# TYPE scholarlink_requests_errors_total counter
scholarlink_requests_errors_total ${errors}

# HELP scholarlink_request_duration_seconds HTTP request latencies
# TYPE scholarlink_request_duration_seconds summary
scholarlink_request_duration_seconds{quantile="0.5"} ${percentile(50) / 1000}
scholarlink_request_duration_seconds{quantile="0.95"} ${percentile(95) / 1000}
scholarlink_request_duration_seconds{quantile="0.99"} ${percentile(99) / 1000}

# HELP scholarlink_uptime_seconds Process uptime in seconds
# TYPE scholarlink_uptime_seconds gauge
scholarlink_uptime_seconds ${process.uptime()}
  `.trim();

  res.set('Content-Type', 'text/plain; version=0.0.4');
  res.send(prometheusMetrics);
});

export { router as healthRouter };
