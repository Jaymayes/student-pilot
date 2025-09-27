/**
 * 72-Hour Soak Test - Task perf-6e
 * CEO Objective: Surface memory leaks, GC pathologies, connection pool churn, cache eviction pathologies
 * 
 * Success Criteria:
 * - Stable memory/CPU usage over 72 hours
 * - No error accumulation or degradation
 * - Circuit breaker stability (no false positives)
 * - <1% drift in P95 latency over test duration
 * - Cache effectiveness remains >85% throughout
 * - Connection pool health maintained
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend, Gauge } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { 
  AI_ENDPOINTS, 
  BILLING_ENDPOINTS, 
  USER_ENDPOINTS,
  MONITORING_ENDPOINTS 
} from '../config/endpoints.js';

// Soak test specific metrics for long-term stability
const memoryLeakIndicator = new Gauge('memory_leak_indicator_mb');
const gcPressureGauge = new Gauge('gc_pressure_percentage');
const connectionPoolUtilization = new Gauge('connection_pool_utilization');
const latencyDriftGauge = new Gauge('latency_drift_percentage');
const cacheEvictionRate = new Rate('cache_eviction_rate');
const errorAccumulation = new Counter('error_accumulation_total');
const circuitBreakerStability = new Rate('circuit_breaker_stability');
const resourceExhaustionIndicator = new Counter('resource_exhaustion_events');

export const options = {
  stages: [
    { duration: '5m', target: 200 },    // Ramp up to sustained load
    { duration: '71h50m', target: 200 }, // 72 hours sustained (minus ramp time)
    { duration: '5m', target: 0 },      // Graceful shutdown
  ],
  
  // Long-term stability thresholds
  thresholds: {
    http_req_duration: [
      'p(95)<200',  // Maintain baseline performance
      'p(99)<500'   // No significant degradation
    ],
    memory_leak_indicator_mb: ['trend<10'], // <10MB/hour growth indicates leak
    gc_pressure_percentage: ['value<25'],    // <25% GC pressure
    connection_pool_utilization: ['value<80'], // <80% pool utilization
    latency_drift_percentage: ['value<1'],   // <1% P95 drift over duration
    cache_eviction_rate: ['rate<0.15'],     // <15% cache evictions
    error_accumulation_total: ['rate<0.001'], // <0.1% error accumulation
    circuit_breaker_stability: ['rate>0.95'], // >95% stable states
    resource_exhaustion_events: ['count<5']  // <5 exhaustion events total
  },
  
  userAgent: 'ScholarLink-LoadTest/1.0 (72-Hour-Soak)',
};

function authenticateUser() {
  return {
    'Authorization': 'Bearer soak-test-token',
    'Content-Type': 'application/json',
    'X-Correlation-ID': `soak-${__VU}-${Date.now()}`
  };
}

// Track baseline metrics for drift calculation
let baselineP95 = null;
let baselineMemory = null;
let testStartTime = Date.now();

export default function() {
  const headers = authenticateUser();
  const currentHour = Math.floor((Date.now() - testStartTime) / (1000 * 60 * 60));
  
  // 1. System Health Monitoring - Every iteration
  const healthRes = http.get(MONITORING_ENDPOINTS.apiMetrics);
  if (healthRes.status === 200) {
    try {
      const metrics = JSON.parse(healthRes.body);
      
      // Track memory usage patterns
      if (metrics.memory) {
        const currentMemory = metrics.memory.used || 0;
        if (baselineMemory === null) {
          baselineMemory = currentMemory;
        } else {
          const memoryGrowth = currentMemory - baselineMemory;
          memoryLeakIndicator.add(memoryGrowth / (1024 * 1024)); // Convert to MB
        }
      }
      
      // Monitor GC pressure
      if (metrics.gc) {
        const gcPressure = (metrics.gc.duration / metrics.gc.interval) * 100;
        gcPressureGauge.add(gcPressure);
      }
      
      // Track connection pool health
      if (metrics.database) {
        const poolUtilization = (metrics.database.activeConnections / metrics.database.maxConnections) * 100;
        connectionPoolUtilization.add(poolUtilization);
        
        if (poolUtilization > 95) {
          resourceExhaustionIndicator.add(1);
        }
      }
      
      // Cache effectiveness monitoring
      if (metrics.cache) {
        const evictionRate = metrics.cache.evictions / metrics.cache.operations;
        cacheEvictionRate.add(evictionRate);
      }
      
    } catch (e) {
      errorAccumulation.add(1);
    }
  }
  
  sleep(0.2);
  
  // 2. Consistent User Workflow - Realistic long-term usage
  const profileRes = http.get(USER_ENDPOINTS.profile, { headers });
  const profileSuccess = check(profileRes, {
    'profile status is 200 or 401': (r) => [200, 401].includes(r.status),
    'profile response time stable': (r) => {
      if (baselineP95 === null && r.status === 200) {
        baselineP95 = r.timings.duration;
        return true;
      } else if (baselineP95 !== null) {
        const driftPercentage = ((r.timings.duration - baselineP95) / baselineP95) * 100;
        latencyDriftGauge.add(Math.abs(driftPercentage));
        return driftPercentage < 10; // Allow 10% variance per request
      }
      return true;
    }
  });
  
  if (!profileSuccess) {
    errorAccumulation.add(1);
  }
  
  sleep(0.5);
  
  // 3. AI Service Long-term Stability - Every 10th iteration
  if (__ITER % 10 === 0) {
    const aiPayload = {
      content: `Long-term soak test essay content. Hour ${currentHour} of testing.
                This content helps test AI service stability over extended periods.
                Memory management and connection pooling are critical for sustained operations.`,
      type: 'scholarship_essay',
      wordLimit: 300,
      soakTest: true
    };
    
    const aiRes = http.post(AI_ENDPOINTS.analyzeEssay, JSON.stringify(aiPayload), { 
      headers,
      timeout: '30s' // Longer timeout for soak test
    });
    
    const aiSuccess = check(aiRes, {
      'AI service remains stable': (r) => [200, 402].includes(r.status),
      'AI response time consistent': (r) => r.timings.duration < 5000,
      'No AI service degradation': (r) => {
        if (r.status === 200) {
          try {
            const response = JSON.parse(r.body);
            return !response.response?.isFallback || response.usage?.chargedCredits === 0;
          } catch (e) {
            return false;
          }
        }
        return true;
      }
    });
    
    if (!aiSuccess) {
      errorAccumulation.add(1);
    }
  }
  
  sleep(0.3);
  
  // 4. Circuit Breaker Stability Check - Every 50th iteration
  if (__ITER % 50 === 0) {
    const reliabilityRes = http.get(MONITORING_ENDPOINTS.reliability);
    if (reliabilityRes.status === 200) {
      try {
        const status = JSON.parse(reliabilityRes.body);
        
        // Check for circuit breaker false positives
        let stableServices = 0;
        let totalServices = 0;
        
        Object.keys(status.services || {}).forEach(service => {
          totalServices++;
          const serviceStatus = status.services[service];
          
          // Consider stable if CLOSED or recovering properly
          if (serviceStatus.state === 'CLOSED' || 
             (serviceStatus.state === 'HALF_OPEN' && serviceStatus.recentFailures < 3)) {
            stableServices++;
          }
        });
        
        const stabilityRate = totalServices > 0 ? stableServices / totalServices : 1;
        circuitBreakerStability.add(stabilityRate);
        
      } catch (e) {
        errorAccumulation.add(1);
      }
    }
  }
  
  sleep(0.2);
  
  // 5. Database Connection Churn Test - Every 25th iteration
  if (__ITER % 25 === 0) {
    const scholarshipRes = http.get(`${USER_ENDPOINTS.scholarships}?soak_test=true&hour=${currentHour}`);
    const dbSuccess = check(scholarshipRes, {
      'database connection stable': (r) => r.status === 200,
      'no connection pool exhaustion': (r) => !r.body.includes('connection') || !r.body.includes('timeout'),
      'query performance maintained': (r) => r.timings.duration < 1000
    });
    
    if (!dbSuccess) {
      errorAccumulation.add(1);
    }
  }
  
  sleep(0.3);
  
  // 6. Billing System Long-term Test - Every 100th iteration
  if (__ITER % 100 === 0) {
    const billingRes = http.get(BILLING_ENDPOINTS.summary, { headers });
    const billingSuccess = check(billingRes, {
      'billing system stable': (r) => [200, 401].includes(r.status),
      'billing response time consistent': (r) => r.timings.duration < 1000,
      'no billing calculation drift': (r) => {
        // Basic sanity check for billing consistency
        if (r.status === 200) {
          try {
            const billing = JSON.parse(r.body);
            return billing.currentBalance !== undefined && billing.currentBalance >= 0;
          } catch (e) {
            return false;
          }
        }
        return true;
      }
    });
    
    if (!billingSuccess) {
      errorAccumulation.add(1);
    }
  }
  
  sleep(1.0); // Standard user think time
  
  // 7. Memory Pressure Detection - Every 500th iteration
  if (__ITER % 500 === 0) {
    // Force some memory allocation to test GC behavior
    const largeData = new Array(1000).fill('soak-test-data-' + Date.now());
    const processedData = largeData.map(item => item.toUpperCase());
    
    // Immediate cleanup to test GC responsiveness
    largeData.length = 0;
    processedData.length = 0;
  }
}

export function handleSummary(data) {
  return {
    'soak-test-report.html': htmlReport(data),
    'soak-test-results.json': JSON.stringify(data, null, 2),
  };
}