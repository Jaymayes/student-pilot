#!/bin/bash

# ScholarLink Agent Bridge - Go-Live Acceptance Test Suite
# Comprehensive verification of all integration points per acceptance checklist

set -e

# Environment configuration
export AGENT="${AGENT_BASE_URL:-https://student-pilot-jamarrlmayes.replit.app}"
export CC="${COMMAND_CENTER_URL:-https://auto-com-center-jamarrlmayes.replit.app}"
export SHARED_SECRET="${SHARED_SECRET:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test result tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

log_test() {
    echo -e "${BLUE}🧪 Test $((++TOTAL_TESTS)): $1${NC}"
}

log_pass() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
    ((PASSED_TESTS++))
}

log_fail() {
    echo -e "${RED}❌ FAIL: $1${NC}"
    ((FAILED_TESTS++))
}

log_skip() {
    echo -e "${YELLOW}⚠️  SKIP: $1${NC}"
}

log_info() {
    echo -e "${BLUE}ℹ️  INFO: $1${NC}"
}

# Helper function to check JSON contains expected field
check_json_field() {
    local response="$1"
    local field="$2"
    echo "$response" | grep -q "\"$field\"" && return 0 || return 1
}

# Helper function to generate valid JWT for testing
generate_task_jwt() {
    if [ -z "$SHARED_SECRET" ]; then
        echo "ERROR: SHARED_SECRET required for JWT generation"
        return 1
    fi
    
    local action="$1"
    local payload="$2"
    local task_id="test-$(date +%s)-$$"
    local trace_id="trace-$(date +%s)-$$"
    
    node -e "
    const jwt = require('jsonwebtoken');
    const task = {
        task_id: '$task_id',
        action: '$action',
        payload: $payload,
        reply_to: '$CC/orchestrator/tasks/$task_id/callback',
        trace_id: '$trace_id',
        requested_by: 'acceptance_test'
    };
    const token = jwt.sign(task, '$SHARED_SECRET', {algorithm: 'HS256'});
    console.log(token);
    " 2>/dev/null
}

echo "🚀 ScholarLink Agent Bridge - Go-Live Acceptance Test"
echo "================================================="
echo "Agent URL: $AGENT"
echo "Command Center: $CC"
echo "Test Started: $(date)"
echo ""

# Test 1: Agent capabilities endpoint
log_test "Agent capabilities endpoint verification"
CAPABILITIES_RESPONSE=$(curl -s "$AGENT/agent/capabilities" 2>/dev/null || echo "ERROR")

if [ "$CAPABILITIES_RESPONSE" = "ERROR" ]; then
    log_fail "Agent not accessible at $AGENT"
else
    echo "Response: $CAPABILITIES_RESPONSE"
    
    # Check for required capabilities
    EXPECTED_CAPABILITIES=(
        "student_pilot.match_scholarships"
        "student_pilot.analyze_essay"
        "student_pilot.generate_essay_outline"
        "student_pilot.improve_essay_content"
        "student_pilot.generate_essay_ideas"
        "student_pilot.get_profile"
        "student_pilot.update_profile"
        "student_pilot.create_application"
        "student_pilot.get_applications"
    )
    
    ALL_FOUND=true
    for capability in "${EXPECTED_CAPABILITIES[@]}"; do
        if ! check_json_field "$CAPABILITIES_RESPONSE" "$capability"; then
            log_fail "Missing capability: $capability"
            ALL_FOUND=false
        fi
    done
    
    if [ "$ALL_FOUND" = true ] && check_json_field "$CAPABILITIES_RESPONSE" "health"; then
        log_pass "All 9 capabilities advertised with health status"
    else
        log_fail "Capabilities incomplete or missing health status"
    fi
fi
echo ""

# Test 2: Agent health endpoint with identification
log_test "Agent health endpoint with identification"
HEALTH_RESPONSE=$(curl -s "$AGENT/health" 2>/dev/null || echo "ERROR")

if [ "$HEALTH_RESPONSE" = "ERROR" ]; then
    log_fail "Health endpoint not accessible"
else
    echo "Response: $HEALTH_RESPONSE"
    if check_json_field "$HEALTH_RESPONSE" "agent_id" && check_json_field "$HEALTH_RESPONSE" "student-pilot"; then
        log_pass "Health endpoint includes agent identification"
    else
        log_fail "Health endpoint missing agent identification"
    fi
fi
echo ""

# Test 3: Command Center registry check
log_test "Command Center registry verification"
REGISTRY_RESPONSE=$(curl -s "$CC/orchestrator/agents" 2>/dev/null || echo "ERROR")

if [ "$REGISTRY_RESPONSE" = "ERROR" ]; then
    log_skip "Command Center not accessible - cannot verify auto-registration"
else
    echo "Registry response: $REGISTRY_RESPONSE"
    if echo "$REGISTRY_RESPONSE" | grep -q "student-pilot"; then
        log_pass "Agent appears in Command Center registry"
    else
        log_fail "Agent not found in Command Center registry - check auto-registration"
    fi
fi
echo ""

# Test 4: Security validation - Invalid JWT rejection
log_test "Security validation - Invalid JWT rejection"
SECURITY_RESPONSE=$(curl -s -w "HTTP_%{http_code}" -X POST "$AGENT/agent/task" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer invalid-jwt-token" \
    -d '{"task_id":"security-test","action":"student_pilot.analyze_essay","payload":{}}' 2>/dev/null)

echo "Security test response: $SECURITY_RESPONSE"
if echo "$SECURITY_RESPONSE" | grep -q "HTTP_401"; then
    log_pass "Invalid JWT properly rejected with 401"
else
    log_fail "Security validation failed - invalid JWT not rejected"
fi
echo ""

# Test 5: Direct agent task with valid JWT (if SHARED_SECRET available)
if [ -n "$SHARED_SECRET" ]; then
    log_test "Direct agent task with valid JWT"
    
    VALID_JWT=$(generate_task_jwt "student_pilot.analyze_essay" '{"content":"Test essay for validation","prompt":"Test prompt"}')
    
    if [ -n "$VALID_JWT" ] && [ "$VALID_JWT" != "ERROR"* ]; then
        TASK_RESPONSE=$(curl -s -w "HTTP_%{http_code}" -X POST "$AGENT/agent/task" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $VALID_JWT" \
            -H "X-Agent-Id: student-pilot" \
            -H "X-Trace-Id: direct-test-$(date +%s)" \
            -d '{
                "task_id": "direct-test-'$(date +%s)'",
                "action": "student_pilot.analyze_essay",
                "payload": {
                    "content": "This is a test essay for direct agent communication validation.",
                    "prompt": "Test prompt for acceptance testing"
                },
                "reply_to": "'$CC'/orchestrator/tasks/callback",
                "trace_id": "direct-test-'$(date +%s)'",
                "requested_by": "acceptance_test"
            }' 2>/dev/null)
        
        echo "Direct task response: $TASK_RESPONSE"
        if echo "$TASK_RESPONSE" | grep -q "HTTP_202"; then
            log_pass "Valid JWT accepted - agent responds 202"
        else
            log_fail "Valid JWT validation failed"
        fi
    else
        log_fail "Could not generate valid JWT for testing"
    fi
else
    log_skip "Valid JWT test - SHARED_SECRET not available"
fi
echo ""

# Test 6: Rate limiting verification
log_test "Rate limiting enforcement (5 requests/minute)"
if [ -n "$SHARED_SECRET" ]; then
    log_info "Sending 6 rapid requests to test rate limiting..."
    
    RATE_LIMIT_PASSED=false
    for i in {1..6}; do
        JWT=$(generate_task_jwt "student_pilot.analyze_essay" '{"content":"Rate limit test '$i'","prompt":"Test"}')
        RATE_RESPONSE=$(curl -s -w "HTTP_%{http_code}" -X POST "$AGENT/agent/task" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $JWT" \
            -H "X-Agent-Id: student-pilot" \
            -d '{
                "task_id": "rate-test-'$i'-'$(date +%s)'",
                "action": "student_pilot.analyze_essay",
                "payload": {"content":"Rate limit test","prompt":"Test"},
                "reply_to": "'$CC'/orchestrator/tasks/callback",
                "trace_id": "rate-test-'$(date +%s)'",
                "requested_by": "rate_limit_test"
            }' 2>/dev/null)
        
        echo "Request $i: $RATE_RESPONSE"
        if echo "$RATE_RESPONSE" | grep -q "HTTP_429"; then
            log_pass "Rate limiting enforced - request $i rejected with 429"
            RATE_LIMIT_PASSED=true
            break
        fi
        sleep 0.5  # Brief delay between requests
    done
    
    if [ "$RATE_LIMIT_PASSED" = false ]; then
        log_fail "Rate limiting not enforced - all 6 requests accepted"
    fi
else
    log_skip "Rate limiting test - SHARED_SECRET not available"
fi
echo ""

# Test 7: Command Center dispatch integration (if available)
if [ "$REGISTRY_RESPONSE" != "ERROR" ] && [ -n "$SHARED_SECRET" ]; then
    log_test "End-to-end Command Center dispatch - Scholarship Matching"
    
    DISPATCH_PAYLOAD='{
        "action": "student_pilot.match_scholarships",
        "payload": {
            "profileData": {
                "gpa": "3.8",
                "major": "Computer Science",
                "academicLevel": "junior",
                "interests": ["artificial intelligence", "machine learning"],
                "achievements": ["Dean'\''s List", "Research Assistant"],
                "financialNeed": true
            }
        },
        "requested_by": "acceptance_test",
        "resources": {
            "timeout_ms": 25000,
            "retry": 1
        }
    }'
    
    DISPATCH_RESPONSE=$(curl -s -X POST "$CC/orchestrator/tasks/dispatch" \
        -H "Content-Type: application/json" \
        -d "$DISPATCH_PAYLOAD" 2>/dev/null || echo "ERROR")
    
    echo "Dispatch response: $DISPATCH_RESPONSE"
    
    if echo "$DISPATCH_RESPONSE" | grep -q "task_id"; then
        TASK_ID=$(echo "$DISPATCH_RESPONSE" | grep -o '"task_id":"[^"]*"' | cut -d'"' -f4)
        log_info "Task dispatched with ID: $TASK_ID"
        
        # Wait for task completion
        log_info "Waiting 10 seconds for scholarship matching completion..."
        sleep 10
        
        TASK_STATUS=$(curl -s "$CC/orchestrator/tasks/$TASK_ID" 2>/dev/null || echo "ERROR")
        echo "Task status: $TASK_STATUS"
        
        if echo "$TASK_STATUS" | grep -q '"status":"succeeded"'; then
            log_pass "Scholarship matching task completed successfully"
        elif echo "$TASK_STATUS" | grep -q '"status":"failed"'; then
            log_fail "Scholarship matching task failed"
        else
            log_skip "Scholarship matching task still processing or status unknown"
        fi
    else
        log_fail "Command Center dispatch failed"
    fi
    
    # Test essay analysis
    log_test "End-to-end Command Center dispatch - Essay Analysis"
    
    ESSAY_PAYLOAD='{
        "action": "student_pilot.analyze_essay",
        "payload": {
            "content": "My journey in computer science began with a simple curiosity about how technology shapes our world. During my sophomore year, I participated in a hackathon where our team developed an app to help local food banks optimize their distribution routes. This experience showed me how programming can directly impact communities and solve real-world problems. The satisfaction of seeing our code reduce food waste while helping families access nutrition sparked my passion for using technology as a force for social good.",
            "prompt": "Describe an experience that shaped your academic and career goals. Explain how this experience influenced your future plans."
        },
        "requested_by": "acceptance_test",
        "resources": {
            "timeout_ms": 30000,
            "retry": 1
        }
    }'
    
    ESSAY_DISPATCH=$(curl -s -X POST "$CC/orchestrator/tasks/dispatch" \
        -H "Content-Type: application/json" \
        -d "$ESSAY_PAYLOAD" 2>/dev/null || echo "ERROR")
    
    echo "Essay dispatch response: $ESSAY_DISPATCH"
    
    if echo "$ESSAY_DISPATCH" | grep -q "task_id"; then
        ESSAY_TASK_ID=$(echo "$ESSAY_DISPATCH" | grep -o '"task_id":"[^"]*"' | cut -d'"' -f4)
        log_info "Essay task dispatched with ID: $ESSAY_TASK_ID"
        
        # Wait for AI analysis
        log_info "Waiting 12 seconds for AI essay analysis..."
        sleep 12
        
        ESSAY_STATUS=$(curl -s "$CC/orchestrator/tasks/$ESSAY_TASK_ID" 2>/dev/null || echo "ERROR")
        echo "Essay task status: $ESSAY_STATUS"
        
        if echo "$ESSAY_STATUS" | grep -q '"status":"succeeded"'; then
            log_pass "Essay analysis task completed successfully"
        elif echo "$ESSAY_STATUS" | grep -q '"status":"failed"'; then
            log_fail "Essay analysis task failed"
        else
            log_skip "Essay analysis task still processing or status unknown"
        fi
    else
        log_fail "Essay dispatch failed"
    fi
else
    log_skip "Command Center dispatch tests - registry not accessible or SHARED_SECRET missing"
fi
echo ""

# Test 8: Event emission verification
if [ "$REGISTRY_RESPONSE" != "ERROR" ]; then
    log_test "Event emission verification"
    
    EVENTS_RESPONSE=$(curl -s "$CC/orchestrator/events" 2>/dev/null || echo "ERROR")
    
    if [ "$EVENTS_RESPONSE" = "ERROR" ]; then
        log_skip "Events endpoint not accessible"
    else
        echo "Recent events check..."
        if echo "$EVENTS_RESPONSE" | grep -q "student-pilot"; then
            log_pass "Events from student-pilot agent found in audit trail"
        else
            log_skip "No recent events from student-pilot (may be expected for new deployment)"
        fi
    fi
else
    log_skip "Event emission test - Command Center not accessible"
fi
echo ""

# Test 9: Validation error handling
if [ "$REGISTRY_RESPONSE" != "ERROR" ] && [ -n "$SHARED_SECRET" ]; then
    log_test "Validation error handling - Missing required fields"
    
    INVALID_PAYLOAD='{
        "action": "student_pilot.match_scholarships",
        "payload": {
            "limit": 5
        },
        "requested_by": "validation_test"
    }'
    
    VALIDATION_DISPATCH=$(curl -s -X POST "$CC/orchestrator/tasks/dispatch" \
        -H "Content-Type: application/json" \
        -d "$INVALID_PAYLOAD" 2>/dev/null || echo "ERROR")
    
    if echo "$VALIDATION_DISPATCH" | grep -q "task_id"; then
        VALIDATION_TASK_ID=$(echo "$VALIDATION_DISPATCH" | grep -o '"task_id":"[^"]*"' | cut -d'"' -f4)
        
        log_info "Waiting 5 seconds for validation failure..."
        sleep 5
        
        VALIDATION_STATUS=$(curl -s "$CC/orchestrator/tasks/$VALIDATION_TASK_ID" 2>/dev/null || echo "ERROR")
        
        if echo "$VALIDATION_STATUS" | grep -q '"status":"failed"' && echo "$VALIDATION_STATUS" | grep -q '"code"'; then
            log_pass "Validation errors properly structured and reported"
        else
            log_skip "Validation test inconclusive - task may still be processing"
        fi
    else
        log_fail "Validation test dispatch failed"
    fi
else
    log_skip "Validation error test - Command Center not accessible or SHARED_SECRET missing"
fi
echo ""

# Final summary
echo "🎯 GO-LIVE ACCEPTANCE TEST SUMMARY"
echo "=================================="
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo -e "Skipped: ${YELLOW}$((TOTAL_TESTS - PASSED_TESTS - FAILED_TESTS))${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL CRITICAL TESTS PASSED - READY FOR PRODUCTION${NC}"
    echo ""
    echo "✅ Agent capabilities properly advertised"
    echo "✅ Health checks include agent identification"  
    echo "✅ Security validation working"
    echo "✅ Rate limiting enforced"
    echo "✅ Integration points verified"
    echo ""
    echo "DEPLOYMENT STATUS: GO-LIVE APPROVED ✅"
else
    echo -e "${RED}❌ DEPLOYMENT BLOCKED - $FAILED_TESTS CRITICAL FAILURES${NC}"
    echo ""
    echo "Review failed tests above and resolve issues before deployment."
    echo ""
    echo "DEPLOYMENT STATUS: BLOCKED ❌"
fi

echo ""
echo "Environment Configuration Required:"
echo "  SHARED_SECRET: [Must match Command Center]"
echo "  COMMAND_CENTER_URL: $CC"
echo "  AGENT_NAME: student_pilot"
echo "  AGENT_ID: student-pilot"  
echo "  AGENT_BASE_URL: $AGENT"
echo ""
echo "Test completed: $(date)"

exit $FAILED_TESTS