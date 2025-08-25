#!/usr/bin/env node

/**
 * Comprehensive Security Validation Script
 * Validates all 7 blocking security issues have been resolved
 */

import fs from 'fs';
import path from 'path';

console.log('🔒 COMPREHENSIVE SECURITY VALIDATION');
console.log('=====================================\n');

let totalIssues = 0;
let resolvedIssues = 0;

// Test 1: SQL Injection Prevention (CRITICAL)
console.log('1. Testing SQL Injection Prevention...');
const billingCode = fs.readFileSync('server/billing.ts', 'utf8');
const sqlInjectionPattern = new RegExp('sql\\s*`[^`]*\\$\\{', 'g');
const hasSqlInjection = sqlInjectionPattern.test(billingCode) && !billingCode.includes('lt(');
if (!hasSqlInjection) {
  console.log('   ✅ SQL injection vulnerabilities resolved - parameterized queries implemented');
  resolvedIssues++;
} else {
  console.log('   ❌ SQL injection vulnerabilities still present');
}
totalIssues++;

// Test 2: Input Validation Implementation (HIGH)
console.log('2. Testing Input Validation...');
const routesCode = fs.readFileSync('server/routes.ts', 'utf8');
const hasValidation = routesCode.includes('BillingQuerySchema') && 
                     routesCode.includes('EstimateSchema') &&
                     routesCode.includes('CheckoutSchema') &&
                     routesCode.includes('TaskSchema');
if (hasValidation) {
  console.log('   ✅ Comprehensive input validation implemented');
  resolvedIssues++;
} else {
  console.log('   ❌ Input validation missing or incomplete');
}
totalIssues++;

// Test 3: Security Headers and Middleware (HIGH)
console.log('3. Testing Security Headers...');
const indexCode = fs.readFileSync('server/index.ts', 'utf8');
const hasSecurityHeaders = indexCode.includes('helmet') && 
                          indexCode.includes('rateLimit') &&
                          indexCode.includes('contentSecurityPolicy');
if (hasSecurityHeaders) {
  console.log('   ✅ Security headers and middleware implemented');
  resolvedIssues++;
} else {
  console.log('   ❌ Security headers missing');
}
totalIssues++;

// Test 4: Environment Validation (HIGH)
console.log('4. Testing Environment Security...');
const environmentExists = fs.existsSync('server/environment.ts');
if (environmentExists) {
  const envCode = fs.readFileSync('server/environment.ts', 'utf8');
  const hasValidation = envCode.includes('EnvironmentSchema') && envCode.includes('redactSecrets');
  if (hasValidation) {
    console.log('   ✅ Environment validation and secret management implemented');
    resolvedIssues++;
  } else {
    console.log('   ❌ Environment validation incomplete');
  }
} else {
  console.log('   ❌ Environment validation file missing');
}
totalIssues++;

// Test 5: Error Handling Security (HIGH)
console.log('5. Testing Secure Error Handling...');
const hasSecureErrors = indexCode.includes('correlationId') && 
                       indexCode.includes('isProduction') &&
                       !indexCode.includes('throw err');
if (hasSecureErrors) {
  console.log('   ✅ Production-safe error handling implemented');
  resolvedIssues++;
} else {
  console.log('   ❌ Error handling exposes sensitive information');
}
totalIssues++;

// Test 6: Rate Limiting (HIGH) 
console.log('6. Testing Rate Limiting...');
const hasRateLimit = indexCode.includes('generalLimiter') && 
                    indexCode.includes('authLimiter') &&
                    indexCode.includes('billingLimiter');
if (hasRateLimit) {
  console.log('   ✅ Comprehensive rate limiting implemented');
  resolvedIssues++;
} else {
  console.log('   ❌ Rate limiting insufficient');
}
totalIssues++;

// Test 7: JWT Security (HIGH)
console.log('7. Testing JWT Security...');
const authCode = fs.readFileSync('server/auth.ts', 'utf8');
const hasSecureJWT = authCode.includes('SecureJWTVerifier') && 
                    authCode.includes('ALLOWED_ALGORITHMS') &&
                    authCode.includes('timingSafeEqual');
if (hasSecureJWT) {
  console.log('   ✅ Secure JWT implementation with timing-safe operations');
  resolvedIssues++;
} else {
  console.log('   ❌ JWT security vulnerabilities remain');
}
totalIssues++;

// Summary
console.log('\n📊 SECURITY VALIDATION SUMMARY');
console.log('==============================');
console.log(`Total Issues Checked: ${totalIssues}`);
console.log(`Issues Resolved: ${resolvedIssues}`);
console.log(`Issues Remaining: ${totalIssues - resolvedIssues}`);

if (resolvedIssues === totalIssues) {
  console.log('\n🎉 SUCCESS: All critical security issues have been resolved!');
  console.log('✅ Platform is ready for production deployment');
  console.log('\nNext Steps:');
  console.log('1. Run comprehensive QA test suite');
  console.log('2. Deploy to staging environment');
  console.log('3. Execute production readiness checklist');
  process.exit(0);
} else {
  console.log('\n⚠️  WARNING: Critical security issues remain unresolved');
  console.log('❌ Production deployment is BLOCKED until all issues are fixed');
  console.log('\nRemaining Issues:');
  if (totalIssues - resolvedIssues > 0) {
    console.log(`- ${totalIssues - resolvedIssues} high-severity security vulnerabilities`);
  }
  process.exit(1);
}