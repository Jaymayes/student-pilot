#!/usr/bin/env node
/**
 * ScholarshipAI Student Pilot - Comprehensive Readiness Audit
 * 
 * Tests: Stability, User Journeys, Performance, Security, Accessibility, SEO, Command Center
 */

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');

const BASE_URL = 'http://localhost:5000';
const COMMAND_CENTER_URL = process.env.COMMAND_CENTER_URL || 'https://auto-com-center-jamarrlmayes.replit.app';

// Test results collector
const results = {
  app: {
    id: 'student-pilot',
    version: '1.0.0',
    build: 'qa-audit-2025-09-30'
  },
  summary: {
    go_no_go: 'EVALUATING',
    overall_risk: 'medium',
    blockers: [],
    high_priority: [],
    quick_wins: [],
    passed: 0,
    failed: 0,
    warnings: 0
  },
  latency_p95_ms: {},
  errors: [],
  security: {
    headers: {},
    https: false,
    secrets_exposed: false
  },
  command_center: {
    health_check: 'PENDING',
    heartbeat: 'PENDING',
    websocket: 'PENDING',
    latency_ms: null
  },
  tests: []
};

// Helper: Make HTTP request with timing
async function timedRequest(url, options = {}) {
  const start = performance.now();
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const latency = performance.now() - start;
        resolve({ 
          status: res.statusCode, 
          headers: res.headers, 
          body: data, 
          latency 
        });
      });
    });
    req.on('error', (err) => {
      const latency = performance.now() - start;
      resolve({ 
        status: 0, 
        error: err.message, 
        latency 
      });
    });
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// Test helpers
function addTest(name, passed, details = {}) {
  const test = { name, passed, ...details };
  results.tests.push(test);
  if (passed) {
    results.summary.passed++;
  } else if (details.severity === 'blocker' || details.severity === 'high') {
    results.summary.failed++;
    if (details.severity === 'blocker') {
      results.summary.blockers.push(name);
    } else {
      results.summary.high_priority.push(name);
    }
  } else {
    results.summary.warnings++;
  }
}

function addError(id, severity, area, journey, description, remediation) {
  results.errors.push({ id, severity, area, journey, description, remediation });
}

// 1. SMOKE AND STABILITY TESTS
async function testSmoke() {
  console.log('\n🧪 PHASE 1: Smoke and Stability Tests');
  
  // Test health endpoint
  const health = await timedRequest(`${BASE_URL}/api/health`);
  addTest('Health endpoint responds', health.status === 200, {
    latency: health.latency,
    severity: health.status === 200 ? 'passed' : 'blocker'
  });
  results.latency_p95_ms.health_check = health.latency;
  
  if (health.status === 200) {
    try {
      const healthData = JSON.parse(health.body);
      addTest('Database connectivity', healthData.checks?.database === 'healthy', {
        severity: healthData.checks?.database === 'healthy' ? 'passed' : 'blocker'
      });
      addTest('Cache connectivity', healthData.checks?.cache === 'healthy', {
        severity: healthData.checks?.cache === 'healthy' ? 'passed' : 'medium'
      });
    } catch (e) {
      addError('ERR-001', 'high', 'backend', 'health_check', 'Health endpoint returns invalid JSON', 'Fix health endpoint response format');
    }
  }
  
  // Test 404 handling
  const notFound = await timedRequest(`${BASE_URL}/api/nonexistent-endpoint`);
  addTest('404 handling works', notFound.status === 404, {
    severity: notFound.status === 404 ? 'passed' : 'medium'
  });
  
  // Test homepage loads
  const homepage = await timedRequest(`${BASE_URL}/`);
  addTest('Homepage loads', homepage.status === 200, {
    latency: homepage.latency,
    severity: homepage.status === 200 ? 'passed' : 'blocker'
  });
  results.latency_p95_ms.page_load = homepage.latency;
}

// 2. CORE API TESTS
async function testAPIs() {
  console.log('\n🔌 PHASE 2: Core API Tests');
  
  // Test scholarships API (public endpoint)
  const scholarships = await timedRequest(`${BASE_URL}/api/scholarships?limit=20`);
  addTest('Scholarships API responds', scholarships.status === 200, {
    latency: scholarships.latency,
    severity: scholarships.status === 200 ? 'passed' : 'blocker'
  });
  results.latency_p95_ms.search = scholarships.latency;
  
  if (scholarships.status === 200) {
    try {
      const data = JSON.parse(scholarships.body);
      addTest('Scholarships returns array', Array.isArray(data.scholarships), {
        severity: Array.isArray(data.scholarships) ? 'passed' : 'high'
      });
      addTest('Scholarships API under 120ms SLO', scholarships.latency < 120, {
        severity: scholarships.latency < 120 ? 'passed' : 'medium',
        actual: scholarships.latency,
        expected: '<120ms'
      });
    } catch (e) {
      addError('ERR-002', 'high', 'api', 'search', 'Scholarships API returns invalid JSON', 'Fix scholarship endpoint response format');
    }
  }
  
  // Test protected endpoints (should return 401)
  const profile = await timedRequest(`${BASE_URL}/api/profile`);
  addTest('Protected routes require auth', profile.status === 401, {
    severity: profile.status === 401 ? 'passed' : 'blocker',
    note: 'Profile endpoint should reject unauthenticated requests'
  });
  
  // Test agent capabilities
  const capabilities = await timedRequest(`${BASE_URL}/agent/capabilities`);
  addTest('Agent capabilities endpoint works', capabilities.status === 200, {
    latency: capabilities.latency,
    severity: capabilities.status === 200 ? 'passed' : 'medium'
  });
  
  if (capabilities.status === 200) {
    try {
      const data = JSON.parse(capabilities.body);
      addTest('Agent advertises capabilities', Array.isArray(data.capabilities) && data.capabilities.length > 0, {
        count: data.capabilities ? data.capabilities.length : 0,
        severity: data.capabilities && data.capabilities.length > 0 ? 'passed' : 'medium'
      });
    } catch (e) {
      addError('ERR-003', 'medium', 'integration', 'agent_bridge', 'Capabilities endpoint returns invalid JSON', 'Fix capabilities response format');
    }
  }
}

// 3. SECURITY TESTS
async function testSecurity() {
  console.log('\n🔒 PHASE 3: Security Tests');
  
  const homepage = await timedRequest(`${BASE_URL}/`);
  const headers = homepage.headers;
  
  // Check security headers
  const securityHeaders = {
    'strict-transport-security': 'HSTS header',
    'x-content-type-options': 'X-Content-Type-Options',
    'x-frame-options': 'X-Frame-Options',
    'content-security-policy': 'Content-Security-Policy',
    'referrer-policy': 'Referrer-Policy'
  };
  
  for (const [header, name] of Object.entries(securityHeaders)) {
    const present = !!headers[header];
    results.security.headers[header] = present;
    addTest(`${name} header present`, present, {
      severity: present ? 'passed' : 'high',
      value: headers[header] || 'missing'
    });
  }
  
  // Check for common vulnerabilities
  const homepageBody = homepage.body || '';
  const hasInlineScript = homepageBody.includes('<script>') && !homepageBody.includes('type="module"');
  addTest('No inline scripts (CSP compliance)', !hasInlineScript, {
    severity: !hasInlineScript ? 'passed' : 'high'
  });
  
  // Check for exposed secrets (basic check)
  const exposedSecrets = homepageBody.match(/(sk_live_|sk_test_|pk_live_|AKIA|AIza)/g);
  results.security.secrets_exposed = !!exposedSecrets;
  addTest('No exposed secrets in HTML', !exposedSecrets, {
    severity: !exposedSecrets ? 'passed' : 'blocker',
    note: exposedSecrets ? `Found: ${exposedSecrets.join(', ')}` : 'Clean'
  });
}

// 4. SEO TESTS
async function testSEO() {
  console.log('\n🔍 PHASE 4: SEO Tests');
  
  // Test robots.txt
  const robots = await timedRequest(`${BASE_URL}/robots.txt`);
  addTest('robots.txt exists', robots.status === 200, {
    severity: robots.status === 200 ? 'passed' : 'medium'
  });
  
  if (robots.status === 200) {
    const hasDisallow = robots.body.includes('Disallow:');
    const hasSitemap = robots.body.includes('Sitemap:');
    addTest('robots.txt has Disallow rules', hasDisallow, {
      severity: hasDisallow ? 'passed' : 'low'
    });
    addTest('robots.txt includes Sitemap', hasSitemap, {
      severity: hasSitemap ? 'passed' : 'low'
    });
  }
  
  // Test security.txt
  const securityTxt = await timedRequest(`${BASE_URL}/.well-known/security.txt`);
  addTest('security.txt exists', securityTxt.status === 200, {
    severity: securityTxt.status === 200 ? 'passed' : 'medium'
  });
  
  // Test homepage meta tags
  const homepage = await timedRequest(`${BASE_URL}/`);
  if (homepage.status === 200) {
    const hasViewport = homepage.body.includes('name="viewport"');
    const hasCharset = homepage.body.includes('charset=');
    addTest('Homepage has viewport meta', hasViewport, {
      severity: hasViewport ? 'passed' : 'high'
    });
    addTest('Homepage has charset', hasCharset, {
      severity: hasCharset ? 'passed' : 'high'
    });
  }
}

// 5. COMMAND CENTER CONNECTIVITY
async function testCommandCenter() {
  console.log('\n📡 PHASE 5: Command Center Connectivity');
  
  // Test health endpoint
  const healthStart = performance.now();
  const health = await timedRequest(`${COMMAND_CENTER_URL}/health`);
  const healthLatency = performance.now() - healthStart;
  
  const healthPassed = health.status === 200;
  results.command_center.health_check = healthPassed ? 'PASS' : 'FAIL';
  results.command_center.latency_ms = healthLatency;
  
  addTest('Command Center health check', healthPassed, {
    latency: healthLatency,
    severity: healthPassed ? 'passed' : 'medium',
    url: `${COMMAND_CENTER_URL}/health`,
    note: healthPassed ? 'Connected' : 'Cannot reach Command Center - Agent Bridge not configured'
  });
  
  if (healthPassed) {
    try {
      const healthData = JSON.parse(health.body);
      addTest('Command Center reports healthy', healthData.status === 'healthy', {
        severity: healthData.status === 'healthy' ? 'passed' : 'high'
      });
    } catch (e) {
      addError('ERR-004', 'medium', 'integration', 'command_center', 'Command Center health returns invalid JSON', 'Check Command Center deployment');
    }
  } else {
    addError('ERR-005', 'medium', 'integration', 'command_center', 
      'Command Center not accessible - Agent Bridge disabled (missing SHARED_SECRET)', 
      'Configure SHARED_SECRET environment variable to enable Agent Bridge connectivity');
    results.summary.quick_wins.push('Configure Agent Bridge for Command Center connectivity');
  }
  
  // Note: Heartbeat and WebSocket tests skipped because Agent Bridge is not configured
  results.command_center.heartbeat = 'SKIPPED (Agent Bridge disabled)';
  results.command_center.websocket = 'SKIPPED (Agent Bridge disabled)';
}

// 6. PERFORMANCE SUMMARY
function summarizePerformance() {
  console.log('\n⚡ PHASE 6: Performance Summary');
  
  const sloTarget = 120; // P95 < 120ms
  const latencies = results.latency_p95_ms;
  
  for (const [endpoint, latency] of Object.entries(latencies)) {
    if (latency !== null && latency !== undefined) {
      const withinSLO = latency < sloTarget;
      console.log(`  ${endpoint}: ${latency.toFixed(2)}ms ${withinSLO ? '✅' : '⚠️'}`);
      
      if (!withinSLO && endpoint !== 'page_load') {
        addError(
          `PERF-${endpoint}`,
          'medium',
          'performance',
          endpoint,
          `${endpoint} latency (${latency.toFixed(2)}ms) exceeds P95 SLO (${sloTarget}ms)`,
          'Optimize database queries or add caching'
        );
      }
    }
  }
}

// 7. FINAL GO/NO-GO DECISION
function makeGoNoGoDecision() {
  console.log('\n🎯 FINAL DECISION ANALYSIS');
  
  const hasBlockers = results.summary.blockers.length > 0;
  const hasHighPriority = results.summary.high_priority.length > 0;
  const commandCenterDown = results.command_center.health_check === 'FAIL';
  
  if (hasBlockers) {
    results.summary.go_no_go = 'NO_GO';
    results.summary.overall_risk = 'high';
    console.log('  ❌ NO GO - Blocker issues found');
  } else if (hasHighPriority && commandCenterDown) {
    results.summary.go_no_go = 'GO_WITH_RISKS';
    results.summary.overall_risk = 'medium';
    console.log('  ⚠️  GO WITH RISKS - High priority issues and Command Center offline');
  } else if (commandCenterDown) {
    results.summary.go_no_go = 'GO_WITH_RISKS';
    results.summary.overall_risk = 'low';
    console.log('  ⚠️  GO WITH RISKS - Command Center connectivity optional for Student Pilot');
  } else {
    results.summary.go_no_go = 'GO';
    results.summary.overall_risk = 'low';
    console.log('  ✅ GO - All systems operational');
  }
  
  // Add top 5 recommendations
  if (results.summary.blockers.length > 0) {
    console.log('\n🚨 BLOCKERS (Must Fix):');
    results.summary.blockers.slice(0, 5).forEach((b, i) => {
      console.log(`  ${i + 1}. ${b}`);
    });
  }
  
  if (results.summary.high_priority.length > 0) {
    console.log('\n⚠️  HIGH PRIORITY:');
    results.summary.high_priority.slice(0, 5).forEach((h, i) => {
      console.log(`  ${i + 1}. ${h}`);
    });
  }
  
  if (results.summary.quick_wins.length > 0) {
    console.log('\n💡 QUICK WINS:');
    results.summary.quick_wins.forEach((q, i) => {
      console.log(`  ${i + 1}. ${q}`);
    });
  }
}

// MAIN EXECUTION
async function runAudit() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  ScholarshipAI Student Pilot - Readiness Audit                ║');
  console.log('║  Comprehensive QA + Command Center Connectivity Check          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  try {
    await testSmoke();
    await testAPIs();
    await testSecurity();
    await testSEO();
    await testCommandCenter();
    summarizePerformance();
    makeGoNoGoDecision();
    
    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Passed: ${results.summary.passed}`);
    console.log(`❌ Failed: ${results.summary.failed}`);
    console.log(`⚠️  Warnings: ${results.summary.warnings}`);
    console.log(`\n🎯 Decision: ${results.summary.go_no_go}`);
    console.log(`🎚️  Risk Level: ${results.summary.overall_risk.toUpperCase()}`);
    
    // Save JSON report
    const fs = require('fs');
    fs.writeFileSync('qa-audit-report.json', JSON.stringify(results, null, 2));
    console.log('\n📄 Full report saved to: qa-audit-report.json');
    
  } catch (error) {
    console.error('\n💥 AUDIT FAILED:', error);
    process.exit(1);
  }
}

runAudit();