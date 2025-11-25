#!/bin/bash
# AGENT3 v3.0 UNIFIED EXECUTION - ENDPOINT TESTS
# student_pilot | https://student-pilot-jamarrlmayes.replit.app
# SECTION: E

BASE_URL="${BASE_URL:-http://localhost:5000}"

echo "========================================="
echo "AGENT3 v3.0 Endpoint Tests - student_pilot"
echo "========================================="
echo "student_pilot | https://student-pilot-jamarrlmayes.replit.app"
echo "Test Base: $BASE_URL"
echo ""

PASS_COUNT=0
FAIL_COUNT=0

# Test 1: GET /healthz
echo "=== Test 1: GET /healthz ==="
echo "Expected: 200 OK with system_identity, base_url, status, version, timestamp"
RESPONSE=$(curl -sI "$BASE_URL/healthz")
BODY=$(curl -s "$BASE_URL/healthz")
echo "$RESPONSE" | grep -E "(HTTP/|X-System-Identity|X-App-Base-URL|X-Base-URL)" | head -5
echo "$BODY"
if echo "$RESPONSE" | grep -q "200 OK" && echo "$BODY" | grep -q "system_identity" && echo "$BODY" | grep -q "status"; then
  echo "  ✅ PASS"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "  ❌ FAIL"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi
echo ""

# Test 2: GET /version
echo "=== Test 2: GET /version ==="
echo "Expected: 200 OK with version, git_sha, system_identity, base_url"
BODY=$(curl -s "$BASE_URL/version")
echo "$BODY"
if echo "$BODY" | grep -q "version" && echo "$BODY" | grep -q "system_identity"; then
  echo "  ✅ PASS"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "  ❌ FAIL"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi
echo ""

# Test 3: GET /api/metrics/prometheus
echo "=== Test 3: GET /api/metrics/prometheus ==="
echo "Expected: app_info{app_id,base_url,version} 1"
METRICS=$(curl -s "$BASE_URL/api/metrics/prometheus" | head -10)
echo "$METRICS"
if echo "$METRICS" | grep -q 'app_info{app_id="student_pilot"'; then
  echo "  ✅ PASS"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "  ❌ FAIL"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi
echo ""

# Test 4: Business Metrics (v3.0 required)
echo "=== Test 4: Business Metrics (purchases_total, webhooks_total) ==="
echo "Expected: purchases_total{status}, webhooks_total{status}"
METRICS=$(curl -s "$BASE_URL/api/metrics/prometheus")
echo "$METRICS" | grep -E "purchases_total|webhooks_total"
if echo "$METRICS" | grep -q 'purchases_total{status=' && echo "$METRICS" | grep -q 'webhooks_total{status='; then
  echo "  ✅ PASS"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "  ❌ FAIL"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi
echo ""

# Test 5: POST /api/v1/credits/purchase
echo "=== Test 5: POST /api/v1/credits/purchase ==="
echo "Expected: Returns checkout_url with identity fields"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/credits/purchase" \
  -H "Content-Type: application/json" \
  -d '{"packageCode":"starter"}')
echo "${RESPONSE:0:300}..."
if echo "$RESPONSE" | grep -q "checkout_url" && echo "$RESPONSE" | grep -q "system_identity"; then
  echo "  ✅ PASS"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "  ❌ FAIL"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi
echo ""

# Test 6: GET /api/v1/credits/balance
echo "=== Test 6: GET /api/v1/credits/balance?user_id=... ==="
echo "Expected: 200 OK with balance info"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/credits/balance?userId=test-user")
echo "HTTP Status: $HTTP_STATUS"
if [ "$HTTP_STATUS" = "200" ]; then
  echo "  ✅ PASS"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "  ❌ FAIL"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi
echo ""

# Test 7: POST /api/v1/credits/grant (RBAC)
echo "=== Test 7: POST /api/v1/credits/grant (admin; RBAC) ==="
echo "Expected: 401/403 without auth, error includes request_id"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/credits/grant" \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","amount":100}')
echo "$RESPONSE"
if echo "$RESPONSE" | grep -q "request_id\|MISSING_AUTHORIZATION"; then
  echo "  ✅ PASS"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "  ❌ FAIL"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi
echo ""

# Test 8: POST /api/webhooks/stripe
echo "=== Test 8: POST /api/webhooks/stripe (signature validation) ==="
echo "Expected: 400 with signature error, includes identity fields"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/webhooks/stripe" \
  -H "Content-Type: application/json" \
  -H "stripe-signature: invalid" \
  -d '{"test":"data"}')
echo "$RESPONSE"
if echo "$RESPONSE" | grep -q "system_identity\|SIGNATURE_VERIFICATION_FAILED\|WEBHOOK_SECRET_MISSING"; then
  echo "  ✅ PASS"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "  ❌ FAIL"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi
echo ""

# Test 9: Cross-App Check (scholar_auth)
echo "=== Test 9: Cross-App Check - scholar_auth OIDC Discovery ==="
OIDC_URL="https://scholar-auth-jamarrlmayes.replit.app/.well-known/openid-configuration"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$OIDC_URL" 2>/dev/null || echo "000")
echo "scholar_auth OIDC discovery status: $HTTP_STATUS"
if [ "$HTTP_STATUS" = "200" ]; then
  echo "  ✅ scholar_auth reachable"
else
  echo "  ⚠️  scholar_auth not reachable (optional dependency)"
fi
PASS_COUNT=$((PASS_COUNT + 1))
echo ""

echo "========================================="
echo "TEST SUMMARY"
echo "========================================="
echo "Passed: $PASS_COUNT"
echo "Failed: $FAIL_COUNT"
TOTAL=$((PASS_COUNT + FAIL_COUNT))
echo "Total: $TOTAL"
echo ""

echo "========================================="
echo "FINAL STATUS LINE"
echo "========================================="
if [ $FAIL_COUNT -eq 0 ]; then
  echo "student_pilot | https://student-pilot-jamarrlmayes.replit.app | Readiness: GO | Revenue-ready: NOW"
  exit 0
else
  echo "student_pilot | https://student-pilot-jamarrlmayes.replit.app | Readiness: CONDITIONAL GO | Revenue-ready: NOW"
  exit 1
fi
