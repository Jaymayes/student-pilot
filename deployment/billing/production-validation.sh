#!/bin/bash
# Production Validation Script for ScholarLink Billing Service
# Comprehensive validation with JWT token testing

set -euo pipefail

# Configuration
BILLING_DOMAIN="billing.student-pilot.replit.app"
NAMESPACE="scholarlink-prod"

# Test JWT token (replace with actual valid token for testing)
TEST_JWT_TOKEN="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9..." # REPLACE WITH ACTUAL TOKEN

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
warning() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }

# ==============================================================================
# PRODUCTION VALIDATION TESTS
# ==============================================================================

test_user_profile() {
    log "Testing user profile endpoint with valid JWT..."
    
    RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -H "Authorization: Bearer ${TEST_JWT_TOKEN}" \
        -H "Content-Type: application/json" \
        https://${BILLING_DOMAIN}/api/users/profile)
    
    HTTP_CODE=$(echo $RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    BODY=$(echo $RESPONSE | sed -e 's/HTTPSTATUS:.*//g')
    
    if [ "$HTTP_CODE" = "200" ]; then
        success "User profile endpoint: ${HTTP_CODE}"
        echo "Response: ${BODY}" | jq '.'
    else
        error "User profile failed: ${HTTP_CODE}"
        echo "Response: ${BODY}"
        return 1
    fi
}

test_credit_purchase() {
    log "Testing credit purchase (Starter Package - \$5.00)..."
    
    RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST \
        -H "Authorization: Bearer ${TEST_JWT_TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{"packageCode":"starter"}' \
        https://${BILLING_DOMAIN}/api/purchases)
    
    HTTP_CODE=$(echo $RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    BODY=$(echo $RESPONSE | sed -e 's/HTTPSTATUS:.*//g')
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        success "Credit purchase initiated: ${HTTP_CODE}"
        echo "Response: ${BODY}" | jq '.'
    else
        warning "Credit purchase response: ${HTTP_CODE}"
        echo "Response: ${BODY}"
    fi
}

test_usage_reconciliation() {
    log "Testing usage reconciliation..."
    
    IDEMPOTENCY_KEY="test-$(date +%s)-$$"
    
    RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST \
        -H "Authorization: Bearer ${TEST_JWT_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{
            \"model\": \"gpt-4o\",
            \"inputTokens\": 1000,
            \"outputTokens\": 500,
            \"idempotencyKey\": \"${IDEMPOTENCY_KEY}\"
        }" \
        https://${BILLING_DOMAIN}/api/usage/reconcile)
    
    HTTP_CODE=$(echo $RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    BODY=$(echo $RESPONSE | sed -e 's/HTTPSTATUS:.*//g')
    
    if [ "$HTTP_CODE" = "200" ]; then
        success "Usage reconciliation: ${HTTP_CODE}"
        echo "Response: ${BODY}" | jq '.'
        
        # Test idempotency
        log "Testing idempotency with same key..."
        RESPONSE2=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -X POST \
            -H "Authorization: Bearer ${TEST_JWT_TOKEN}" \
            -H "Content-Type: application/json" \
            -d "{
                \"model\": \"gpt-4o\",
                \"inputTokens\": 1000,
                \"outputTokens\": 500,
                \"idempotencyKey\": \"${IDEMPOTENCY_KEY}\"
            }" \
            https://${BILLING_DOMAIN}/api/usage/reconcile)
        
        HTTP_CODE2=$(echo $RESPONSE2 | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
        
        if [ "$HTTP_CODE2" = "200" ]; then
            success "Idempotency test passed: ${HTTP_CODE2}"
        else
            error "Idempotency test failed: ${HTTP_CODE2}"
        fi
    elif [ "$HTTP_CODE" = "402" ]; then
        warning "Usage reconciliation: Insufficient funds (${HTTP_CODE})"
        echo "Response: ${BODY}" | jq '.'
    else
        error "Usage reconciliation failed: ${HTTP_CODE}"
        echo "Response: ${BODY}"
    fi
}

test_ledger_access() {
    log "Testing ledger access..."
    
    RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -H "Authorization: Bearer ${TEST_JWT_TOKEN}" \
        -H "Content-Type: application/json" \
        https://${BILLING_DOMAIN}/api/ledger)
    
    HTTP_CODE=$(echo $RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    BODY=$(echo $RESPONSE | sed -e 's/HTTPSTATUS:.*//g')
    
    if [ "$HTTP_CODE" = "200" ]; then
        success "Ledger access: ${HTTP_CODE}"
        echo "Response: ${BODY}" | jq '.entries | length'
    else
        error "Ledger access failed: ${HTTP_CODE}"
        echo "Response: ${BODY}"
    fi
}

test_credit_packages() {
    log "Testing credit packages endpoint..."
    
    RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -H "Authorization: Bearer ${TEST_JWT_TOKEN}" \
        -H "Content-Type: application/json" \
        https://${BILLING_DOMAIN}/api/packages)
    
    HTTP_CODE=$(echo $RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    BODY=$(echo $RESPONSE | sed -e 's/HTTPSTATUS:.*//g')
    
    if [ "$HTTP_CODE" = "200" ]; then
        success "Credit packages: ${HTTP_CODE}"
        echo "Available packages:"
        echo "${BODY}" | jq '.packages[] | {code: .code, name: .name, credits: .credits, usdCents: .usdCents}'
    else
        error "Credit packages failed: ${HTTP_CODE}"
        echo "Response: ${BODY}"
    fi
}

test_insufficient_funds() {
    log "Testing insufficient funds scenario..."
    
    # Try to reconcile a large amount that would exceed balance
    RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST \
        -H "Authorization: Bearer ${TEST_JWT_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{
            \"model\": \"gpt-4o\",
            \"inputTokens\": 100000,
            \"outputTokens\": 50000,
            \"idempotencyKey\": \"large-test-$(date +%s)\"
        }" \
        https://${BILLING_DOMAIN}/api/usage/reconcile)
    
    HTTP_CODE=$(echo $RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    BODY=$(echo $RESPONSE | sed -e 's/HTTPSTATUS:.*//g')
    
    if [ "$HTTP_CODE" = "402" ]; then
        success "Insufficient funds handling: ${HTTP_CODE}"
        echo "Response: ${BODY}" | jq '.'
    elif [ "$HTTP_CODE" = "200" ]; then
        warning "Large transaction succeeded (sufficient balance)"
    else
        error "Insufficient funds test unexpected: ${HTTP_CODE}"
        echo "Response: ${BODY}"
    fi
}

# ==============================================================================
# LOAD TESTING
# ==============================================================================

run_load_test() {
    log "Running basic load test..."
    
    for i in {1..10}; do
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://${BILLING_DOMAIN}/health)
        TIME=$(curl -s -o /dev/null -w "%{time_total}" https://${BILLING_DOMAIN}/health)
        echo "Request $i: ${STATUS} (${TIME}s)"
        sleep 0.1
    done
    
    success "Load test completed"
}

# ==============================================================================
# BUSINESS VALIDATION
# ==============================================================================

validate_rate_card() {
    log "Validating rate card calculations..."
    
    # GPT-4o: 20 credits per 1k input, 60 credits per 1k output
    # Test: 1000 input + 500 output = 20 + 30 = 50 credits
    
    echo "Expected cost for GPT-4o (1k input + 500 output): 50 credits"
    echo "Rate card validation requires manual verification of actual charges"
}

# ==============================================================================
# MAIN EXECUTION
# ==============================================================================

run_all_tests() {
    log "Starting comprehensive production validation..."
    echo ""
    
    if [ "$TEST_JWT_TOKEN" = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9..." ]; then
        error "Please update TEST_JWT_TOKEN with a valid JWT token"
        echo "Get a token by logging into the main app and copying from browser dev tools"
        exit 1
    fi
    
    test_user_profile
    echo ""
    
    test_credit_packages
    echo ""
    
    test_credit_purchase
    echo ""
    
    test_usage_reconciliation
    echo ""
    
    test_ledger_access
    echo ""
    
    test_insufficient_funds
    echo ""
    
    run_load_test
    echo ""
    
    validate_rate_card
    echo ""
    
    success "Production validation completed!"
    echo ""
    
    warning "Manual verification checklist:"
    echo "□ Check Stripe dashboard for test purchase"
    echo "□ Verify ledger entries match expected calculations"
    echo "□ Confirm webhook delivery in Stripe dashboard"
    echo "□ Test CSV export download works"
    echo "□ Verify rate limiting kicks in after 100 requests/minute"
}

# ==============================================================================
# COMMAND LINE INTERFACE
# ==============================================================================

case "${1:-all}" in
    "profile")
        test_user_profile
        ;;
    "purchase")
        test_credit_purchase
        ;;
    "reconcile")
        test_usage_reconciliation
        ;;
    "ledger")
        test_ledger_access
        ;;
    "packages")
        test_credit_packages
        ;;
    "insufficient")
        test_insufficient_funds
        ;;
    "load")
        run_load_test
        ;;
    "rate-card")
        validate_rate_card
        ;;
    "all")
        run_all_tests
        ;;
    *)
        echo "Production Validation Script"
        echo ""
        echo "Usage: $0 [test]"
        echo ""
        echo "Tests:"
        echo "  profile      Test user profile endpoint"
        echo "  purchase     Test credit purchase"
        echo "  reconcile    Test usage reconciliation"
        echo "  ledger       Test ledger access"
        echo "  packages     Test credit packages"
        echo "  insufficient Test insufficient funds"
        echo "  load         Run basic load test"
        echo "  rate-card    Validate rate card"
        echo "  all          Run all tests (default)"
        echo ""
        echo "Configuration:"
        echo "  Domain: ${BILLING_DOMAIN}"
        echo "  JWT Token: ${TEST_JWT_TOKEN:0:20}..."
        ;;
esac