#!/bin/bash
# Correlation ID Header Verification Script
# Verifies all billing endpoints emit X-Correlation-ID headers

echo "🔍 Verifying X-Correlation-ID headers on all billing endpoints..."
echo ""

BASE_URL="http://localhost:5000"
CUSTOM_CORRELATION_ID="test-correlation-$(date +%s)"

# Test endpoints array
declare -a endpoints=(
    "GET /api/billing/summary"
    "GET /api/billing/ledger"
    "GET /api/billing/usage"
    "POST /api/billing/estimate"
    "POST /api/billing/create-checkout"
    "POST /api/billing/stripe-webhook"
)

echo "📊 Testing correlation ID header consistency..."
echo "Custom correlation ID: $CUSTOM_CORRELATION_ID"
echo ""

# Function to test endpoint
test_endpoint() {
    local method=$1
    local path=$2
    local data=$3
    
    echo "Testing: $method $path"
    
    if [[ "$method" == "GET" ]]; then
        response=$(curl -s -I "$BASE_URL$path" \
            -H "X-Correlation-ID: $CUSTOM_CORRELATION_ID" \
            2>/dev/null)
    else
        response=$(curl -s -I "$BASE_URL$path" \
            -X "$method" \
            -H "X-Correlation-ID: $CUSTOM_CORRELATION_ID" \
            -H "Content-Type: application/json" \
            -d "$data" \
            2>/dev/null)
    fi
    
    # Extract correlation ID from response headers
    correlation_header=$(echo "$response" | grep -i "x-correlation-id" | tr -d '\r')
    
    if [[ -n "$correlation_header" ]]; then
        echo "  ✅ Header found: $correlation_header"
        
        # Check if custom correlation ID is preserved
        if echo "$correlation_header" | grep -q "$CUSTOM_CORRELATION_ID"; then
            echo "  ✅ Custom correlation ID preserved"
        else
            echo "  ⚠️  Custom correlation ID not preserved (security validation triggered)"
        fi
    else
        echo "  ❌ No X-Correlation-ID header found"
    fi
    echo ""
}

# Test all endpoints
test_endpoint "GET" "/api/billing/summary"
test_endpoint "GET" "/api/billing/ledger"
test_endpoint "GET" "/api/billing/usage"
test_endpoint "POST" "/api/billing/estimate" '{"model":"gpt-4o","inputTokens":100,"outputTokens":50}'
test_endpoint "POST" "/api/billing/create-checkout" '{"packageCode":"starter"}'
test_endpoint "POST" "/api/billing/stripe-webhook" '{"type":"test.event"}'

echo "🔒 Testing security validation..."
echo ""

# Test malicious correlation IDs
declare -a malicious_ids=(
    '<script>alert("xss")</script>'
    '$(rm -rf /)'
    '../../etc/passwd'
    'a$(echo hack)a'
    "$(printf 'a%.0s' {1..200})"  # 200 char string
)

for malicious_id in "${malicious_ids[@]}"; do
    echo "Testing malicious ID: ${malicious_id:0:50}..."
    
    response=$(curl -s -I "$BASE_URL/api/billing/summary" \
        -H "X-Correlation-ID: $malicious_id" \
        2>/dev/null)
    
    correlation_header=$(echo "$response" | grep -i "x-correlation-id" | tr -d '\r')
    
    if [[ -n "$correlation_header" ]]; then
        if echo "$correlation_header" | grep -q "$malicious_id"; then
            echo "  ❌ SECURITY ISSUE: Malicious ID accepted"
        else
            echo "  ✅ Security validation working: ID rejected and replaced"
        fi
    else
        echo "  ❌ No correlation header found"
    fi
done

echo ""
echo "🎯 Verification complete!"
echo ""
echo "Expected behavior:"
echo "✅ All billing endpoints should return X-Correlation-ID header"
echo "✅ Valid correlation IDs should be preserved"
echo "✅ Invalid/malicious correlation IDs should be rejected and replaced"
echo "✅ New UUIDs should be generated when no correlation ID provided"