# ScholarLink Agent Bridge - cURL Examples

This document provides comprehensive cURL examples for testing and integrating with the ScholarLink Agent Bridge.

## Environment Setup

```bash
# Set environment variables
export AGENT="https://student-pilot-jamarrlmayes.replit.app"
export CC="https://auto-com-center-jamarrlmayes.replit.app"
export SHARED_SECRET="your-shared-secret-here"
```

## Basic Agent Endpoints

### 1. Health Check
```bash
curl -s "$AGENT/health"
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-08-19T00:16:09.721Z",
  "agent_id": "student-pilot",
  "last_seen": "2025-08-19T00:16:09.721Z",
  "version": "1.0.0",
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
  ]
}
```

### 2. Agent Capabilities
```bash
curl -s "$AGENT/agent/capabilities"
```

**Expected Response:**
```json
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

## Command Center Integration

### 3. Check Agent Registry
```bash
curl -s "$CC/orchestrator/agents"
```

**Expected Response:**
```json
[
  {
    "agent_id": "student-pilot",
    "name": "student_pilot",
    "base_url": "https://student-pilot-jamarrlmayes.replit.app",
    "capabilities": [
      "student_pilot.match_scholarships",
      "student_pilot.analyze_essay",
      // ... more capabilities
    ],
    "status": "online",
    "last_heartbeat": "2025-08-19T00:16:09.721Z",
    "version": "1.0.0"
  }
]
```

### 4. Dispatch Scholarship Matching Task
```bash
curl -X POST "$CC/orchestrator/tasks/dispatch" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "student_pilot.match_scholarships",
    "payload": {
      "profileData": {
        "gpa": "3.8",
        "major": "Computer Science",
        "academicLevel": "junior",
        "interests": ["artificial intelligence", "machine learning", "software engineering"],
        "achievements": ["Dean'\''s List", "Research Assistant", "Hackathon Winner"],
        "financialNeed": true,
        "ethnicity": "Asian American",
        "state": "California"
      }
    },
    "requested_by": "student_dashboard",
    "resources": {
      "timeout_ms": 20000,
      "retry": 1
    }
  }'
```

**Expected Response:**
```json
{
  "task_id": "task-abc123-def456",
  "status": "accepted",
  "agent_id": "student-pilot",
  "action": "student_pilot.match_scholarships",
  "created_at": "2025-08-19T00:16:09.721Z",
  "trace_id": "trace-abc123-def456"
}
```

### 5. Check Task Status
```bash
curl -s "$CC/orchestrator/tasks/task-abc123-def456"
```

**Expected Response (Completed):**
```json
{
  "task_id": "task-abc123-def456",
  "status": "succeeded",
  "agent_id": "student-pilot",
  "action": "student_pilot.match_scholarships",
  "result": {
    "matches": [
      {
        "scholarshipId": "scholarship-uuid-1",
        "scholarship": {
          "title": "STEM Excellence Scholarship",
          "organization": "Tech Foundation",
          "amount": "$5000",
          "deadline": "2024-03-15",
          "description": "For outstanding students in STEM fields"
        },
        "matchScore": 95,
        "matchReason": "Excellent GPA (3.8) and strong alignment with CS major, AI interests, and research experience",
        "chanceLevel": "high",
        "requirements": ["3.5+ GPA", "STEM major", "Research experience"]
      },
      {
        "scholarshipId": "scholarship-uuid-2",
        "scholarship": {
          "title": "Diversity in Tech Scholarship",
          "organization": "Inclusive Tech Initiative",
          "amount": "$3000",
          "deadline": "2024-04-01",
          "description": "Supporting underrepresented students in technology"
        },
        "matchScore": 88,
        "matchReason": "Strong academic performance, CS major, and demographic alignment",
        "chanceLevel": "high",
        "requirements": ["Underrepresented in tech", "3.0+ GPA", "CS/Engineering major"]
      }
    ],
    "totalMatches": 5,
    "profileId": "profile-uuid-123",
    "searchCriteria": {
      "gpa": "3.8",
      "major": "Computer Science",
      "academicLevel": "junior"
    }
  },
  "created_at": "2025-08-19T00:16:09.721Z",
  "completed_at": "2025-08-19T00:16:15.321Z",
  "execution_time_ms": 5600,
  "trace_id": "trace-abc123-def456"
}
```

### 6. Dispatch Essay Analysis Task
```bash
curl -X POST "$CC/orchestrator/tasks/dispatch" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "student_pilot.analyze_essay",
    "payload": {
      "content": "My journey in computer science began with a simple curiosity about how technology shapes our world. During my sophomore year, I participated in a hackathon where our team developed an app to help local food banks optimize their distribution routes. This experience showed me how programming can directly impact communities and solve real-world problems. The satisfaction of seeing our code reduce food waste while helping families access nutrition sparked my passion for using technology as a force for social good. Now, as I pursue my degree, I focus on artificial intelligence and machine learning, areas where I believe we can create the most significant positive impact. This scholarship would enable me to continue my research in AI ethics and responsible technology development, helping me work toward a future where technology serves all of humanity equitably.",
      "prompt": "Describe an experience that shaped your academic and career goals. Explain how this experience influenced your future plans and how this scholarship will help you achieve them. (500 words maximum)"
    },
    "requested_by": "essay_assistant",
    "resources": {
      "timeout_ms": 30000,
      "retry": 1
    }
  }'
```

**Expected Response:**
```json
{
  "task_id": "task-essay-789",
  "status": "accepted",
  "agent_id": "student-pilot",
  "action": "student_pilot.analyze_essay",
  "created_at": "2025-08-19T00:16:20.123Z",
  "trace_id": "trace-essay-789"
}
```

**Expected Result (when task completes):**
```json
{
  "task_id": "task-essay-789",
  "status": "succeeded",
  "result": {
    "overallScore": 8,
    "maxScore": 10,
    "strengths": [
      "Strong personal narrative with specific example (hackathon experience)",
      "Clear connection between experience and career goals",
      "Demonstrates social impact awareness and ethical considerations",
      "Good progression from personal experience to academic focus"
    ],
    "improvements": [
      "Add more specific details about the app development process",
      "Expand on how the scholarship specifically enables AI ethics research",
      "Consider strengthening the conclusion with concrete future goals",
      "Include more technical depth about AI/ML interests"
    ],
    "suggestions": "Consider expanding on the technical aspects of your hackathon project and how it introduced you to specific programming concepts. You could also provide more concrete examples of how you plan to use AI for social good, perhaps mentioning specific research areas or methodologies you want to explore.",
    "wordCount": 156,
    "estimatedReadingTime": 1,
    "prompt": "Describe an experience that shaped your academic and career goals...",
    "analysis": {
      "clarity": 8,
      "engagement": 9,
      "structure": 7,
      "relevance": 9,
      "authenticity": 8
    }
  },
  "execution_time_ms": 8500,
  "completed_at": "2025-08-19T00:16:28.623Z"
}
```

## Direct Agent Communication (Advanced)

### 7. Direct Task with Valid JWT
First, generate a valid JWT token:

```bash
# Generate JWT using Node.js (requires jsonwebtoken package)
TASK_JWT=$(node -e "
const jwt = require('jsonwebtoken');
const task = {
  task_id: 'direct-test-$(date +%s)',
  action: 'student_pilot.analyze_essay',
  payload: {
    content: 'Test essay for direct communication validation.',
    prompt: 'Test prompt for direct agent communication'
  },
  reply_to: '$CC/orchestrator/tasks/callback',
  trace_id: 'direct-test-$(date +%s)',
  requested_by: 'direct_test'
};
const token = jwt.sign(task, '$SHARED_SECRET', {algorithm: 'HS256'});
console.log(token);
")

# Use the JWT for direct agent communication
curl -X POST "$AGENT/agent/task" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TASK_JWT" \
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
  }'
```

**Expected Response:**
```json
{
  "status": "accepted",
  "task_id": "direct-test-1692403200",
  "message": "Task accepted and processing"
}
```

## Event Monitoring

### 8. Check Recent Events
```bash
curl -s "$CC/orchestrator/events"
```

**Expected Response:**
```json
[
  {
    "event_id": "event-123",
    "event_type": "task_completed",
    "agent_id": "student-pilot",
    "task_id": "task-abc123-def456",
    "trace_id": "trace-abc123-def456",
    "timestamp": "2025-08-19T00:16:15.321Z",
    "data": {
      "action": "student_pilot.match_scholarships",
      "execution_time_ms": 5600,
      "success": true
    }
  },
  {
    "event_id": "event-124",
    "event_type": "scholarships_matched",
    "agent_id": "student-pilot",
    "task_id": "task-abc123-def456",
    "trace_id": "trace-abc123-def456",
    "timestamp": "2025-08-19T00:16:15.321Z",
    "data": {
      "matches_found": 5,
      "high_confidence_matches": 2,
      "profile_id": "profile-uuid-123"
    }
  }
]
```

### 9. Filter Events by Agent
```bash
curl -s "$CC/orchestrator/events?agent_id=student-pilot"
```

### 10. Filter Events by Time Range
```bash
# Events from the last hour
SINCE=$(date -d '1 hour ago' -u +%Y-%m-%dT%H:%M:%S.%3NZ)
curl -s "$CC/orchestrator/events?since=$SINCE"
```

## Error Testing

### 11. Test Invalid JWT (Security Validation)
```bash
curl -X POST "$AGENT/agent/task" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid-jwt-token" \
  -d '{
    "task_id": "security-test",
    "action": "student_pilot.analyze_essay",
    "payload": {}
  }'
```

**Expected Response (401):**
```json
{
  "error": "Invalid token"
}
```

### 12. Test Missing Required Fields (Validation)
```bash
curl -X POST "$CC/orchestrator/tasks/dispatch" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "student_pilot.match_scholarships",
    "payload": {
      "limit": 5
    },
    "requested_by": "validation_test"
  }'
```

**Expected Response (Task will fail with validation error):**
```json
{
  "task_id": "task-validation-123",
  "status": "accepted"
}
```

**Task Status (after failure):**
```json
{
  "task_id": "task-validation-123",
  "status": "failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Missing required field: profileData",
    "details": {
      "field": "profileData",
      "location": "payload",
      "expected": "object with student profile information"
    }
  }
}
```

### 13. Test Rate Limiting
```bash
# Send 6 rapid requests to trigger rate limiting
for i in {1..6}; do
  echo "Request $i:"
  curl -X POST "$AGENT/agent/task" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TASK_JWT" \
    -H "X-Agent-Id: student-pilot" \
    -d '{
      "task_id": "rate-test-'$i'",
      "action": "student_pilot.analyze_essay",
      "payload": {"content":"Rate limit test","prompt":"Test"},
      "reply_to": "'$CC'/orchestrator/tasks/callback",
      "trace_id": "rate-test-'$i'",
      "requested_by": "rate_limit_test"
    }' -w "HTTP_%{http_code}\n"
  sleep 0.5
done
```

**Expected Response (6th request - 429):**
```json
{
  "error": "Too many requests. Rate limit exceeded.",
  "retry_after": 60
}
```

## Additional Capabilities Testing

### 14. Generate Essay Outline
```bash
curl -X POST "$CC/orchestrator/tasks/dispatch" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "student_pilot.generate_essay_outline",
    "payload": {
      "prompt": "Describe how your cultural background has influenced your academic and career aspirations in engineering.",
      "essayType": "personal_statement",
      "wordLimit": 500
    },
    "requested_by": "essay_assistant"
  }'
```

### 15. Get Student Profile
```bash
curl -X POST "$CC/orchestrator/tasks/dispatch" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "student_pilot.get_profile",
    "payload": {
      "userId": "user-123"
    },
    "requested_by": "profile_manager"
  }'
```

### 16. Create Application
```bash
curl -X POST "$CC/orchestrator/tasks/dispatch" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "student_pilot.create_application",
    "payload": {
      "scholarshipId": "scholarship-uuid-1",
      "userId": "user-123",
      "applicationData": {
        "personalStatement": "My personal statement...",
        "documents": ["transcript.pdf", "recommendation1.pdf"]
      }
    },
    "requested_by": "application_manager"
  }'
```

## Monitoring and Troubleshooting

### 17. Check Agent Health Status
```bash
# Quick health check with verbose output
curl -v "$AGENT/health"
```

### 18. Validate Agent Configuration
```bash
# Check if agent is properly configured
curl -s "$AGENT/agent/capabilities" | jq '.'
```

### 19. Monitor Task Queue
```bash
# Check pending/running tasks
curl -s "$CC/orchestrator/tasks?status=running" | jq '.'
```

### 20. Agent Metrics (if available)
```bash
# Check agent-specific metrics
curl -s "$AGENT/metrics" 2>/dev/null || echo "Metrics endpoint not available"
```

## Notes

- Replace `$AGENT`, `$CC`, and `$SHARED_SECRET` with your actual values
- All timestamps are in ISO 8601 format (UTC)
- Task IDs and trace IDs are UUIDs for tracking
- Rate limiting is enforced per agent endpoint (5 requests/minute)
- JWT tokens expire after a configured time (typically 1 hour)
- All responses include appropriate HTTP status codes
- Event monitoring provides comprehensive audit trail for all operations