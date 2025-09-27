#!/bin/bash

# Baseline Capacity Test Runner - Task perf-6b
# CEO Objective: Establish sustainable throughput with P95 ≤ 100ms, P99 ≤ 250ms, Error rate ≤ 0.1%

echo "🎯 ScholarLink Enterprise Load Testing - Baseline Capacity"
echo "========================================================"
echo "Target: 12-month growth capacity with 3x headroom"
echo "SLO: P95 ≤ 100ms, P99 ≤ 250ms, Error rate ≤ 0.1%"
echo ""

# Set environment variables for test
export BASE_URL=${BASE_URL:-"http://localhost:5000"}
export K6_WEB_DASHBOARD=true
export K6_WEB_DASHBOARD_PORT=5555

# Ensure application is running
echo "🚀 Checking application health..."
if ! curl -f "$BASE_URL/health" >/dev/null 2>&1; then
    echo "❌ Application not responding at $BASE_URL"
    echo "   Please start the application first: npm run dev"
    exit 1
fi

echo "✅ Application healthy at $BASE_URL"
echo ""

# Create results directory
mkdir -p load-tests/results/baseline
cd load-tests

# Pre-test system warmup
echo "🔥 Warming up system caches..."
curl -s "$BASE_URL/api/health" >/dev/null
curl -s "$BASE_URL/api/scholarships?limit=10" >/dev/null
curl -s "$BASE_URL/health" >/dev/null
sleep 2

echo "✅ System warmed up"
echo ""

# Run baseline capacity test
echo "🎯 Starting Baseline Capacity Test..."
echo "   Duration: ~24 minutes"
echo "   Max Concurrent Users: 300"
echo "   Dashboard: http://localhost:5555"
echo ""

k6 run \
  --out json=results/baseline/baseline-capacity-$(date +%Y%m%d-%H%M%S).json \
  --summary-export=results/baseline/baseline-summary-$(date +%Y%m%d-%H%M%S).json \
  --tag environment=development \
  --tag test_type=baseline_capacity \
  --tag target_aru=10M \
  scenarios/baseline-capacity.js

# Check results
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Baseline Capacity Test COMPLETED"
    echo "📊 Results:"
    echo "   - HTML Report: baseline-capacity-report.html"
    echo "   - JSON Data: results/baseline/"
    echo "   - Dashboard: http://localhost:5555"
    echo ""
    echo "🎯 Gate 1 Decision:"
    echo "   Review P95, P99 latencies and error rates"
    echo "   Target: P95 ≤ 100ms, P99 ≤ 250ms, Error rate ≤ 0.1%"
    echo "   If failed: Pause and remediate hotspots before stress testing"
else
    echo ""
    echo "❌ Baseline Capacity Test FAILED"
    echo "   Check application logs and system resources"
    echo "   Resolve issues before proceeding to stress testing"
    exit 1
fi