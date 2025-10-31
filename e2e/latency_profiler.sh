#!/bin/bash
# Latency Profiler - P50/P95/P99 Measurement (5 samples per endpoint)

measure_latency() {
  local url=$1
  local endpoint=$2
  local full_url="${url}${endpoint}"
  
  echo "Measuring: $full_url"
  
  declare -a times
  for i in {1..5}; do
    START=$(date +%s%3N)
    STATUS=$(curl -o /dev/null -s -w "%{http_code}" -m 10 "$full_url" 2>&1)
    END=$(date +%s%3N)
    LATENCY=$((END - START))
    times+=($LATENCY)
    echo "  Sample $i: ${LATENCY}ms (HTTP $STATUS)"
    sleep 0.5
  done
  
  # Sort times
  IFS=$'\n' sorted=($(sort -n <<<"${times[*]}"))
  unset IFS
  
  # Calculate percentiles
  P50=${sorted[2]}  # 50th percentile (median of 5 samples)
  P95=${sorted[4]}  # 95th percentile (max of 5 samples)
  P99=${sorted[4]}  # 99th percentile (max of 5 samples)
  
  echo "  P50: ${P50}ms | P95: ${P95}ms | P99: ${P99}ms"
  echo
  
  # Return values for parsing
  echo "RESULT|$full_url|$P50|$P95|$P99"
}

echo "═══════════════════════════════════════════════════════════════════════════════"
echo "  LATENCY PROFILING — All 8 Apps (P50/P95/P99)"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo

# Revenue-critical apps first
measure_latency "https://student-pilot-jamarrlmayes.replit.app" "/"
measure_latency "https://student-pilot-jamarrlmayes.replit.app" "/canary"

measure_latency "https://scholarship-api-jamarrlmayes.replit.app" "/"
measure_latency "https://scholarship-api-jamarrlmayes.replit.app" "/canary"

measure_latency "https://scholar-auth-jamarrlmayes.replit.app" "/"
measure_latency "https://scholar-auth-jamarrlmayes.replit.app" "/canary"

measure_latency "https://provider-register-jamarrlmayes.replit.app" "/"
measure_latency "https://provider-register-jamarrlmayes.replit.app" "/canary"

echo "═══════════════════════════════════════════════════════════════════════════════"
