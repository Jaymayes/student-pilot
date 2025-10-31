#!/bin/bash
# P95 Calculator - 30 samples per endpoint (respecting 1 RPS limit)

measure_endpoint_30() {
  local url=$1
  local name=$2
  
  echo "Measuring: $name"
  echo "URL: $url"
  echo "Taking 30 samples (30 seconds)..."
  
  declare -a times
  for i in {1..30}; do
    START=$(date +%s%3N)
    STATUS=$(curl -o /dev/null -s -w "%{http_code}" -m 10 "$url" 2>&1)
    END=$(date +%s%3N)
    LATENCY=$((END - START))
    times+=($LATENCY)
    printf "."
    sleep 1  # Respect 1 RPS limit
  done
  echo
  
  # Sort times
  IFS=$'\n' sorted=($(sort -n <<<"${times[*]}"))
  unset IFS
  
  # Calculate percentiles from 30 samples
  P50=${sorted[15]}  # 50th percentile (median)
  P95_INDEX=$(( (95 * 30 / 100) - 1 ))
  P95=${sorted[$P95_INDEX]}  # 95th percentile
  P99_INDEX=$(( (99 * 30 / 100) - 1 ))
  P99=${sorted[$P99_INDEX]}  # 99th percentile
  
  echo "Results: P50=${P50}ms | P95=${P95}ms | P99=${P99}ms"
  echo "DATA|$name|$url|$P50|$P95|$P99"
  echo
}

echo "═══════════════════════════════════════════════════════════════════════════════"
echo "  P95 Measurement — 30 Samples (1 RPS rate limit)"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo

# A5 student_pilot (B2C revenue engine)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "A5: student_pilot (B2C Revenue Engine)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
measure_endpoint_30 "https://student-pilot-jamarrlmayes.replit.app/" "student_pilot_root"
measure_endpoint_30 "https://student-pilot-jamarrlmayes.replit.app/canary" "student_pilot_canary"

echo "═══════════════════════════════════════════════════════════════════════════════"
