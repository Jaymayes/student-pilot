# ScholarLink Agent Bridge Documentation

ScholarLink now includes an Agent Bridge that integrates with the Auto Com Center orchestration system, allowing it to participate in distributed task execution across multiple microservices.

## Environment Variables

Set these environment variables to configure the Agent Bridge:

```env
# Command Center Configuration
COMMAND_CENTER_URL=https://auto-com-center-jamarrlmayes.replit.app
SHARED_SECRET=your-shared-secret-for-orchestration
AGENT_NAME=student_pilot
AGENT_ID=student-pilot
AGENT_BASE_URL=https://your-app.replit.app

# Required for existing ScholarLink functionality
DATABASE_URL=postgresql://user:password@host:port/database
OPENAI_API_KEY=sk-your-openai-api-key
REPL_ID=your-repl-id
SESSION_SECRET=your-session-secret
REPLIT_DOMAINS=your-domain.replit.app
```

## Agent Capabilities

The ScholarLink agent provides the following actions for orchestrated task execution:

### Student Profile Management
- **`student_pilot.get_profile`** - Retrieve student academic profile
- **`student_pilot.update_profile`** - Create or update student profile

### AI-Powered Scholarship Matching  
- **`student_pilot.match_scholarships`** - Generate AI-powered scholarship matches for a student profile

### Essay Intelligence
- **`student_pilot.analyze_essay`** - Analyze essay content and provide feedback
- **`student_pilot.generate_essay_outline`** - Generate structured essay outline
- **`student_pilot.improve_essay_content`** - Provide content improvement suggestions
- **`student_pilot.generate_essay_ideas`** - Generate personalized essay topic ideas

### Application Management
- **`student_pilot.create_application`** - Create new scholarship application
- **`student_pilot.get_applications`** - Retrieve student's applications

## API Endpoints

### Agent Registration
- **POST `/agent/register`** - Accept registration from Command Center
- **GET `/agent/capabilities`** - Return agent capabilities and health status
- **GET `/health`** - Enhanced health endpoint with agent information

### Task Processing
- **POST `/agent/task`** - Accept task execution requests (rate limited: 5/min)
- **POST `/agent/events`** - Accept and relay events to Command Center

## Example Usage

### Test Agent Capabilities
```bash
# Get agent capabilities
curl https://your-app.replit.app/agent/capabilities

# Response:
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

### Task Execution Examples

#### Analyze Essay
```bash
# Via Command Center
curl -X POST https://auto-com-center-jamarrlmayes.replit.app/orchestrator/tasks/dispatch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{
    "action": "student_pilot.analyze_essay",
    "payload": {
      "content": "My passion for environmental science began when I witnessed the impact of climate change...",
      "prompt": "Describe a challenge you have overcome and how it shaped you."
    },
    "requested_by": "system"
  }'

# Response includes task_id to track progress
{
  "task_id": "uuid-here",
  "status": "dispatched",
  "agent_id": "student-pilot"
}
```

#### Generate Scholarship Matches
```bash
curl -X POST https://auto-com-center-jamarrlmayes.replit.app/orchestrator/tasks/dispatch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{
    "action": "student_pilot.match_scholarships",
    "payload": {
      "profileData": {
        "gpa": "3.8",
        "major": "Computer Science",
        "academicLevel": "junior", 
        "interests": ["artificial intelligence", "machine learning"],
        "achievements": ["Dean\'s List", "Hackathon Winner"]
      }
    },
    "requested_by": "system"
  }'
```

#### Generate Essay Outline
```bash
curl -X POST https://auto-com-center-jamarrlmayes.replit.app/orchestrator/tasks/dispatch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{
    "action": "student_pilot.generate_essay_outline",
    "payload": {
      "prompt": "Describe a time when you demonstrated leadership and its impact.",
      "essayType": "leadership"
    },
    "requested_by": "system"
  }'
```

## Message Schemas

### Task (Incoming)
```typescript
interface Task {
  task_id: string;           // UUID for tracking
  action: string;            // One of the capability actions
  payload: any;             // Action-specific data
  reply_to: string;         // Command Center callback URL  
  trace_id: string;         // Distributed tracing ID
  requested_by: string;     // Requesting system/user
  resources?: {
    priority: number;
    timeout_ms: number;
    retry: number;
  };
}
```

### Result (Outgoing)
```typescript
interface Result {
  task_id: string;
  status: 'accepted' | 'in_progress' | 'succeeded' | 'failed';
  result?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  trace_id: string;
}
```

### Event (Outgoing)
```typescript
interface Event {
  event_id: string;
  type: string;            // 'task_completed', 'task_failed', etc.
  source: string;          // Agent ID
  data: any;              // Event-specific data
  time: string;           // ISO timestamp
  trace_id: string;
}
```

## Security

- **JWT Authentication**: All requests use HS256-signed JWTs with shared secret
- **Rate Limiting**: Agent task endpoint limited to 5 requests per minute
- **Request Validation**: All task payloads validated for required fields
- **Trace Propagation**: X-Trace-Id headers maintained throughout request chain
- **Authorization Headers**: Bearer tokens required on all agent endpoints

## Architecture Integration

The Agent Bridge runs automatically when the ScholarLink server starts:

1. **Registration**: Automatically registers with Command Center on startup
2. **Heartbeat**: Sends status updates every 60 seconds
3. **Task Processing**: Accepts tasks and processes them asynchronously
4. **Event Reporting**: Reports task completion/failure events
5. **Graceful Shutdown**: Stops heartbeat when server closes

## Operational Notes

- Agent Bridge starts automatically with the server
- Registration occurs on server startup and retries if Command Center is unavailable
- All AI-powered actions require valid OPENAI_API_KEY
- Database actions require valid DATABASE_URL connection
- Failed tasks automatically report errors back to Command Center
- Task processing includes automatic timeout and retry handling

## Troubleshooting

### Agent Not Appearing in Command Center
1. Check COMMAND_CENTER_URL is correct
2. Verify SHARED_SECRET matches Command Center configuration  
3. Ensure AGENT_BASE_URL is publicly accessible
4. Check server logs for registration errors

### Task Execution Failures
1. Verify payload format matches expected schema
2. Check OPENAI_API_KEY is valid for AI actions
3. Ensure DATABASE_URL connection is working
4. Review task-specific logs with trace_id

### Rate Limiting
- Agent tasks are limited to 5 requests per minute
- This protects against overloading AI services
- Rate limits reset every minute

The Agent Bridge makes ScholarLink a fully-integrated participant in the distributed orchestration system while maintaining all existing functionality and security standards.