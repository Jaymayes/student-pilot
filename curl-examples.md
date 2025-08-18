# ScholarLink Agent Bridge - curl Examples

## Prerequisites
Set up environment variables for testing:
```bash
export SCHOLARLINK_URL="https://your-app.replit.app"
export COMMAND_CENTER_URL="https://auto-com-center-jamarrlmayes.replit.app"
export SHARED_SECRET="your-shared-secret"
```

## Health Check
```bash
# Check agent health
curl $SCHOLARLINK_URL/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-01-18T22:51:23.456Z",
  "agent_id": "student-pilot",
  "last_seen": "2025-01-18T22:51:23.456Z",
  "version": "1.0.0",
  "capabilities": [...]
}
```

## Agent Capabilities
```bash
# Get agent capabilities
curl $SCHOLARLINK_URL/agent/capabilities

# Expected response:
{
  "agent_id": "student-pilot",
  "name": "student_pilot",
  "capabilities": [
    "student_pilot.match_scholarships",
    "student_pilot.analyze_essay",
    "student_pilot.generate_essay_outline",
    "student_pilot.improve_essay_content",
    "student_pilot.generate_essay_ideas",
    "student_pilot.get_profile",
    "student_pilot.update_profile",
    "student_pilot.create_application",
    "student_pilot.get_applications"
  ],
  "version": "1.0.0",
  "health": "ok"
}
```

## Command Center Integration (requires SHARED_SECRET)

### 1. Register Agent with Command Center
```bash
# Generate JWT token (replace with actual SHARED_SECRET)
JWT_TOKEN=$(node -e "
const jwt = require('jsonwebtoken');
const payload = {
  agent_id: 'student-pilot',
  name: 'student_pilot',
  base_url: '$SCHOLARLINK_URL',
  capabilities: ['student_pilot.match_scholarships', 'student_pilot.analyze_essay'],
  timestamp: new Date().toISOString()
};
const token = jwt.sign(payload, '$SHARED_SECRET', {algorithm: 'HS256', issuer: 'student-pilot', audience: 'auto-com-center'});
console.log(token);
")

# Register with Command Center
curl -X POST $COMMAND_CENTER_URL/orchestrator/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "X-Agent-Id: student-pilot" \
  -d '{
    "agent_id": "student-pilot",
    "name": "student_pilot",
    "base_url": "'$SCHOLARLINK_URL'",
    "capabilities": [
      "student_pilot.match_scholarships",
      "student_pilot.analyze_essay"
    ],
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
  }'
```

### 2. Dispatch Tasks via Command Center

#### Essay Analysis Task
```bash
curl -X POST $COMMAND_CENTER_URL/orchestrator/tasks/dispatch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "action": "student_pilot.analyze_essay",
    "payload": {
      "content": "My passion for environmental science began when I witnessed the devastating effects of pollution in my hometown. The once-clear river that ran through our community had become murky and lifeless, a stark reminder of humanity'\''s impact on nature. This experience sparked my determination to pursue a career in environmental conservation and sustainable technology development.",
      "prompt": "Describe a personal experience that influenced your career goals and explain how it shaped your academic interests."
    },
    "requested_by": "test_user"
  }'

# Response will include task_id for tracking:
{
  "task_id": "uuid-here",
  "status": "dispatched", 
  "agent_id": "student-pilot"
}
```

#### Scholarship Matching Task
```bash
curl -X POST $COMMAND_CENTER_URL/orchestrator/tasks/dispatch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "action": "student_pilot.match_scholarships",
    "payload": {
      "profileData": {
        "gpa": "3.85",
        "major": "Environmental Science",
        "academicLevel": "junior",
        "graduationYear": 2026,
        "school": "University of California",
        "location": "California, USA",
        "interests": ["climate change", "renewable energy", "sustainability"],
        "extracurriculars": ["Environmental Club President", "Research Assistant"],
        "achievements": ["Dean'\''s List", "Outstanding Student Award"],
        "financialNeed": true
      }
    },
    "requested_by": "test_user"
  }'
```

#### Essay Outline Generation Task
```bash
curl -X POST $COMMAND_CENTER_URL/orchestrator/tasks/dispatch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "action": "student_pilot.generate_essay_outline",
    "payload": {
      "prompt": "Describe a leadership experience where you had to overcome significant challenges and explain what you learned about yourself and leadership.",
      "essayType": "leadership"
    },
    "requested_by": "test_user"
  }'
```

### 3. Check Task Status
```bash
# Replace TASK_ID with actual task ID from dispatch response
TASK_ID="uuid-from-dispatch"
curl $COMMAND_CENTER_URL/orchestrator/tasks/$TASK_ID

# Response shows current status and results:
{
  "task_id": "uuid-here",
  "status": "succeeded",
  "result": {
    "overallScore": 8,
    "strengths": ["Strong personal connection", "Clear narrative structure"],
    "improvements": ["Add more specific examples", "Strengthen conclusion"],
    "suggestions": "Consider expanding on how this experience specifically influenced your choice of environmental science...",
    "wordCount": 127
  },
  "completed_at": "2025-01-18T22:55:00.000Z"
}
```

### 4. View Events
```bash
# Get recent events
curl "$COMMAND_CENTER_URL/orchestrator/events?since=$(date -d '1 hour ago' -u +%Y-%m-%dT%H:%M:%S.%3NZ)"

# Response shows event log:
{
  "events": [
    {
      "event_id": "task-completed-uuid",
      "type": "task_completed",
      "source": "student-pilot",
      "data": {
        "task_id": "uuid-here",
        "action": "student_pilot.analyze_essay",
        "duration_ms": 3247,
        "status": "succeeded"
      },
      "time": "2025-01-18T22:55:00.000Z",
      "trace_id": "trace-uuid"
    }
  ]
}
```

## Direct Agent Testing (without Command Center)

### Test Agent Task Endpoint Directly
```bash
# Generate task JWT
TASK_JWT=$(node -e "
const jwt = require('jsonwebtoken');
const task = {
  task_id: 'test-' + Date.now(),
  action: 'student_pilot.analyze_essay',
  payload: {
    content: 'This is a test essay for analysis...',
    prompt: 'Describe your career goals.'
  },
  reply_to: '$COMMAND_CENTER_URL/orchestrator/tasks/callback',
  trace_id: 'trace-' + Date.now(),
  requested_by: 'test'
};
const token = jwt.sign(task, '$SHARED_SECRET', {algorithm: 'HS256'});
console.log(token);
")

# Send task directly to agent
curl -X POST $SCHOLARLINK_URL/agent/task \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TASK_JWT" \
  -H "X-Agent-Id: student-pilot" \
  -H "X-Trace-Id: trace-$(date +%s)" \
  -d '{
    "task_id": "test-'$(date +%s)'",
    "action": "student_pilot.analyze_essay",
    "payload": {
      "content": "This is a test essay for analysis purposes. It discusses career goals in environmental science and the importance of sustainability in modern society.",
      "prompt": "Describe your long-term career goals and how they align with your academic studies."
    },
    "reply_to": "'$COMMAND_CENTER_URL'/orchestrator/tasks/callback",
    "trace_id": "trace-'$(date +%s)'",
    "requested_by": "direct_test"
  }'

# Response: HTTP 202 Accepted
{
  "status": "accepted",
  "task_id": "test-123456789"
}
```

## Error Examples

### Invalid JWT
```bash
curl -X POST $SCHOLARLINK_URL/agent/task \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid-token" \
  -d '{"task_id":"test","action":"test"}'

# Response: HTTP 401
{
  "error": "Invalid token"
}
```

### Missing Required Fields
```bash
curl -X POST $SCHOLARLINK_URL/agent/task \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TASK_JWT" \
  -d '{"action":"student_pilot.analyze_essay"}'

# Response: HTTP 400
{
  "error": "Invalid task structure"
}
```

### Rate Limiting
```bash
# Make 6+ requests quickly to trigger rate limit
for i in {1..6}; do
  curl -X POST $SCHOLARLINK_URL/agent/task \
    -H "Authorization: Bearer $TASK_JWT" \
    -d '{"task_id":"rate-test-'$i'","action":"student_pilot.analyze_essay","trace_id":"trace","payload":{}}' &
done
wait

# One request will return: HTTP 429
{
  "error": "Too many agent requests"
}
```

## Testing Complete Workflow

### End-to-End Test Script
```bash
#!/bin/bash

# 1. Check agent health
echo "1. Checking agent health..."
curl -s $SCHOLARLINK_URL/health | head -5

# 2. Get capabilities  
echo -e "\n2. Getting capabilities..."
curl -s $SCHOLARLINK_URL/agent/capabilities

# 3. Dispatch essay analysis via Command Center
echo -e "\n3. Dispatching essay analysis task..."
TASK_RESPONSE=$(curl -s -X POST $COMMAND_CENTER_URL/orchestrator/tasks/dispatch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "action": "student_pilot.analyze_essay",
    "payload": {
      "content": "My journey in computer science began with curiosity about how technology can solve real-world problems...",
      "prompt": "Explain your passion for your chosen field of study."
    },
    "requested_by": "workflow_test"
  }')

TASK_ID=$(echo $TASK_RESPONSE | grep -o '"task_id":"[^"]*"' | cut -d'"' -f4)
echo "Task ID: $TASK_ID"

# 4. Wait and check task result
echo -e "\n4. Waiting 10 seconds for task completion..."
sleep 10

echo "Checking task result..."
curl -s $COMMAND_CENTER_URL/orchestrator/tasks/$TASK_ID

# 5. Check events
echo -e "\n5. Checking recent events..."
curl -s "$COMMAND_CENTER_URL/orchestrator/events?since=$(date -d '1 minute ago' -u +%Y-%m-%dT%H:%M:%S.%3NZ)"
```

This completes the integration testing examples for the ScholarLink Agent Bridge system.