#!/bin/bash
# Canary v2.6 Schema Validator - Exact 9-field check

validate_canary() {
  local app_name=$1
  local app_url=$2
  
  echo "───────────────────────────────────────────────────────────────────────────────"
  echo "Validating: $app_name"
  echo "URL: $app_url/canary"
  
  RESPONSE=$(curl -sS -m 10 "$app_url/canary" 2>&1)
  STATUS=$?
  
  if [ $STATUS -ne 0 ]; then
    echo "❌ FAIL: Connection error"
    echo
    return
  fi
  
  # Check if it's valid JSON
  if ! echo "$RESPONSE" | jq . >/dev/null 2>&1; then
    echo "❌ FAIL: Not valid JSON or 404"
    echo "Response: $RESPONSE" | head -c 200
    echo
    return
  fi
  
  echo "Response:"
  echo "$RESPONSE" | jq .
  echo
  
  # Validate 9 required fields
  FIELDS=("app" "app_base_url" "version" "status" "p95_ms" "security_headers" "dependencies_ok" "server_time_utc" "revenue_role")
  
  missing=()
  for field in "${FIELDS[@]}"; do
    if ! echo "$RESPONSE" | jq -e ".$field" >/dev/null 2>&1; then
      missing+=("$field")
    fi
  done
  
  if [ ${#missing[@]} -eq 0 ]; then
    # Check version field
    VERSION=$(echo "$RESPONSE" | jq -r '.version')
    if [ "$VERSION" = "v2.6" ]; then
      echo "✅ PASS: All 9 fields present, version=v2.6"
    else
      echo "⚠️  WARNING: All fields present but version=$VERSION (expected v2.6)"
    fi
  else
    echo "❌ FAIL: Missing fields: ${missing[*]}"
  fi
  echo
}

echo "═══════════════════════════════════════════════════════════════════════════════"
echo "  CANARY v2.6 SCHEMA VALIDATION — All 8 Apps"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo

validate_canary "scholar_auth" "https://scholar-auth-jamarrlmayes.replit.app"
validate_canary "scholarship_api" "https://scholarship-api-jamarrlmayes.replit.app"
validate_canary "scholarship_agent" "https://scholarship-agent-jamarrlmayes.replit.app"
validate_canary "scholarship_sage" "https://scholarship-sage-jamarrlmayes.replit.app"
validate_canary "student_pilot" "https://student-pilot-jamarrlmayes.replit.app"
validate_canary "provider_register" "https://provider-register-jamarrlmayes.replit.app"
validate_canary "auto_page_maker" "https://auto-page-maker-jamarrlmayes.replit.app"
validate_canary "auto_com_center" "https://auto-com-center-jamarrlmayes.replit.app"

echo "═══════════════════════════════════════════════════════════════════════════════"
