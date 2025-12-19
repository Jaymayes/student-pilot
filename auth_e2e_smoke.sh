#!/bin/bash
# A5 student_pilot Auth E2E Smoke Test
# Tests authentication endpoints per Ecosystem Auth Diagnostic Prompt

set -e

APP_NAME="student_pilot"
APP_BASE_URL="https://student-pilot-jamarrlmayes.replit.app"
IDP_URL="https://scholar-auth-jamarrlmayes.replit.app/oidc"

echo "============================================"
echo "APP IDENTIFIED: $APP_NAME | APP_BASE_URL=$APP_BASE_URL"
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() { echo -e "${GREEN}✅ PASS${NC}: $1"; }
fail() { echo -e "${RED}❌ FAIL${NC}: $1"; }
warn() { echo -e "${YELLOW}⚠️  WARN${NC}: $1"; }

echo "=== 1. PREFLIGHT CHECKS ==="
echo ""

# 1.1 IdP Discovery
echo "Testing IdP Discovery..."
IDP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$IDP_URL/.well-known/openid-configuration")
if [ "$IDP_STATUS" = "200" ]; then
  pass "IdP Discovery ($IDP_URL) returned $IDP_STATUS"
else
  fail "IdP Discovery returned $IDP_STATUS (expected 200)"
fi

# 1.2 Login endpoint
echo "Testing /api/login..."
LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$APP_BASE_URL/api/login" -L --max-redirs 0 2>/dev/null || true)
if [ "$LOGIN_STATUS" = "302" ] || [ "$LOGIN_STATUS" = "303" ]; then
  pass "/api/login returned $LOGIN_STATUS (redirect to IdP)"
else
  fail "/api/login returned $LOGIN_STATUS (expected 302/303)"
fi

# 1.3 Protected route (unauthenticated)
echo "Testing /api/auth/user (unauthenticated)..."
UNAUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$APP_BASE_URL/api/auth/user")
if [ "$UNAUTH_STATUS" = "401" ]; then
  pass "/api/auth/user (unauth) returned $UNAUTH_STATUS"
else
  fail "/api/auth/user (unauth) returned $UNAUTH_STATUS (expected 401)"
fi

# 1.4 Health endpoint
echo "Testing /api/health..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$APP_BASE_URL/api/health")
if [ "$HEALTH_STATUS" = "200" ]; then
  pass "/api/health returned $HEALTH_STATUS"
else
  warn "/api/health returned $HEALTH_STATUS"
fi

echo ""
echo "=== 2. TELEMETRY CHECKS ==="
echo ""

# 2.1 Check telemetry ingest
echo "Testing A8 /ingest endpoint..."
INGEST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -H "X-App-ID: $APP_NAME" \
  -d '{"event_type":"smoke_test","app_name":"student_pilot","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}' \
  "https://auto-com-center-jamarrlmayes.replit.app/ingest")
if [ "$INGEST_STATUS" = "200" ] || [ "$INGEST_STATUS" = "201" ] || [ "$INGEST_STATUS" = "204" ]; then
  pass "A8 /ingest returned $INGEST_STATUS"
else
  warn "A8 /ingest returned $INGEST_STATUS"
fi

echo ""
echo "=== 3. CORS PREFLIGHT ==="
echo ""

# 3.1 CORS preflight from A8 origin
echo "Testing CORS preflight from A8..."
CORS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS \
  -H "Origin: https://auto-com-center-jamarrlmayes.replit.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  "$APP_BASE_URL/api/auth/user")
if [ "$CORS_STATUS" = "200" ] || [ "$CORS_STATUS" = "204" ]; then
  pass "CORS preflight returned $CORS_STATUS"
else
  warn "CORS preflight returned $CORS_STATUS"
fi

echo ""
echo "=== 4. SECRETS CHECK ==="
echo ""

# Check if critical env vars are set (without revealing values)
check_secret() {
  if [ -n "${!1}" ]; then
    pass "$1 is SET"
  else
    fail "$1 is NOT SET"
  fi
}

check_secret "AUTH_ISSUER_URL"
check_secret "AUTH_CLIENT_SECRET"
check_secret "SESSION_SECRET"
check_secret "S2S_API_KEY"

echo ""
echo "============================================"
echo "SMOKE TEST COMPLETE"
echo "============================================"
