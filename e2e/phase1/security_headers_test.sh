#!/bin/bash
echo "Security Headers Validation (6 Required Headers)"
echo "=================================================================="
echo

APPS=(
  "scholar-auth:https://scholar-auth-jamarrlmayes.replit.app"
  "scholarship-api:https://scholarship-api-jamarrlmayes.replit.app"
  "scholarship-agent:https://scholarship-agent-jamarrlmayes.replit.app"
  "scholarship-sage:https://scholarship-sage-jamarrlmayes.replit.app"
  "student-pilot:https://student-pilot-jamarrlmayes.replit.app"
  "provider-register:https://provider-register-jamarrlmayes.replit.app"
  "auto-page-maker:https://auto-page-maker-jamarrlmayes.replit.app"
  "auto-com-center:https://auto-com-center-jamarrlmayes.replit.app"
)

REQUIRED_HEADERS=(
  "Strict-Transport-Security"
  "Content-Security-Policy"
  "X-Frame-Options"
  "X-Content-Type-Options"
  "Referrer-Policy"
  "Permissions-Policy"
)

for app_entry in "${APPS[@]}"; do
  IFS=':' read -r app_name app_url <<< "$app_entry"
  echo "Testing: $app_name"
  echo "  URL: $app_url"
  
  HEADERS=$(curl -sS -I -m 10 "$app_url" 2>&1)
  
  count=0
  for header in "${REQUIRED_HEADERS[@]}"; do
    if echo "$HEADERS" | grep -qi "$header"; then
      count=$((count + 1))
    fi
  done
  
  echo "  Headers: $count/6"
  if [ $count -eq 6 ]; then
    echo "  Status: ✅ PASS"
  else
    echo "  Status: ⚠️  INCOMPLETE"
  fi
  echo
done
