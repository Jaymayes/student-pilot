#!/bin/bash

# Quick Auth Probe for immediate Go/No-Go decision
# Tests OIDC discovery + JWKS with multiple samples
# Provides rapid assessment against CEO thresholds

set -euo pipefail

SCHOLAR_AUTH_URL="https://scholar-auth-jamarrlmayes.replit.app"
DISCOVERY_ENDPOINT="$SCHOLAR_AUTH_URL/.well-known/openid-configuration"
NUM_SAMPLES=30  # 30 samples over ~2.5 minutes
INTERVAL_SECONDS=5

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================"
echo "Quick Auth Probe - Go/No-Go Decision"
echo "========================================"
echo "Target: $SCHOLAR_AUTH_URL"
echo "Samples: $NUM_SAMPLES"
echo "Started: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo "========================================"
echo

successful=0
failed=0
declare -a latencies=()

for i in $(seq 1 $NUM_SAMPLES); do
    echo "[$i/$NUM_SAMPLES] Testing..."
    
    # Test OIDC Discovery
    disco_result=$(curl -s -w "\n%{http_code}\n%{time_total}" -o /tmp/disco.json "$DISCOVERY_ENDPOINT" 2>&1 || echo -e "\n000\n0")
    disco_code=$(echo "$disco_result" | tail -n 2 | head -n 1)
    disco_time=$(echo "$disco_result" | tail -n 1)
    disco_ms=$(echo "scale=2; $disco_time * 1000" | bc 2>/dev/null || echo "0")
    
    echo "  Discovery: HTTP $disco_code | ${disco_ms}ms"
    
    if [ "$disco_code" == "200" ]; then
        jwks_uri=$(jq -r '.jwks_uri // empty' /tmp/disco.json 2>/dev/null || echo "")
        
        if [ -n "$jwks_uri" ]; then
            # Test JWKS
            jwks_result=$(curl -s -w "\n%{http_code}\n%{time_total}" -o /tmp/jwks.json "$jwks_uri" 2>&1 || echo -e "\n000\n0")
            jwks_code=$(echo "$jwks_result" | tail -n 2 | head -n 1)
            jwks_time=$(echo "$jwks_result" | tail -n 1)
            jwks_ms=$(echo "scale=2; $jwks_time * 1000" | bc 2>/dev/null || echo "0")
            
            echo "  JWKS: HTTP $jwks_code | ${jwks_ms}ms"
            
            if [ "$jwks_code" == "200" ]; then
                successful=$((successful + 1))
                latencies+=("$disco_ms")
                latencies+=("$jwks_ms")
                echo -e "  ${GREEN}✓${NC}"
            else
                failed=$((failed + 1))
                echo -e "  ${RED}✗ FAIL (JWKS)${NC}"
            fi
        else
            failed=$((failed + 1))
            echo -e "  ${RED}✗ FAIL (No JWKS URI)${NC}"
        fi
    else
        failed=$((failed + 1))
        echo -e "  ${RED}✗ FAIL (Discovery)${NC}"
    fi
    
    if [ $i -lt $NUM_SAMPLES ]; then
        sleep $INTERVAL_SECONDS
    fi
done

total=$((successful + failed))

echo
echo "========================================"
echo "Results"
echo "========================================"
echo "Total: $total"
echo "Success: $successful"
echo "Failed: $failed"

if [ $total -gt 0 ]; then
    error_rate=$(echo "scale=4; ($failed / $total) * 100" | bc)
    echo "Error Rate: ${error_rate}%"
    
    if [ ${#latencies[@]} -gt 0 ]; then
        sorted=($(printf '%s\n' "${latencies[@]}" | sort -n))
        count=${#sorted[@]}
        
        p50_idx=$(($count / 2))
        p95_idx=$(($count * 95 / 100))
        
        p50=${sorted[$p50_idx]}
        p95=${sorted[$p95_idx]}
        
        echo "P50 Latency: ${p50}ms"
        echo "P95 Latency: ${p95}ms"
        
        echo
        echo "========================================"
        echo "Go/No-Go Decision"
        echo "========================================"
        
        error_ok=$(echo "$error_rate <= 0.1" | bc)
        p95_ok=$(echo "$p95 <= 180" | bc)
        
        if [ "$error_ok" -eq 1 ]; then
            echo -e "Error Rate: ${GREEN}✓ PASS${NC} (${error_rate}% ≤ 0.1%)"
        else
            echo -e "Error Rate: ${RED}✗ FAIL${NC} (${error_rate}% > 0.1%)"
        fi
        
        if [ "$p95_ok" -eq 1 ]; then
            echo -e "P95 Latency: ${GREEN}✓ PASS${NC} (${p95}ms ≤ 180ms)"
        else
            echo -e "P95 Latency: ${YELLOW}⚠ YELLOW${NC} (${p95}ms > 180ms)"
        fi
        
        echo
        if [ "$error_ok" -eq 1 ]; then
            if [ "$p95_ok" -eq 1 ]; then
                echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
                echo -e "${GREEN}   GO FOR PRE-SOAK   ${NC}"
                echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            else
                echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
                echo -e "${YELLOW}   CONDITIONAL GO (YELLOW GATE)   ${NC}"
                echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            fi
        else
            echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "${RED}   NO-GO FOR PRE-SOAK   ${NC}"
            echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        fi
    fi
fi

echo
echo "Completed: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
