#!/usr/bin/env node

/**
 * Production Smoke Test Suite
 * Tests critical billing system functionality in production environment
 */

const https = require('https');
const { URL } = require('url');

const PRODUCTION_BASE_URL = process.env.PRODUCTION_URL || 'https://your-domain.com';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const TEST_USER_ID = process.env.TEST_USER_ID || 'smoke-test-user';

// Test results tracking
let testResults = [];
let testsPassed = 0;
let testsFailed = 0;

function logTest(name, passed, details, expected, actual) {
  const status = passed ? "✅ PASS" : "❌ FAIL";
  const result = { name, passed, details, expected, actual };
  testResults.push(result);
  
  if (passed) {
    testsPassed++;
    console.log(`${status} ${name}: ${details}`);
  } else {
    testsFailed++;
    console.log(`${status} ${name}: ${details}`);
    if (expected && actual) {
      console.log(`    Expected: ${expected}`);
      console.log(`    Actual: ${actual}`);
    }
  }
}

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, PRODUCTION_BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(ADMIN_TOKEN && { 'Authorization': `Bearer ${ADMIN_TOKEN}` })
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve({ status: res.statusCode, data, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testApiHealth() {
  console.log('\n🔍 API HEALTH CHECK');
  console.log('==================');

  try {
    const response = await makeRequest('GET', '/api/health');
    logTest(
      'API Health Endpoint',
      response.status === 200,
      `Status ${response.status}`,
      '200',
      response.status
    );
  } catch (error) {
    logTest('API Health Endpoint', false, `Error: ${error.message}`);
  }

  try {
    const response = await makeRequest('GET', '/api/billing/packages');
    logTest(
      'Billing Packages Endpoint',
      response.status === 200 && response.data?.starter,
      'Packages endpoint returns valid data',
      'starter/professional/enterprise packages',
      response.data ? Object.keys(response.data).join('/') : 'null'
    );
  } catch (error) {
    logTest('Billing Packages Endpoint', false, `Error: ${error.message}`);
  }
}

async function testBillingApi() {
  console.log('\n💳 BILLING API TEST');
  console.log('===================');

  try {
    const response = await makeRequest('GET', '/api/billing/summary');
    const isValidStructure = response.data && 
      typeof response.data.balanceMillicredits === 'string' &&
      typeof response.data.balanceCredits === 'number' &&
      typeof response.data.balanceUsd === 'number';

    logTest(
      'Billing Summary Structure',
      response.status === 200 && isValidStructure,
      'API returns correct data types',
      'balanceMillicredits: string, balanceCredits: number',
      response.data ? `${typeof response.data.balanceMillicredits}, ${typeof response.data.balanceCredits}` : 'null'
    );

    if (response.data?.activeRates) {
      const ratesValid = response.data.activeRates.every(rate => 
        typeof rate.inputCreditsPer1k === 'string' &&
        typeof rate.outputCreditsPer1k === 'string'
      );
      
      logTest(
        'Rate Card Format',
        ratesValid,
        'All rates stored as strings for precision',
        'string format rates',
        ratesValid ? 'valid' : 'invalid format'
      );
    }

  } catch (error) {
    logTest('Billing Summary API', false, `Error: ${error.message}`);
  }
}

async function testCostEstimation() {
  console.log('\n🧮 COST ESTIMATION TEST');
  console.log('=======================');

  const testCases = [
    { model: 'gpt-4o-mini', input: 1000, output: 1000, expected: 12.0 },
    { model: 'gpt-4o', input: 10000, output: 2000, expected: 360.0 },
    { model: 'gpt-4o-mini', input: 750, output: 200, expected: 3.72 }
  ];

  for (const testCase of testCases) {
    try {
      const response = await makeRequest('GET', 
        `/api/billing/estimate?model=${testCase.model}&inputTokens=${testCase.input}&outputTokens=${testCase.output}`
      );

      const estimatedCredits = response.data?.creditsRequired;
      const isCorrect = Math.abs(estimatedCredits - testCase.expected) < 0.01;

      logTest(
        `Cost Estimation ${testCase.model}`,
        response.status === 200 && isCorrect,
        `${testCase.input}→${testCase.output} tokens = ${estimatedCredits} credits`,
        testCase.expected,
        estimatedCredits
      );
    } catch (error) {
      logTest(`Cost Estimation ${testCase.model}`, false, `Error: ${error.message}`);
    }
  }
}

async function testInsufficientCreditsFlow() {
  console.log('\n🚨 INSUFFICIENT CREDITS TEST');
  console.log('============================');

  try {
    // This would need to be tested with a controlled test account
    // For smoke test, we just verify the endpoint structure exists
    const response = await makeRequest('POST', '/api/ai/chat', {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Test with high token usage to trigger 402' }],
      max_tokens: 4000 // This should trigger 402 if balance is low
    });

    // We expect either success (200) or insufficient credits (402)
    const isValidResponse = response.status === 200 || 
      (response.status === 402 && 
       response.data?.requiredCredits && 
       response.data?.currentCredits !== undefined);

    logTest(
      'Insufficient Credits Flow',
      isValidResponse,
      `Status ${response.status} - ${response.status === 402 ? '402 properly structured' : 'Request succeeded'}`,
      '200 or structured 402 response',
      response.status
    );
  } catch (error) {
    logTest('Insufficient Credits Flow', false, `Error: ${error.message}`);
  }
}

async function testStripeIntegration() {
  console.log('\n💰 STRIPE INTEGRATION TEST');
  console.log('==========================');

  try {
    const response = await makeRequest('POST', '/api/stripe/create-checkout-session', {
      packageCode: 'starter'
    });

    const hasCheckoutUrl = response.data?.url && response.data.url.includes('checkout.stripe.com');

    logTest(
      'Stripe Checkout Creation',
      response.status === 200 && hasCheckoutUrl,
      'Checkout session created with valid URL',
      'Stripe checkout URL',
      hasCheckoutUrl ? 'valid' : 'invalid/missing'
    );
  } catch (error) {
    logTest('Stripe Checkout Creation', false, `Error: ${error.message}`);
  }
}

async function testSecurityControls() {
  console.log('\n🔐 SECURITY CONTROLS TEST');
  console.log('=========================');

  try {
    // Test admin endpoint without auth
    const response = await makeRequest('GET', '/api/admin/users');
    
    logTest(
      'Admin Endpoint Protection',
      response.status === 401 || response.status === 403,
      'Admin endpoints require authentication',
      '401 or 403',
      response.status
    );
  } catch (error) {
    logTest('Admin Endpoint Protection', false, `Error: ${error.message}`);
  }

  try {
    // Test webhook endpoint requires signature (should fail without proper signature)
    const response = await makeRequest('POST', '/api/stripe/webhook', { test: 'data' });
    
    logTest(
      'Webhook Signature Validation',
      response.status !== 200, // Should fail without proper Stripe signature
      'Webhook requires valid signature',
      'Non-200 status (signature validation)',
      response.status
    );
  } catch (error) {
    logTest('Webhook Signature Validation', false, `Error: ${error.message}`);
  }
}

async function runSmokeTest() {
  console.log('🚀 SCHOLARLINK BILLING SYSTEM - PRODUCTION SMOKE TEST');
  console.log('=====================================================');
  console.log(`Target: ${PRODUCTION_BASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  // Run all test suites
  await testApiHealth();
  await testBillingApi();
  await testCostEstimation();
  await testInsufficientCreditsFlow();
  await testStripeIntegration();
  await testSecurityControls();

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SMOKE TEST RESULTS');
  console.log('='.repeat(50));
  
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  console.log(`📊 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 ALL TESTS PASSED - SYSTEM READY FOR PRODUCTION');
    console.log('✅ Billing system is operational and secure');
    console.log('✅ All critical endpoints responding correctly');
    console.log('✅ Security controls are active');
    console.log('✅ Cost calculations are accurate');
    
    process.exit(0);
  } else {
    console.log('\n⚠️  SOME TESTS FAILED - REVIEW BEFORE GO-LIVE');
    console.log('❌ Address failed tests before production release');
    
    // List failed tests
    const failedTests = testResults.filter(t => !t.passed);
    console.log('\nFailed Tests:');
    failedTests.forEach(test => {
      console.log(`  - ${test.name}: ${test.details}`);
    });
    
    process.exit(1);
  }
}

// Export for programmatic use
module.exports = {
  runSmokeTest,
  testResults: () => testResults
};

// Run if called directly
if (require.main === module) {
  runSmokeTest().catch(error => {
    console.error('💥 Smoke test failed with error:', error);
    process.exit(1);
  });
}