#!/bin/bash
echo "Detailed Security Header Analysis"
echo "=================================================================="
echo

test_app() {
  local app_name=$1
  local app_url=$2
  
  echo "App: $app_name"
  echo "URL: $app_url"
  echo "----------------------------------------"
  
  HEADERS=$(curl -sS -I -m 10 "$app_url" 2>&1)
  
  # Check each required header
  if echo "$HEADERS" | grep -qi "Strict-Transport-Security"; then
    echo "✅ Strict-Transport-Security: $(echo "$HEADERS" | grep -i "Strict-Transport-Security" | head -1 | cut -d: -f2- | xargs)"
  else
    echo "❌ Strict-Transport-Security: MISSING"
  fi
  
  if echo "$HEADERS" | grep -qi "Content-Security-Policy"; then
    echo "✅ Content-Security-Policy: PRESENT"
  else
    echo "❌ Content-Security-Policy: MISSING"
  fi
  
  if echo "$HEADERS" | grep -qi "X-Frame-Options"; then
    echo "✅ X-Frame-Options: $(echo "$HEADERS" | grep -i "X-Frame-Options" | head -1 | cut -d: -f2- | xargs)"
  else
    echo "❌ X-Frame-Options: MISSING"
  fi
  
  if echo "$HEADERS" | grep -qi "X-Content-Type-Options"; then
    echo "✅ X-Content-Type-Options: $(echo "$HEADERS" | grep -i "X-Content-Type-Options" | head -1 | cut -d: -f2- | xargs)"
  else
    echo "❌ X-Content-Type-Options: MISSING"
  fi
  
  if echo "$HEADERS" | grep -qi "Referrer-Policy"; then
    echo "✅ Referrer-Policy: $(echo "$HEADERS" | grep -i "Referrer-Policy" | head -1 | cut -d: -f2- | xargs)"
  else
    echo "❌ Referrer-Policy: MISSING"
  fi
  
  if echo "$HEADERS" | grep -qi "Permissions-Policy"; then
    echo "✅ Permissions-Policy: PRESENT"
  else
    echo "❌ Permissions-Policy: MISSING"
  fi
  
  echo
}

# Test revenue-critical apps first
test_app "student_pilot" "https://student-pilot-jamarrlmayes.replit.app"
test_app "scholarship_api" "https://scholarship-api-jamarrlmayes.replit.app"
test_app "scholar_auth" "https://scholar-auth-jamarrlmayes.replit.app"
test_app "provider_register" "https://provider-register-jamarrlmayes.replit.app"
