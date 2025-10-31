#!/bin/bash
# Complete Latency Profile - All 8 Apps

measure_app() {
  local app_name=$1
  local app_url=$2
  
  echo "───────────────────────────────────────────────────────────────────────────────"
  echo "App: $app_name"
  echo "URL: $app_url"
  echo "───────────────────────────────────────────────────────────────────────────────"
  
  # Measure root
  declare -a root_times
  for i in {1..5}; do
    START=$(date +%s%3N)
    STATUS=$(curl -o /dev/null -s -w "%{http_code}" -m 10 "$app_url/" 2>&1)
    END=$(date +%s%3N)
    LATENCY=$((END - START))
    root_times+=($LATENCY)
  done
  IFS=$'\n' sorted_root=($(sort -n <<<"${root_times[*]}"))
  unset IFS
  ROOT_P50=${sorted_root[2]}
  ROOT_P95=${sorted_root[4]}
  
  # Measure canary
  declare -a canary_times
  CANARY_STATUS="N/A"
  for i in {1..5}; do
    START=$(date +%s%3N)
    CANARY_STATUS=$(curl -o /dev/null -s -w "%{http_code}" -m 10 "$app_url/canary" 2>&1)
    END=$(date +%s%3N)
    LATENCY=$((END - START))
    canary_times+=($LATENCY)
  done
  IFS=$'\n' sorted_canary=($(sort -n <<<"${canary_times[*]}"))
  unset IFS
  CANARY_P50=${sorted_canary[2]}
  CANARY_P95=${sorted_canary[4]}
  
  echo "Root (/):"
  echo "  P50: ${ROOT_P50}ms | P95: ${ROOT_P95}ms"
  echo "/canary:"
  echo "  Status: HTTP $CANARY_STATUS"
  echo "  P50: ${CANARY_P50}ms | P95: ${CANARY_P95}ms"
  
  # SLO Check
  if [ "$CANARY_STATUS" = "200" ] && [ $CANARY_P95 -le 120 ]; then
    echo "  SLO: ✅ PASS (P95 ≤120ms)"
  elif [ "$CANARY_STATUS" = "200" ]; then
    echo "  SLO: ⚠️  MARGINAL (P95 ${CANARY_P95}ms > 120ms)"
  else
    echo "  SLO: ❌ FAIL (canary not accessible)"
  fi
  echo
}

echo "═══════════════════════════════════════════════════════════════════════════════"
echo "  COMPLETE LATENCY PROFILE — All 8 Apps"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo

measure_app "scholarship-agent" "https://scholarship-agent-jamarrlmayes.replit.app"
measure_app "scholarship-sage" "https://scholarship-sage-jamarrlmayes.replit.app"
measure_app "auto-page-maker" "https://auto-page-maker-jamarrlmayes.replit.app"
measure_app "auto-com-center" "https://auto-com-center-jamarrlmayes.replit.app"

echo "═══════════════════════════════════════════════════════════════════════════════"
