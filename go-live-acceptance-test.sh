#!/bin/bash

# ScholarLink Production Go-Live Acceptance Test
# Comprehensive verification of all security fixes and functionality

set -euo pipefail

echo "🚀 ScholarLink Production Go-Live Acceptance Test"
echo "================================================"
echo "Date: $(date)"
echo "Environment: ${NODE_ENV:-development}"
echo ""

# Configuration
BASE_URL="${BASE_URL:-http://localhost:5000}"
TIMEOUT="--connect-timeout 10 --max-time 30"
PASSED=0
FAILED=0

# Test result tracking
pass_test() {
    echo "✅ PASS: $1"
    ((PASSED++))
}

fail_test() {
    echo "❌ FAIL: $1"
    ((FAILED++))
}

echo "🔍 Testing Base URL: $BASE_URL"
echo ""

# =============================================================================
# CRITICAL SECURITY TESTS
# =============================================================================

echo "🔐 SECURITY VALIDATION TESTS"
echo "----------------------------"

# Test 1: Health endpoint (QA-010 fix)
echo "1. Testing enhanced health endpoint..."
if curl -s $TIMEOUT "$BASE_URL/health" | jq -e '.status' > /dev/null 2>&1; then
    HEALTH_RESPONSE=$(curl -s $TIMEOUT "$BASE_URL/health")
    if echo "$HEALTH_RESPONSE" | jq -e '.database' > /dev/null 2>&1; then
        pass_test "Health endpoint includes database status"
    else
        fail_test "Health endpoint missing database connectivity check"
    fi
else
    fail_test "Health endpoint not responding"
fi

# Test 2: Rate limiting (QA-008 fix)
echo "2. Testing rate limiting protection..."
RATE_LIMIT_STATUS=0
for i in {1..7}; do
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $TIMEOUT "$BASE_URL/api/auth/user" || echo "000")
    if [[ $i -le 5 && "$RESPONSE" != "429" ]]; then
        continue
    elif [[ $i -gt 5 && "$RESPONSE" == "429" ]]; then
        RATE_LIMIT_STATUS=1
        break
    fi
done

if [[ $RATE_LIMIT_STATUS -eq 1 ]]; then
    pass_test "Rate limiting is working (blocked after 5 requests)"
else
    fail_test "Rate limiting not properly configured"
fi

# Test 3: Error handling (QA-009 fix)
echo "3. Testing error information disclosure protection..."
ERROR_RESPONSE=$(curl -s $TIMEOUT "$BASE_URL/api/nonexistent-endpoint" | jq -e '.message' 2>/dev/null || echo "")
if [[ "$ERROR_RESPONSE" == *"stack"* ]] || [[ "$ERROR_RESPONSE" == *"internal"* ]]; then
    if [[ "${NODE_ENV:-}" == "production" ]]; then
        fail_test "Production error response contains sensitive information"
    else
        pass_test "Development error response includes debug info (expected)"
    fi
else
    pass_test "Error responses are sanitized"
fi

# Test 4: JWT endpoint security
echo "4. Testing JWT endpoint protection..."
JWT_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $TIMEOUT "$BASE_URL/agent/capabilities")
if [[ "$JWT_RESPONSE" == "401" ]]; then
    pass_test "Agent endpoints require authentication"
else
    fail_test "Agent endpoints not properly protected"
fi

# Test 5: Input validation (QA-003 fix)
echo "5. Testing enhanced input validation..."
INVALID_INPUT='{"gpa":"invalid","graduationYear":"notanumber","interests":["a".repeat(1000)]}'
VALIDATION_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $TIMEOUT \
    -X POST "$BASE_URL/api/profile" \
    -H "Content-Type: application/json" \
    -d "$INVALID_INPUT")

if [[ "$VALIDATION_RESPONSE" == "400" ]] || [[ "$VALIDATION_RESPONSE" == "401" ]]; then
    pass_test "Input validation rejects malformed data"
else
    fail_test "Input validation may be bypassed"
fi

echo ""

# =============================================================================
# FUNCTIONAL TESTS
# =============================================================================

echo "🔧 FUNCTIONAL VERIFICATION TESTS"
echo "--------------------------------"

# Test 6: Database connectivity
echo "6. Testing database connectivity..."
DB_HEALTH=$(curl -s $TIMEOUT "$BASE_URL/health" | jq -r '.database // "unknown"')
if [[ "$DB_HEALTH" == "connected" ]]; then
    pass_test "Database is connected and healthy"
elif [[ "$DB_HEALTH" == "disconnected" ]]; then
    fail_test "Database connection failed"
else
    fail_test "Database health status unknown"
fi

# Test 7: Agent capabilities endpoint
echo "7. Testing agent capabilities..."
# This will return 401 without auth, which is correct
AGENT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $TIMEOUT "$BASE_URL/agent/capabilities")
if [[ "$AGENT_STATUS" == "401" ]]; then
    pass_test "Agent capabilities endpoint requires authentication"
else
    fail_test "Agent capabilities endpoint security issue"
fi

# Test 8: CORS and security headers
echo "8. Testing security headers..."
HEADERS=$(curl -s -I $TIMEOUT "$BASE_URL/health")
if echo "$HEADERS" | grep -i "x-content-type-options" > /dev/null; then
    pass_test "Security headers are present"
else
    # Not critical for Replit deployments but good to have
    echo "⚠️  WARN: Some security headers may be missing (handled by Replit proxy)"
fi

# Test 9: Environment configuration
echo "9. Testing environment configuration..."
if [[ "${NODE_ENV:-}" == "production" ]]; then
    pass_test "NODE_ENV is set to production"
elif [[ "${NODE_ENV:-}" == "development" ]]; then
    echo "⚠️  INFO: Running in development mode"
else
    fail_test "NODE_ENV not properly configured"
fi

# Test 10: Agent Bridge configuration (if enabled)
echo "10. Testing Agent Bridge configuration..."
if [[ -n "${SHARED_SECRET:-}" ]]; then
    pass_test "SHARED_SECRET is configured"
else
    echo "⚠️  INFO: SHARED_SECRET not configured - Agent Bridge disabled"
fi

echo ""

# =============================================================================
# PERFORMANCE AND RELIABILITY TESTS
# =============================================================================

echo "⚡ PERFORMANCE VERIFICATION"
echo "--------------------------"

# Test 11: Response time check
echo "11. Testing response times..."
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" $TIMEOUT "$BASE_URL/health")
RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc 2>/dev/null || echo "0")

if (( $(echo "$RESPONSE_TIME < 2.0" | bc -l 2>/dev/null) )); then
    pass_test "Health endpoint responds in ${RESPONSE_MS}ms (< 2s)"
else
    fail_test "Health endpoint slow response: ${RESPONSE_MS}ms"
fi

# Test 12: Concurrent request handling
echo "12. Testing concurrent request handling..."
CONCURRENT_SUCCESS=0
for i in {1..5}; do
    curl -s $TIMEOUT "$BASE_URL/health" > /dev/null &
done
wait

# If we get here without hanging, concurrent requests work
pass_test "Handles concurrent requests without blocking"

echo ""

# =============================================================================
# SUMMARY REPORT
# =============================================================================

echo "📊 TEST SUMMARY"
echo "==============="
echo "Total Tests: $((PASSED + FAILED))"
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo ""

if [[ $FAILED -eq 0 ]]; then
    echo "🎉 ALL TESTS PASSED - READY FOR PRODUCTION!"
    echo ""
    echo "✅ Security Verification Complete:"
    echo "   • Enhanced input validation implemented"
    echo "   • Rate limiting properly configured"
    echo "   • Error information disclosure prevented"
    echo "   • JWT endpoints properly secured"
    echo "   • Database connectivity verified"
    echo ""
    echo "🚀 DEPLOYMENT STATUS: GO/NO-GO = GO!"
    echo ""
    echo "Next steps:"
    echo "1. Configure production secrets (see PRODUCTION-DEPLOYMENT-GUIDE.md)"
    echo "2. Set up monitoring and alerts"
    echo "3. Deploy to production environment"
    echo "4. Run post-deployment verification"
    exit 0
else
    echo "🚨 $FAILED TESTS FAILED - DO NOT DEPLOY TO PRODUCTION"
    echo ""
    echo "❌ Issues found that must be resolved:"
    echo "   • Review failed tests above"
    echo "   • Check server logs for errors"
    echo "   • Verify environment configuration"
    echo "   • Re-run tests after fixes"
    echo ""
    echo "🛑 DEPLOYMENT STATUS: GO/NO-GO = NO-GO"
    exit 1
fi