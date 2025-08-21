#!/usr/bin/env node

/**
 * RUNTIME QA TESTS FOR SCHOLARLINK
 * ================================
 * 
 * These tests specifically check runtime behavior and API endpoints
 * to identify functional bugs and security vulnerabilities.
 */

import fetch from 'node-fetch';
import { execSync } from 'child_process';

const RUNTIME_FINDINGS = [];
let TEST_COUNTER = 1;

function addRuntimeFinding(location, description, stepsToReproduce, observedOutput, expectedOutput, severity) {
  RUNTIME_FINDINGS.push({
    issueId: `RT-${String(TEST_COUNTER).padStart(3, '0')}`,
    location,
    description,
    stepsToReproduce,
    observedOutput,
    expectedOutput,
    severity
  });
  TEST_COUNTER++;
}

async function testEndpoint(url, method = 'GET', body = null, headers = {}) {
  try {
    const response = await fetch(`http://localhost:5000${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: body ? JSON.stringify(body) : null
    });
    
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.text(),
      success: response.ok
    };
  } catch (error) {
    return {
      error: error.message,
      success: false
    };
  }
}

console.log('🔬 STARTING RUNTIME QA TESTS');
console.log('============================\n');

// Test 1: Security Headers
console.log('🔒 TEST 1: Security Headers Analysis');
try {
  const response = await testEndpoint('/');
  
  const securityHeaders = [
    'X-Content-Type-Options',
    'X-Frame-Options',
    'X-XSS-Protection',
    'Strict-Transport-Security',
    'Content-Security-Policy'
  ];
  
  securityHeaders.forEach(header => {
    if (!response.headers[header.toLowerCase()]) {
      addRuntimeFinding(
        'server/index.ts',
        `Missing security header: ${header}`,
        `curl -I http://localhost:5000/`,
        `Header ${header} not present`,
        `${header} should be set`,
        'MEDIUM'
      );
    }
  });
  
  console.log('✓ Security headers analyzed');
} catch (error) {
  console.log('❌ Could not test security headers - server may not be running');
}

// Test 2: Authentication Bypass Testing
console.log('\n🔐 TEST 2: Authentication Bypass Testing');
try {
  const protectedEndpoints = [
    '/api/billing/summary',
    '/api/profile',
    '/api/applications',
    '/api/scholarships/matches'
  ];
  
  for (const endpoint of protectedEndpoints) {
    const response = await testEndpoint(endpoint);
    
    if (response.status === 200) {
      addRuntimeFinding(
        endpoint,
        'Protected endpoint accessible without authentication',
        `curl http://localhost:5000${endpoint}`,
        `Status: ${response.status}`,
        'Status: 401 Unauthorized',
        'CRITICAL'
      );
    } else if (response.status !== 401) {
      addRuntimeFinding(
        endpoint,
        `Unexpected response for unauthenticated request: ${response.status}`,
        `curl http://localhost:5000${endpoint}`,
        `Status: ${response.status}`,
        'Status: 401 Unauthorized',
        'HIGH'
      );
    }
  }
  
  console.log('✓ Authentication bypass tests completed');
} catch (error) {
  console.log('❌ Authentication tests failed:', error.message);
}

// Test 3: Input Validation Testing
console.log('\n📝 TEST 3: Input Validation Testing');
try {
  const maliciousPayloads = [
    { type: 'XSS', payload: '<script>alert("xss")</script>' },
    { type: 'SQL Injection', payload: "'; DROP TABLE users; --" },
    { type: 'JSON Injection', payload: '{"__proto__": {"polluted": true}}' },
    { type: 'Large Input', payload: 'A'.repeat(10000) },
    { type: 'Null Bytes', payload: 'test\x00admin' }
  ];
  
  for (const test of maliciousPayloads) {
    const response = await testEndpoint('/api/auth/user', 'POST', {
      username: test.payload,
      email: test.payload
    });
    
    if (response.success || (response.body && response.body.includes(test.payload))) {
      addRuntimeFinding(
        '/api/auth/user',
        `${test.type} vulnerability detected`,
        `POST /api/auth/user with payload: ${test.payload}`,
        'Payload accepted or reflected',
        'Payload rejected with validation error',
        'HIGH'
      );
    }
  }
  
  console.log('✓ Input validation tests completed');
} catch (error) {
  console.log('❌ Input validation tests failed:', error.message);
}

// Test 4: Rate Limiting Testing
console.log('\n⏱️ TEST 4: Rate Limiting Testing');
try {
  const requests = [];
  
  // Send 10 rapid requests
  for (let i = 0; i < 10; i++) {
    requests.push(testEndpoint('/api/auth/user'));
  }
  
  const responses = await Promise.all(requests);
  const rateLimited = responses.filter(r => r.status === 429);
  
  if (rateLimited.length === 0) {
    addRuntimeFinding(
      'Rate Limiting',
      'No rate limiting detected on API endpoints',
      'Send 10 rapid requests to /api/auth/user',
      'All requests accepted',
      'Some requests should be rate limited (429)',
      'MEDIUM'
    );
  }
  
  console.log('✓ Rate limiting tests completed');
} catch (error) {
  console.log('❌ Rate limiting tests failed:', error.message);
}

// Test 5: Error Information Disclosure
console.log('\n🚨 TEST 5: Error Information Disclosure');
try {
  const errorEndpoints = [
    '/api/nonexistent',
    '/api/billing/invalid',
    '/api/profile/999999'
  ];
  
  for (const endpoint of errorEndpoints) {
    const response = await testEndpoint(endpoint);
    
    if (response.body && (
      response.body.includes('Error:') ||
      response.body.includes('stack trace') ||
      response.body.includes('at ') ||
      response.body.includes('node_modules')
    )) {
      addRuntimeFinding(
        endpoint,
        'Sensitive error information disclosure',
        `curl http://localhost:5000${endpoint}`,
        'Stack trace or sensitive error details exposed',
        'Generic error message without sensitive details',
        'MEDIUM'
      );
    }
  }
  
  console.log('✓ Error disclosure tests completed');
} catch (error) {
  console.log('❌ Error disclosure tests failed:', error.message);
}

// Test 6: CORS Misconfiguration
console.log('\n🌐 TEST 6: CORS Configuration Testing');
try {
  const response = await testEndpoint('/', 'OPTIONS', null, {
    'Origin': 'https://evil.com',
    'Access-Control-Request-Method': 'POST'
  });
  
  if (response.headers['access-control-allow-origin'] === '*') {
    addRuntimeFinding(
      'CORS Configuration',
      'Overly permissive CORS policy - allows all origins',
      'OPTIONS request with evil origin',
      'Access-Control-Allow-Origin: *',
      'Specific origin allowlist',
      'MEDIUM'
    );
  }
  
  console.log('✓ CORS configuration tests completed');
} catch (error) {
  console.log('❌ CORS tests failed:', error.message);
}

// Generate Runtime Report
console.log('\n📊 RUNTIME TEST RESULTS');
console.log('========================\n');

console.log(`Runtime Issues Found: ${RUNTIME_FINDINGS.length}`);

if (RUNTIME_FINDINGS.length > 0) {
  const severityCounts = {
    CRITICAL: RUNTIME_FINDINGS.filter(f => f.severity === 'CRITICAL').length,
    HIGH: RUNTIME_FINDINGS.filter(f => f.severity === 'HIGH').length,
    MEDIUM: RUNTIME_FINDINGS.filter(f => f.severity === 'MEDIUM').length,
    LOW: RUNTIME_FINDINGS.filter(f => f.severity === 'LOW').length
  };
  
  console.log(`Critical: ${severityCounts.CRITICAL}`);
  console.log(`High: ${severityCounts.HIGH}`);
  console.log(`Medium: ${severityCounts.MEDIUM}`);
  console.log(`Low: ${severityCounts.LOW}\n`);
  
  // Output findings
  RUNTIME_FINDINGS.forEach(finding => {
    console.log(`${finding.issueId} - ${finding.severity}: ${finding.description}`);
    console.log(`Location: ${finding.location}`);
    console.log(`Test: ${finding.stepsToReproduce}`);
    console.log(`Result: ${finding.observedOutput}`);
    console.log('---');
  });
  
  if (severityCounts.CRITICAL > 0) {
    console.log('\n🚨 CRITICAL RUNTIME ISSUES FOUND');
    process.exit(1);
  }
}

console.log('\n✅ Runtime testing completed');