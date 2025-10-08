/**
 * Performance Baseline Measurement
 * Captures P50/P95/P99 latency for all critical endpoints
 */

import fetch from 'node-fetch';

interface LatencyResult {
  endpoint: string;
  method: string;
  samples: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  avg: number;
  stdDev: number;
}

interface BaselineReport {
  timestamp: string;
  environment: string;
  gitSha?: string;
  buildId?: string;
  endpoints: LatencyResult[];
  summary: {
    overallP50: number;
    overallP95: number;
    overallP99: number;
    sloCompliant: boolean; // P95 < 120ms
  };
}

const ENDPOINTS = [
  { path: '/api/auth/user', method: 'GET', auth: true },
  { path: '/api/analytics/ttv-dashboard', method: 'GET', auth: true },
  { path: '/api/dashboard/security', method: 'GET', auth: true },
  { path: '/api/dashboard/infrastructure', method: 'GET', auth: true },
  { path: '/api/dashboard/stats', method: 'GET', auth: true },
  { path: '/api/scholarships', method: 'GET', auth: false },
  { path: '/api/profile', method: 'GET', auth: true },
  { path: '/api/matches', method: 'GET', auth: true },
  { path: '/api/applications', method: 'GET', auth: true },
  { path: '/api/documents', method: 'GET', auth: true },
  { path: '/api/billing/summary', method: 'GET', auth: true },
  { path: '/api/billing/usage', method: 'GET', auth: true },
];

class PerformanceBaseline {
  constructor(
    private baseUrl: string,
    private samples: number = 100,
  ) {}

  private async measureEndpoint(endpoint: typeof ENDPOINTS[0]): Promise<LatencyResult> {
    const latencies: number[] = [];
    const url = `${this.baseUrl}${endpoint.path}`;

    console.log(`  Measuring ${endpoint.method} ${endpoint.path} (${this.samples} samples)...`);

    for (let i = 0; i < this.samples; i++) {
      const start = Date.now();
      try {
        await fetch(url, {
          method: endpoint.method,
          headers: {
            'User-Agent': 'ScholarLink-Baseline/1.0',
          },
        });
        const latency = Date.now() - start;
        latencies.push(latency);
      } catch (error) {
        console.error(`    Error on sample ${i + 1}:`, error);
      }

      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const sorted = latencies.sort((a, b) => a - b);
    const percentile = (p: number) => {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[index];
    };

    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const variance = latencies.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / latencies.length;
    const stdDev = Math.sqrt(variance);

    return {
      endpoint: endpoint.path,
      method: endpoint.method,
      samples: latencies.length,
      p50: percentile(50),
      p95: percentile(95),
      p99: percentile(99),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: Math.round(avg),
      stdDev: Math.round(stdDev),
    };
  }

  async run(): Promise<BaselineReport> {
    console.log('🔬 Running Performance Baseline Measurement');
    console.log(`   Base URL: ${this.baseUrl}`);
    console.log(`   Samples per endpoint: ${this.samples}`);
    console.log('');

    const results: LatencyResult[] = [];

    for (const endpoint of ENDPOINTS) {
      const result = await this.measureEndpoint(endpoint);
      results.push(result);
      console.log(`    ✓ P50=${result.p50}ms, P95=${result.p95}ms, P99=${result.p99}ms`);
    }

    // Calculate overall metrics
    const allP50s = results.map(r => r.p50);
    const allP95s = results.map(r => r.p95);
    const allP99s = results.map(r => r.p99);

    const overallP50 = Math.round(allP50s.reduce((a, b) => a + b, 0) / allP50s.length);
    const overallP95 = Math.round(allP95s.reduce((a, b) => a + b, 0) / allP95s.length);
    const overallP99 = Math.round(allP99s.reduce((a, b) => a + b, 0) / allP99s.length);

    const sloCompliant = overallP95 <= 120; // SLO target

    const report: BaselineReport = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      gitSha: process.env.GIT_SHA,
      buildId: process.env.BUILD_ID,
      endpoints: results,
      summary: {
        overallP50,
        overallP95,
        overallP99,
        sloCompliant,
      },
    };

    console.log('');
    console.log('📊 BASELINE SUMMARY');
    console.log(`   Overall P50: ${overallP50}ms`);
    console.log(`   Overall P95: ${overallP95}ms ${sloCompliant ? '✓' : '✗ (SLO: <120ms)'}`);
    console.log(`   Overall P99: ${overallP99}ms`);
    console.log('');

    // Output JSON for ingestion
    console.log(JSON.stringify(report, null, 2));

    return report;
  }
}

// CLI execution
if (require.main === module) {
  const baseUrl = process.argv[2] || 'http://localhost:5000';
  const samples = parseInt(process.argv[3] || '100', 10);

  const baseline = new PerformanceBaseline(baseUrl, samples);
  baseline.run().catch(console.error);
}

export { PerformanceBaseline, BaselineReport };
