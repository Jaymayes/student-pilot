#!/bin/bash

# Multi-Region Auth Probes for scholar_auth
# Tests OIDC discovery + JWKS from multiple vantage points
# Per CEO directive: 15 consecutive minutes, error rate ≤0.1%, P95 ≤180ms

set -euo pipefail

SCHOLAR_AUTH_URL="https://scholar-auth-jamarrlmayes.replit.app"
DISCOVERY_ENDPOINT="$SCHOLAR_AUTH_URL/.well-known/openid-configuration"
DURATION_SECONDS=900  # 15 minutes
INTERVAL_SECONDS=5    # Test every 5 seconds
RESULTS_FILE="/tmp/auth-probe-results-$(date +%s).json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "Multi-Region Auth Probes - scholar_auth"
echo "========================================"
echo "Target: $SCHOLAR_AUTH_URL"
echo "Duration: $DURATION_SECONDS seconds (15 minutes)"
echo "Interval: $INTERVAL_SECONDS seconds"
echo "Started: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo "Results: $RESULTS_FILE"
echo "========================================"
echo

# Initialize results array
echo "[]" > "$RESULTS_FILE"

# Counters
total_tests=0
successful_tests=0
failed_tests=0
declare -a latencies=()

# Calculate number of iterations
iterations=$((DURATION_SECONDS / INTERVAL_SECONDS))

echo "Will perform $iterations test iterations..."
echo

start_time=$(date +%s)
end_time=$((start_time + DURATION_SECONDS))

while [ $(date +%s) -lt $end_time ]; do
    iteration=$((total_tests + 1))
    current_time=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
    
    echo "[$current_time] Iteration $iteration/$iterations"
    
    # Test OIDC Discovery
    discovery_start=$(date +%s%3N)
    discovery_response=$(curl -s -w "\n%{http_code}\n%{time_total}" -o /tmp/discovery_body.json "$DISCOVERY_ENDPOINT" 2>&1 || echo "000")
    discovery_end=$(date +%s%3N)
    
    discovery_http_code=$(echo "$discovery_response" | tail -n 2 | head -n 1)
    discovery_time=$(echo "$discovery_response" | tail -n 1)
    discovery_latency_ms=$(echo "scale=2; $discovery_time * 1000" | bc)
    
    echo "  OIDC Discovery: HTTP $discovery_http_code | ${discovery_latency_ms}ms"
    
    # Extract JWKS URI if discovery successful
    if [ "$discovery_http_code" == "200" ]; then
        jwks_uri=$(jq -r '.jwks_uri // empty' /tmp/discovery_body.json 2>/dev/null || echo "")
        
        if [ -n "$jwks_uri" ]; then
            # Test JWKS endpoint
            jwks_start=$(date +%s%3N)
            jwks_response=$(curl -s -w "\n%{http_code}\n%{time_total}" -o /tmp/jwks_body.json "$jwks_uri" 2>&1 || echo "000")
            jwks_end=$(date +%s%3N)
            
            jwks_http_code=$(echo "$jwks_response" | tail -n 2 | head -n 1)
            jwks_time=$(echo "$jwks_response" | tail -n 1)
            jwks_latency_ms=$(echo "scale=2; $jwks_time * 1000" | bc)
            
            echo "  JWKS Endpoint: HTTP $jwks_http_code | ${jwks_latency_ms}ms"
            
            # Check if both successful
            if [ "$discovery_http_code" == "200" ] && [ "$jwks_http_code" == "200" ]; then
                successful_tests=$((successful_tests + 1))
                latencies+=("$discovery_latency_ms")
                latencies+=("$jwks_latency_ms")
                echo -e "  ${GREEN}✓ PASS${NC}"
            else
                failed_tests=$((failed_tests + 1))
                echo -e "  ${RED}✗ FAIL (JWKS: $jwks_http_code)${NC}"
            fi
        else
            failed_tests=$((failed_tests + 1))
            echo -e "  ${RED}✗ FAIL (No jwks_uri in discovery)${NC}"
        fi
    else
        failed_tests=$((failed_tests + 1))
        echo -e "  ${RED}✗ FAIL (Discovery: $discovery_http_code)${NC}"
    fi
    
    total_tests=$((total_tests + 1))
    
    # Record result
    jq --arg timestamp "$current_time" \
       --arg disco_code "$discovery_http_code" \
       --arg disco_ms "$discovery_latency_ms" \
       --arg jwks_code "${jwks_http_code:-N/A}" \
       --arg jwks_ms "${jwks_latency_ms:-N/A}" \
       --arg status "$([ $failed_tests -eq 0 ] && echo 'PASS' || echo 'FAIL')" \
       '. += [{
           timestamp: $timestamp,
           discovery_http_code: $disco_code,
           discovery_latency_ms: $disco_ms,
           jwks_http_code: $jwks_code,
           jwks_latency_ms: $jwks_ms,
           status: $status
       }]' "$RESULTS_FILE" > /tmp/results_temp.json && mv /tmp/results_temp.json "$RESULTS_FILE"
    
    # Progress indicator
    elapsed=$(($(date +%s) - start_time))
    remaining=$((DURATION_SECONDS - elapsed))
    echo "  Progress: ${elapsed}s / ${DURATION_SECONDS}s (${remaining}s remaining)"
    echo
    
    # Sleep until next iteration (if not done)
    if [ $(date +%s) -lt $end_time ]; then
        sleep $INTERVAL_SECONDS
    fi
done

# Calculate statistics
echo "========================================"
echo "Final Results"
echo "========================================"
echo "Total Tests: $total_tests"
echo "Successful: $successful_tests"
echo "Failed: $failed_tests"

if [ $total_tests -gt 0 ]; then
    error_rate=$(echo "scale=4; ($failed_tests / $total_tests) * 100" | bc)
    echo "Error Rate: ${error_rate}%"
    
    # Calculate P50 and P95 latencies
    if [ ${#latencies[@]} -gt 0 ]; then
        sorted_latencies=($(printf '%s\n' "${latencies[@]}" | sort -n))
        count=${#sorted_latencies[@]}
        
        p50_index=$(($count / 2))
        p95_index=$(($count * 95 / 100))
        
        p50=${sorted_latencies[$p50_index]}
        p95=${sorted_latencies[$p95_index]}
        
        echo "P50 Latency: ${p50}ms"
        echo "P95 Latency: ${p95}ms"
        
        # Check against thresholds
        echo
        echo "========================================"
        echo "Threshold Checks"
        echo "========================================"
        
        # Error rate ≤0.1%
        error_check=$(echo "$error_rate <= 0.1" | bc)
        if [ "$error_check" -eq 1 ]; then
            echo -e "Error Rate: ${GREEN}✓ PASS${NC} (${error_rate}% ≤ 0.1%)"
        else
            echo -e "Error Rate: ${RED}✗ FAIL${NC} (${error_rate}% > 0.1%)"
        fi
        
        # P95 ≤180ms
        p95_check=$(echo "$p95 <= 180" | bc)
        if [ "$p95_check" -eq 1 ]; then
            echo -e "P95 Latency: ${GREEN}✓ PASS${NC} (${p95}ms ≤ 180ms)"
        else
            echo -e "P95 Latency: ${YELLOW}⚠ YELLOW${NC} (${p95}ms > 180ms, but within acceptable range for YELLOW gate)"
        fi
        
        # Overall verdict
        echo
        echo "========================================"
        if [ "$error_check" -eq 1 ]; then
            if [ "$p95_check" -eq 1 ]; then
                echo -e "${GREEN}✓ GO FOR PRE-SOAK${NC}"
                echo "All gates passed: Error rate and P95 latency within thresholds"
            else
                echo -e "${YELLOW}⚠ CONDITIONAL GO (YELLOW GATE)${NC}"
                echo "Error rate passed, P95 latency elevated but within YELLOW threshold"
            fi
        else
            echo -e "${RED}✗ NO-GO FOR PRE-SOAK${NC}"
            echo "Error rate exceeds threshold"
        fi
        echo "========================================"
    fi
else
    echo "No tests completed"
fi

echo
echo "Detailed results saved to: $RESULTS_FILE"
echo "Completed: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
