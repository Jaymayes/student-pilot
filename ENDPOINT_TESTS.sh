#!/bin/bash
# AGENT3 UNIFIED EXECUTION - ENDPOINT TESTS
# System Identity: student_pilot | Base URL: https://student-pilot-jamarrlmayes.replit.app

set -e

BASE_URL="${BASE_URL:-http://localhost:5000}"
echo "========================================="
echo "AGENT3 Endpoint Tests - student_pilot"
echo "========================================="
echo "Base URL: $BASE_URL"
echo ""

# Test 1: GET /healthz
echo "=== Test 1: GET /healthz ==="
echo "Expected: 200 OK with system_identity and base_url in JSON and headers"
curl -i "$BASE_URL/healthz" 2>&1 | grep -E "(HTTP/|X-System-Identity|X-Base-URL|system_identity|base_url)" | head -10
echo ""

# Test 2: GET /version
echo "=== Test 2: GET /version ==="
echo "Expected: 200 OK with system_identity, base_url, service, version in JSON and headers"
curl -i "$BASE_URL/version" 2>&1 | grep -E "(HTTP/|X-System-Identity|X-Base-URL|system_identity|base_url|service|version)" | head -15
echo ""

# Test 3: GET /api/metrics/prometheus
echo "=== Test 3: GET /api/metrics/prometheus ==="
echo "Expected: 200 OK with app_info metric including app_id, base_url, version"
curl -s "$BASE_URL/api/metrics/prometheus" | grep -A1 "app_info"
echo ""

# Test 4: Authentication check (login endpoint exists)
echo "=== Test 4: Authentication Endpoint Check ==="
echo "Expected: /api/auth/login or /api/user endpoint exists"
curl -s -o /dev/null -w "HTTP Status: %{http_code}" "$BASE_URL/api/user"
echo ""
echo ""

# Test 5: Credit balance endpoint (integration with scholarship_api)
echo "=== Test 5: GET /api/v1/credits/balance ==="
echo "Expected: 200 OK or 401/403 (authentication required)"
curl -s -o /dev/null -w "HTTP Status: %{http_code}" "$BASE_URL/api/v1/credits/balance?userId=test_user"
echo ""
echo ""

# Test 6: Error response format (should include request_id, no secrets leaked)
echo "=== Test 6: Error Response Format ==="
echo "Expected: 4xx/5xx with request_id, no secrets in response"
curl -s "$BASE_URL/api/v1/credits/credit" -X POST -H "Content-Type: application/json" | grep -E "(error|request_id|code|message)" | head -5
echo ""

echo "========================================="
echo "All tests completed"
echo "========================================="
