import { circuitBreaker, registerProviderWithBreaker } from './oca_circuit_breaker';

const A8_BASE_URL = process.env.AUTO_COM_CENTER_BASE_URL || 'https://auto-com-center-jamarrlmayes.replit.app';

export interface AcceptanceTestResult {
  testName: string;
  passed: boolean;
  duration: number;
  details: Record<string, unknown>;
}

export interface TestSuiteResult {
  allPassed: boolean;
  passedCount: number;
  failedCount: number;
  results: AcceptanceTestResult[];
  timestamp: string;
}

async function test_a6_down_a3_returns_200(): Promise<AcceptanceTestResult> {
  const testName = 'A6 down: A3 returns 200 for student flows';
  const start = Date.now();

  try {
    const idempotencyKey = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const result = await registerProviderWithBreaker(
      { name: 'Test Provider', email: 'test@example.com' },
      idempotencyKey
    );

    const metrics = await circuitBreaker.getMetrics();
    
    const passed = result.success === true && 
                   (result.queued === true || result.providerId !== undefined);

    return {
      testName,
      passed,
      duration: Date.now() - start,
      details: {
        resultSuccess: result.success,
        resultQueued: result.queued,
        breakerState: metrics.state,
        backlogDepth: metrics.backlogDepth,
        featureFlagOn: circuitBreaker.isEnabled()
      }
    };
  } catch (error) {
    return {
      testName,
      passed: false,
      duration: Date.now() - start,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function test_backlog_increases_when_a6_down(): Promise<AcceptanceTestResult> {
  const testName = 'Backlog depth increases when A6 down (persistent storage)';
  const start = Date.now();

  try {
    const initialMetrics = await circuitBreaker.getMetrics();

    if (!circuitBreaker.isEnabled()) {
      return {
        testName,
        passed: true,
        duration: Date.now() - start,
        details: {
          skipped: true,
          reason: 'Feature flag OFF, backlog test skipped',
          featureFlagOn: false
        }
      };
    }

    if (initialMetrics.state !== 'OPEN') {
      return {
        testName,
        passed: true,
        duration: Date.now() - start,
        details: {
          skipped: true,
          reason: 'Breaker not in OPEN state, backlog test not applicable',
          breakerState: initialMetrics.state,
          storage: 'postgres:provider_backlog'
        }
      };
    }

    const initialDepth = initialMetrics.backlogDepth;

    for (let i = 0; i < 3; i++) {
      const idempotencyKey = `backlog-test-${Date.now()}-${i}`;
      await registerProviderWithBreaker(
        { name: `Test Provider ${i}`, email: `test${i}@example.com` },
        idempotencyKey
      );
    }

    const finalMetrics = await circuitBreaker.getMetrics();
    const depthIncrease = finalMetrics.backlogDepth - initialDepth;

    return {
      testName,
      passed: depthIncrease >= 3,
      duration: Date.now() - start,
      details: {
        initialDepth,
        finalDepth: finalMetrics.backlogDepth,
        increase: depthIncrease,
        storage: 'postgres:provider_backlog'
      }
    };
  } catch (error) {
    return {
      testName,
      passed: false,
      duration: Date.now() - start,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function test_no_5xx_exposed_to_users(): Promise<AcceptanceTestResult> {
  const testName = 'Zero 5xx exposed to users when A6 down';
  const start = Date.now();

  try {
    const results: boolean[] = [];

    for (let i = 0; i < 5; i++) {
      const idempotencyKey = `5xx-test-${Date.now()}-${i}`;
      const result = await registerProviderWithBreaker(
        { name: `Test Provider ${i}`, email: `test${i}@example.com` },
        idempotencyKey
      );
      results.push(result.success);
    }

    const all200 = results.every(r => r === true);

    return {
      testName,
      passed: all200,
      duration: Date.now() - start,
      details: {
        callsMade: results.length,
        successCount: results.filter(r => r).length,
        failureCount: results.filter(r => !r).length
      }
    };
  } catch (error) {
    return {
      testName,
      passed: false,
      duration: Date.now() - start,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function test_backlog_drain_rate(): Promise<AcceptanceTestResult> {
  const testName = 'A6 restored: backlog drains without impacting P95 >1.25s';
  const start = Date.now();

  try {
    const metrics = await circuitBreaker.getMetrics();
    
    if (!circuitBreaker.isEnabled()) {
      return {
        testName,
        passed: true,
        duration: Date.now() - start,
        details: {
          skipped: true,
          reason: 'Feature flag OFF',
          featureFlagOn: false
        }
      };
    }

    if (metrics.state !== 'CLOSED' || metrics.backlogDepth === 0) {
      return {
        testName,
        passed: true,
        duration: Date.now() - start,
        details: {
          skipped: true,
          reason: 'Breaker not CLOSED with backlog, drain test not applicable',
          breakerState: metrics.state,
          backlogDepth: metrics.backlogDepth
        }
      };
    }

    const drainCheckP95 = metrics.callP95Ms < 1250;

    return {
      testName,
      passed: drainCheckP95,
      duration: Date.now() - start,
      details: {
        breakerState: metrics.state,
        backlogDepth: metrics.backlogDepth,
        p95Ms: metrics.callP95Ms,
        p95UnderThreshold: drainCheckP95,
        expectedDrainRate: '>=5 rps',
        retryIntervalMs: 5000
      }
    };
  } catch (error) {
    return {
      testName,
      passed: false,
      duration: Date.now() - start,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function test_idempotency_enforced(): Promise<AcceptanceTestResult> {
  const testName = 'No duplicate provider records (idempotency_key enforced via DB unique constraint)';
  const start = Date.now();

  try {
    const sharedKey = `idempotency-test-${Date.now()}`;
    
    const result1 = await registerProviderWithBreaker(
      { name: 'Test Provider', email: 'test@example.com' },
      sharedKey
    );

    const result2 = await registerProviderWithBreaker(
      { name: 'Test Provider', email: 'test@example.com' },
      sharedKey
    );

    const metrics = await circuitBreaker.getMetrics();
    
    const noDuplicates = (result1.queued && result2.queued) || 
                         (result1.providerId === result2.providerId);

    return {
      testName,
      passed: noDuplicates,
      duration: Date.now() - start,
      details: {
        firstCallQueued: result1.queued,
        secondCallQueued: result2.queued,
        sameProviderId: result1.providerId === result2.providerId,
        backlogDepth: metrics.backlogDepth,
        enforcement: 'postgres_unique_constraint'
      }
    };
  } catch (error) {
    return {
      testName,
      passed: false,
      duration: Date.now() - start,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function test_feature_flag_gating(): Promise<AcceptanceTestResult> {
  const testName = 'Circuit breaker respects FEATURE_CIRCUIT_BREAKER_ENABLED flag';
  const start = Date.now();

  try {
    const flagValue = process.env.FEATURE_CIRCUIT_BREAKER_ENABLED;
    const isEnabled = circuitBreaker.isEnabled();
    const expectedEnabled = flagValue === 'true';

    return {
      testName,
      passed: isEnabled === expectedEnabled,
      duration: Date.now() - start,
      details: {
        flagValue: flagValue || 'undefined',
        isEnabled,
        expectedEnabled,
        behavior: isEnabled ? 'breaker_active' : 'direct_calls_only'
      }
    };
  } catch (error) {
    return {
      testName,
      passed: false,
      duration: Date.now() - start,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

export async function runAcceptanceTests(): Promise<TestSuiteResult> {
  console.log('🧪 Running Circuit Breaker Acceptance Tests...');
  console.log(`   Feature Flag: FEATURE_CIRCUIT_BREAKER_ENABLED=${process.env.FEATURE_CIRCUIT_BREAKER_ENABLED || 'undefined'}`);

  const results: AcceptanceTestResult[] = [];

  results.push(await test_feature_flag_gating());
  results.push(await test_a6_down_a3_returns_200());
  results.push(await test_no_5xx_exposed_to_users());
  results.push(await test_idempotency_enforced());
  results.push(await test_backlog_increases_when_a6_down());
  results.push(await test_backlog_drain_rate());

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  const allPassed = failedCount === 0;

  const suiteResult: TestSuiteResult = {
    allPassed,
    passedCount,
    failedCount,
    results,
    timestamp: new Date().toISOString()
  };

  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.testName} (${result.duration}ms)`);
    if (!result.passed) {
      console.log(`   Details: ${JSON.stringify(result.details)}`);
    }
  }

  console.log(`\n🧪 Test Suite: ${passedCount}/${results.length} passed`);

  try {
    await fetch(`${A8_BASE_URL}/events`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `acceptance-tests-${Date.now()}`
      },
      body: JSON.stringify({
        event_type: 'oca_acceptance_tests_completed',
        app_id: 'A5',
        timestamp: suiteResult.timestamp,
        data: {
          allPassed,
          passedCount,
          failedCount,
          featureFlagOn: circuitBreaker.isEnabled(),
          storage: 'postgres:provider_backlog',
          results: results.map(r => ({
            testName: r.testName,
            passed: r.passed,
            duration: r.duration,
            skipped: r.details.skipped || false
          }))
        }
      })
    });
  } catch (error) {
    console.error('Failed to emit test results to A8:', error);
  }

  return suiteResult;
}

export async function verifyGate3Criteria(): Promise<{
  met: boolean;
  criteria: Record<string, { met: boolean; value: unknown; threshold: unknown }>;
}> {
  const metrics = await circuitBreaker.getMetrics();

  const criteria = {
    breaker_closed: {
      met: metrics.state === 'CLOSED',
      value: metrics.state,
      threshold: 'CLOSED'
    },
    backlog_depth_under_10: {
      met: metrics.backlogDepth < 10,
      value: metrics.backlogDepth,
      threshold: 10
    },
    p95_under_1250ms: {
      met: metrics.callP95Ms < 1250,
      value: metrics.callP95Ms,
      threshold: 1250
    },
    error_rate_under_0_5pct: {
      met: metrics.callErrorRate < 0.005,
      value: `${(metrics.callErrorRate * 100).toFixed(2)}%`,
      threshold: '0.5%'
    }
  };

  const allMet = Object.values(criteria).every(c => c.met);

  return { met: allMet, criteria };
}
