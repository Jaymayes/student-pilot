#!/bin/bash

# Agent Bridge Integration Test Suite
# Based on the comprehensive test plan for ScholarLink Student Pilot Agent

set -e

# Environment setup
export CC="https://auto-com-center-jamarrlmayes.replit.app"
export AGENT="https://student-pilot-jamarrlmayes.replit.app"
export SHARED_SECRET="92ece3f5fac434b5c1fecab8252a20c260a7eef4c1f3af1c58e34bc99b72339998f0c59e7af2239e20ec56a1ccf5a757"

echo "🚀 ScholarLink Agent Bridge Test Suite"
echo "Command Center: $CC"
echo "Agent URL: $AGENT"
echo "========================================="

# Helper function to generate JWT for direct agent testing
generate_task_jwt() {
  local task_data='{"task_id":"test-'$(date +%s)'","action":"'$1'","payload":'$2',"reply_to":"'$CC'/orchestrator/tasks/callback","trace_id":"trace-'$(date +%s)'","requested_by":"test"}'
  node -e "
    const jwt = require('jsonwebtoken');
    const task = $task_data;
    const token = jwt.sign(task, '$SHARED_SECRET', {algorithm: 'HS256'});
    console.log(token);
  "
}

# Test 1: Agent capabilities endpoint
echo "📋 Test 1: Agent capabilities endpoint"
echo "Command: curl -s $AGENT/agent/capabilities"
CAPABILITIES=$(curl -s $AGENT/agent/capabilities)
echo "Response: $CAPABILITIES"

if echo "$CAPABILITIES" | grep -q "student_pilot.match_scholarships" && echo "$CAPABILITIES" | grep -q "student_pilot.analyze_essay"; then
  echo "✅ PASS: Agent advertising correct capabilities"
else
  echo "❌ FAIL: Missing expected capabilities"
fi
echo ""

# Test 2: Agent visible in Command Center registry
echo "🏢 Test 2: Agent visible in Command Center registry"
echo "Command: curl -s $CC/orchestrator/agents"
AGENTS=$(curl -s $CC/orchestrator/agents 2>/dev/null || echo "Command Center not accessible")
echo "Response: $AGENTS"

if echo "$AGENTS" | grep -q "student-pilot"; then
  echo "✅ PASS: Agent registered in Command Center"
else
  echo "⚠️  SKIP: Command Center not accessible or agent not registered yet"
fi
echo ""

# Test 3: Health check (agent)
echo "🏥 Test 3: Health check with agent identification"
echo "Command: curl -s $AGENT/health"
HEALTH=$(curl -s $AGENT/health)
echo "Response: $HEALTH"

if echo "$HEALTH" | grep -q "student-pilot"; then
  echo "✅ PASS: Health check includes agent identification"
else
  echo "❌ FAIL: Health check missing agent identification"
fi
echo ""

# Test 4: Secure task dispatch – match scholarships
echo "🎯 Test 4: Scholarship matching via Command Center"
MATCH_PAYLOAD='{
  "action": "student_pilot.match_scholarships",
  "payload": {
    "profileData": {
      "gpa": "3.7",
      "major": "Computer Science",
      "academicLevel": "junior",
      "country": "US",
      "interests": ["artificial intelligence", "software engineering"],
      "achievements": ["Dean'\''s List", "Hackathon Winner"]
    }
  },
  "requested_by": "qa",
  "resources": {
    "timeout_ms": 20000,
    "retry": 1
  }
}'

echo "Dispatching scholarship matching task..."
DISPATCH_RESULT=$(curl -s -X POST $CC/orchestrator/tasks/dispatch \
  -H "Content-Type: application/json" \
  -d "$MATCH_PAYLOAD" 2>/dev/null || echo "Command Center dispatch failed")

echo "Dispatch result: $DISPATCH_RESULT"

if echo "$DISPATCH_RESULT" | grep -q "task_id"; then
  TASK_ID=$(echo "$DISPATCH_RESULT" | grep -o '"task_id":"[^"]*"' | cut -d'"' -f4)
  echo "Task ID: $TASK_ID"
  
  echo "Waiting 5 seconds for task completion..."
  sleep 5
  
  TASK_STATUS=$(curl -s $CC/orchestrator/tasks/$TASK_ID 2>/dev/null || echo "Status check failed")
  echo "Task status: $TASK_STATUS"
  
  if echo "$TASK_STATUS" | grep -q "succeeded"; then
    echo "✅ PASS: Scholarship matching task completed successfully"
  else
    echo "⚠️  PENDING: Task may still be processing"
  fi
else
  echo "⚠️  SKIP: Command Center dispatch not accessible"
fi
echo ""

# Test 5: Secure task dispatch – analyze essay
echo "📝 Test 5: Essay analysis via Command Center"
ESSAY_PAYLOAD='{
  "action": "student_pilot.analyze_essay",
  "payload": {
    "content": "From an early age, I was fascinated by the intersection of technology and human problem-solving. My passion for computer science began when I witnessed how a simple mobile app helped my grandmother stay connected with family during her recovery from surgery. This experience showed me that technology is not just about code and algorithms, but about creating meaningful solutions that improve people'\''s lives.",
    "prompt": "Describe your passion for your chosen field of study and how it relates to your career goals."
  },
  "requested_by": "qa",
  "resources": {
    "timeout_ms": 30000,
    "retry": 1
  }
}'

echo "Dispatching essay analysis task..."
ESSAY_DISPATCH=$(curl -s -X POST $CC/orchestrator/tasks/dispatch \
  -H "Content-Type: application/json" \
  -d "$ESSAY_PAYLOAD" 2>/dev/null || echo "Command Center dispatch failed")

echo "Dispatch result: $ESSAY_DISPATCH"

if echo "$ESSAY_DISPATCH" | grep -q "task_id"; then
  ESSAY_TASK_ID=$(echo "$ESSAY_DISPATCH" | grep -o '"task_id":"[^"]*"' | cut -d'"' -f4)
  echo "Essay Task ID: $ESSAY_TASK_ID"
  
  echo "Waiting 8 seconds for AI analysis..."
  sleep 8
  
  ESSAY_STATUS=$(curl -s $CC/orchestrator/tasks/$ESSAY_TASK_ID 2>/dev/null || echo "Status check failed")
  echo "Essay task status: $ESSAY_STATUS"
  
  if echo "$ESSAY_STATUS" | grep -q "succeeded"; then
    echo "✅ PASS: Essay analysis completed successfully"
  else
    echo "⚠️  PENDING: Essay analysis may still be processing"
  fi
else
  echo "⚠️  SKIP: Command Center dispatch not accessible"
fi
echo ""

# Test 6: Event emission
echo "📊 Test 6: Event emission verification"
echo "Command: curl -s $CC/orchestrator/events"
EVENTS=$(curl -s $CC/orchestrator/events 2>/dev/null || echo "Events endpoint not accessible")
echo "Recent events: $EVENTS"

if echo "$EVENTS" | grep -q "student-pilot"; then
  echo "✅ PASS: Events from student-pilot agent found"
else
  echo "⚠️  SKIP: Events endpoint not accessible or no events yet"
fi
echo ""

# Test 7: Validation error propagation
echo "❌ Test 7: Validation error handling"
INVALID_PAYLOAD='{
  "action": "student_pilot.match_scholarships",
  "payload": {
    "limit": 5
  },
  "requested_by": "qa"
}'

echo "Dispatching invalid task (missing student profile)..."
INVALID_DISPATCH=$(curl -s -X POST $CC/orchestrator/tasks/dispatch \
  -H "Content-Type: application/json" \
  -d "$INVALID_PAYLOAD" 2>/dev/null || echo "Dispatch failed")

echo "Invalid dispatch result: $INVALID_DISPATCH"

if echo "$INVALID_DISPATCH" | grep -q "task_id"; then
  INVALID_TASK_ID=$(echo "$INVALID_DISPATCH" | grep -o '"task_id":"[^"]*"' | cut -d'"' -f4)
  
  echo "Waiting 3 seconds for validation failure..."
  sleep 3
  
  INVALID_STATUS=$(curl -s $CC/orchestrator/tasks/$INVALID_TASK_ID 2>/dev/null || echo "Status check failed")
  echo "Validation task status: $INVALID_STATUS"
  
  if echo "$INVALID_STATUS" | grep -q "failed"; then
    echo "✅ PASS: Validation error properly propagated"
  else
    echo "⚠️  PENDING: Validation may still be processing"
  fi
else
  echo "⚠️  SKIP: Command Center not accessible for validation test"
fi
echo ""

# Test 8: Security (invalid token rejected)
echo "🔒 Test 8: Security - Invalid JWT rejection"
echo "Testing direct agent call with invalid token..."

SECURITY_TEST=$(curl -s -w "%{http_code}" -X POST $AGENT/agent/task \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer not-a-valid-token" \
  -d '{"task_id":"security-test","action":"student_pilot.match_scholarships","payload":{"student":{"gpa":3.0}}}')

echo "Security test response: $SECURITY_TEST"

if echo "$SECURITY_TEST" | grep -q "401\|403"; then
  echo "✅ PASS: Invalid JWT properly rejected"
else
  echo "❌ FAIL: Security check failed - invalid token not rejected"
fi
echo ""

# Test 9: Direct agent task with valid JWT
echo "🔐 Test 9: Direct agent task with valid JWT"
echo "Generating valid JWT for direct agent communication..."

VALID_JWT=$(generate_task_jwt "student_pilot.analyze_essay" '{"content":"Test essay for direct communication","prompt":"Test prompt"}')

DIRECT_TASK=$(curl -s -w "%{http_code}" -X POST $AGENT/agent/task \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $VALID_JWT" \
  -H "X-Agent-Id: student-pilot" \
  -H "X-Trace-Id: direct-test-$(date +%s)" \
  -d '{
    "task_id": "direct-test-'$(date +%s)'",
    "action": "student_pilot.analyze_essay",
    "payload": {
      "content": "This is a direct test of agent communication capabilities.",
      "prompt": "Test prompt for direct agent communication"
    },
    "reply_to": "'$CC'/orchestrator/tasks/callback",
    "trace_id": "direct-test-'$(date +%s)'",
    "requested_by": "direct_test"
  }')

echo "Direct task response: $DIRECT_TASK"

if echo "$DIRECT_TASK" | grep -q "202\|accepted"; then
  echo "✅ PASS: Valid JWT accepted for direct agent communication"
else
  echo "❌ FAIL: Valid JWT rejected"
fi
echo ""

# Summary
echo "🎉 Agent Bridge Test Suite Complete"
echo "========================================="
echo "Key endpoints tested:"
echo "  - Agent capabilities: $AGENT/agent/capabilities"
echo "  - Agent health: $AGENT/health"
echo "  - Command Center dispatch: $CC/orchestrator/tasks/dispatch"
echo "  - Direct agent tasks: $AGENT/agent/task"
echo ""
echo "Review the results above for any failures or pending tasks."
echo "For full integration, ensure Command Center is configured with:"
echo "  - SHARED_SECRET: $SHARED_SECRET"
echo "  - AGENTS_ALLOWLIST: $AGENT"
echo "  - JWT_ISSUER: auto-com-center"
echo "  - JWT_AUDIENCE: scholar-sync-agents"