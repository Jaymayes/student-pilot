# auto_com_center Implementation Plan
**DRI:** Agent3  
**Deadline:** Gate 1 - Nov 15, 18:00 MST  
**Status:** Ready to Execute (Awaiting Workspace Access)

---

## Executive Summary

Implement Agent Bridge orchestrator endpoints in auto_com_center to enable service-to-service task coordination, along with load testing, monitoring, and alerting infrastructure.

**CEO Directives:**
- Implement `/orchestrator/*` endpoints with HS256 SHARED_SECRET auth
- Load test: 200 rps, P95 ≤120ms
- Alert configuration + bounce/drop monitoring
- Switch to S2S opaque tokens after Gate 1

---

## Part 1: Agent Bridge Orchestrator Endpoints

### 1.1 Environment Configuration

**Required Secrets (Ops to set immediately):**
```bash
SHARED_SECRET=<32+ character secret, must match student_pilot>
COMMAND_CENTER_URL=https://auto-com-center-jamarrlmayes.replit.app
```

**server/environment.ts additions:**
```typescript
SHARED_SECRET: z.string().min(32),
REGISTERED_AGENTS: z.string().optional(), // JSON map of agent configs
```

### 1.2 Agent Registry (In-Memory for MVP)

**server/agentRegistry.ts:**
```typescript
import { z } from 'zod';

const AgentSchema = z.object({
  agent_id: z.string(),
  name: z.string(),
  base_url: z.string().url(),
  capabilities: z.array(z.string()),
  registered_at: z.string(),
  last_seen: z.string(),
  status: z.enum(['online', 'offline', 'degraded']),
});

type Agent = z.infer<typeof AgentSchema>;

class AgentRegistry {
  private agents = new Map<string, Agent>();

  register(agent: Agent): void {
    this.agents.set(agent.agent_id, {
      ...agent,
      registered_at: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      status: 'online',
    });
  }

  updateHeartbeat(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    
    agent.last_seen = new Date().toISOString();
    agent.status = 'online';
    return true;
  }

  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  markStale(): void {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    for (const agent of this.agents.values()) {
      const lastSeen = new Date(agent.last_seen).getTime();
      if (now - lastSeen > staleThreshold) {
        agent.status = 'offline';
      }
    }
  }
}

export const agentRegistry = new AgentRegistry();

// Mark stale agents every minute
setInterval(() => agentRegistry.markStale(), 60000);
```

### 1.3 JWT Verification Middleware

**server/middleware/agentAuth.ts:**
```typescript
import jwt from 'jsonwebtoken';
import { env } from '../environment';
import type { Request, Response, NextFunction } from 'express';

export interface AgentAuthPayload {
  agent_id: string;
  name: string;
  iss: string;
  aud: string;
}

export function verifyAgentToken(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization header with Bearer token required',
        },
      });
    }

    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(token, env.SHARED_SECRET, {
      algorithms: ['HS256'],
      audience: 'auto-com-center',
    }) as AgentAuthPayload;

    // Attach decoded payload to request
    (req as any).agent = decoded;
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid JWT token',
          details: error.message,
        },
      });
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'JWT token expired',
        },
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
      },
    });
  }
}
```

### 1.4 Orchestrator Routes

**server/routes/orchestrator.ts:**
```typescript
import { Router } from 'express';
import { verifyAgentToken } from '../middleware/agentAuth';
import { agentRegistry } from '../agentRegistry';

const router = Router();

// POST /orchestrator/register - Register new agent
router.post('/register', verifyAgentToken, (req, res) => {
  try {
    const { agent_id, name, base_url, capabilities } = req.body;

    // Validate required fields
    if (!agent_id || !name || !base_url || !Array.isArray(capabilities)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'Missing required fields: agent_id, name, base_url, capabilities',
        },
      });
    }

    // Register agent
    agentRegistry.register({
      agent_id,
      name,
      base_url,
      capabilities,
      registered_at: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      status: 'online',
    });

    console.log(`✅ Agent registered: ${agent_id} (${name})`);

    res.json({
      success: true,
      agent_id,
      message: 'Agent registered successfully',
    });
  } catch (error) {
    console.error('Registration failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REGISTRATION_FAILED',
        message: 'Agent registration failed',
      },
    });
  }
});

// POST /orchestrator/heartbeat - Agent heartbeat
router.post('/heartbeat', verifyAgentToken, (req, res) => {
  try {
    const { agent_id } = req.body;

    if (!agent_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_AGENT_ID',
          message: 'agent_id is required',
        },
      });
    }

    const updated = agentRegistry.updateHeartbeat(agent_id);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: 'Agent not registered',
        },
      });
    }

    res.json({
      success: true,
      message: 'Heartbeat received',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Heartbeat failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'HEARTBEAT_FAILED',
        message: 'Heartbeat processing failed',
      },
    });
  }
});

// POST /orchestrator/tasks/:task_id/callback - Task result callback
router.post('/tasks/:task_id/callback', verifyAgentToken, (req, res) => {
  try {
    const { task_id } = req.params;
    const { status, result, error, trace_id } = req.body;

    console.log(`📥 Task callback: ${task_id} - ${status}`, {
      trace_id,
      has_result: !!result,
      has_error: !!error,
    });

    // Store task result (implement persistence later)
    // For now, just log and acknowledge

    res.json({
      success: true,
      task_id,
      message: 'Result received',
    });
  } catch (error) {
    console.error('Task callback failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CALLBACK_FAILED',
        message: 'Task callback processing failed',
      },
    });
  }
});

// POST /orchestrator/events - Event ingestion
router.post('/events', verifyAgentToken, (req, res) => {
  try {
    const { event_id, type, source, data, time, trace_id } = req.body;

    console.log(`📨 Event received: ${type} from ${source}`, {
      event_id,
      trace_id,
    });

    // Store event (implement persistence later)
    // For now, just log and acknowledge

    res.json({
      success: true,
      event_id,
      message: 'Event received',
    });
  } catch (error) {
    console.error('Event ingestion failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'EVENT_FAILED',
        message: 'Event processing failed',
      },
    });
  }
});

// GET /orchestrator/agents - List registered agents (admin only)
router.get('/agents', (req, res) => {
  try {
    const agents = agentRegistry.getAllAgents();
    
    res.json({
      success: true,
      count: agents.length,
      agents: agents.map(a => ({
        agent_id: a.agent_id,
        name: a.name,
        status: a.status,
        last_seen: a.last_seen,
        capabilities_count: a.capabilities.length,
      })),
    });
  } catch (error) {
    console.error('Failed to list agents:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LIST_FAILED',
        message: 'Failed to retrieve agents',
      },
    });
  }
});

export default router;
```

### 1.5 Integration into Main App

**server/index.ts additions:**
```typescript
import orchestratorRouter from './routes/orchestrator';

// Mount orchestrator routes
app.use('/orchestrator', orchestratorRouter);
console.log('✅ Agent Bridge orchestrator endpoints registered');
```

---

## Part 2: Load Testing Infrastructure

### 2.1 k6 Load Test Script

**load-tests/orchestrator-load.js:**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Custom metrics
const registrationLatency = new Trend('registration_latency');
const heartbeatLatency = new Trend('heartbeat_latency');
const callbackLatency = new Trend('callback_latency');
const eventLatency = new Trend('event_latency');
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 RPS
    { duration: '1m', target: 100 },  // Ramp to 100 RPS
    { duration: '2m', target: 200 },  // Ramp to 200 RPS (target)
    { duration: '2m', target: 200 },  // Hold at 200 RPS
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_duration{endpoint:register}': ['p(95)<120'], // P95 <120ms
    'http_req_duration{endpoint:heartbeat}': ['p(95)<120'],
    'http_req_duration{endpoint:callback}': ['p(95)<120'],
    'http_req_duration{endpoint:event}': ['p(95)<120'],
    'errors': ['rate<0.01'], // Error rate <1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://auto-com-center-jamarrlmayes.replit.app';
const SHARED_SECRET = __ENV.SHARED_SECRET;

// Generate JWT token (simplified - in real test, use library)
function generateToken(agentId) {
  // NOTE: Use proper JWT library in actual implementation
  // This is placeholder - k6 doesn't have built-in JWT
  return 'Bearer <generated-token>';
}

export default function() {
  const agentId = `agent-${__VU}-${__ITER}`;
  const token = generateToken(agentId);
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': token,
    'X-Agent-Id': agentId,
  };

  // Test 1: Registration
  const regStart = Date.now();
  const regRes = http.post(
    `${BASE_URL}/orchestrator/register`,
    JSON.stringify({
      agent_id: agentId,
      name: `LoadTest Agent ${__VU}`,
      base_url: `https://test-agent-${__VU}.example.com`,
      capabilities: ['test.capability'],
    }),
    { headers, tags: { endpoint: 'register' } }
  );
  registrationLatency.add(Date.now() - regStart);
  check(regRes, {
    'registration status 200': (r) => r.status === 200,
    'registration success': (r) => JSON.parse(r.body).success === true,
  }) || errorRate.add(1);

  sleep(1);

  // Test 2: Heartbeat
  const hbStart = Date.now();
  const hbRes = http.post(
    `${BASE_URL}/orchestrator/heartbeat`,
    JSON.stringify({ agent_id: agentId }),
    { headers, tags: { endpoint: 'heartbeat' } }
  );
  heartbeatLatency.add(Date.now() - hbStart);
  check(hbRes, {
    'heartbeat status 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(0.5);

  // Test 3: Task Callback
  const cbStart = Date.now();
  const cbRes = http.post(
    `${BASE_URL}/orchestrator/tasks/test-task-${__ITER}/callback`,
    JSON.stringify({
      task_id: `test-task-${__ITER}`,
      status: 'succeeded',
      result: { data: 'test' },
      trace_id: `trace-${__ITER}`,
    }),
    { headers, tags: { endpoint: 'callback' } }
  );
  callbackLatency.add(Date.now() - cbStart);
  check(cbRes, {
    'callback status 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(0.5);

  // Test 4: Event
  const evStart = Date.now();
  const evRes = http.post(
    `${BASE_URL}/orchestrator/events`,
    JSON.stringify({
      event_id: `event-${__ITER}`,
      type: 'test.event',
      source: agentId,
      data: { test: true },
      time: new Date().toISOString(),
      trace_id: `trace-${__ITER}`,
    }),
    { headers, tags: { endpoint: 'event' } }
  );
  eventLatency.add(Date.now() - evStart);
  check(evRes, {
    'event status 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(2);
}
```

### 2.2 Load Test Execution Script

**scripts/run-load-test.sh:**
```bash
#!/bin/bash
set -e

echo "🚀 Starting auto_com_center load test..."
echo "Target: 200 RPS, P95 ≤120ms"
echo ""

# Ensure k6 is installed
if ! command -v k6 &> /dev/null; then
    echo "❌ k6 not found. Installing..."
    # Installation handled by package manager
fi

# Run load test
k6 run \
  --out json=load-test-results.json \
  --summary-export=load-test-summary.json \
  load-tests/orchestrator-load.js

echo ""
echo "✅ Load test complete!"
echo "Results: load-test-results.json"
echo "Summary: load-test-summary.json"
```

---

## Part 3: Monitoring & Alerting

### 3.1 Metrics Collection

**server/monitoring/orchestratorMetrics.ts:**
```typescript
class OrchestratorMetrics {
  private metrics = {
    registrations: { total: 0, failed: 0 },
    heartbeats: { total: 0, failed: 0 },
    callbacks: { total: 0, failed: 0 },
    events: { total: 0, failed: 0 },
    latencies: {
      register: [] as number[],
      heartbeat: [] as number[],
      callback: [] as number[],
      event: [] as number[],
    },
  };

  recordRegistration(success: boolean, latency: number) {
    this.metrics.registrations.total++;
    if (!success) this.metrics.registrations.failed++;
    this.metrics.latencies.register.push(latency);
    this.trimLatencies('register');
  }

  recordHeartbeat(success: boolean, latency: number) {
    this.metrics.heartbeats.total++;
    if (!success) this.metrics.heartbeats.failed++;
    this.metrics.latencies.heartbeat.push(latency);
    this.trimLatencies('heartbeat');
  }

  recordCallback(success: boolean, latency: number) {
    this.metrics.callbacks.total++;
    if (!success) this.metrics.callbacks.failed++;
    this.metrics.latencies.callback.push(latency);
    this.trimLatencies('callback');
  }

  recordEvent(success: boolean, latency: number) {
    this.metrics.events.total++;
    if (!success) this.metrics.events.failed++;
    this.metrics.latencies.event.push(latency);
    this.trimLatencies('event');
  }

  private trimLatencies(type: keyof typeof this.metrics.latencies) {
    // Keep last 1000 samples
    if (this.metrics.latencies[type].length > 1000) {
      this.metrics.latencies[type] = this.metrics.latencies[type].slice(-1000);
    }
  }

  getP95(type: keyof typeof this.metrics.latencies): number {
    const latencies = [...this.metrics.latencies[type]].sort((a, b) => a - b);
    if (latencies.length === 0) return 0;
    const idx = Math.floor(latencies.length * 0.95);
    return latencies[idx] || 0;
  }

  getErrorRate(type: 'registrations' | 'heartbeats' | 'callbacks' | 'events'): number {
    const metric = this.metrics[type];
    if (metric.total === 0) return 0;
    return metric.failed / metric.total;
  }

  getSummary() {
    return {
      registrations: {
        ...this.metrics.registrations,
        error_rate: this.getErrorRate('registrations'),
        p95_latency: this.getP95('register'),
      },
      heartbeats: {
        ...this.metrics.heartbeats,
        error_rate: this.getErrorRate('heartbeats'),
        p95_latency: this.getP95('heartbeat'),
      },
      callbacks: {
        ...this.metrics.callbacks,
        error_rate: this.getErrorRate('callbacks'),
        p95_latency: this.getP95('callback'),
      },
      events: {
        ...this.metrics.events,
        error_rate: this.getErrorRate('events'),
        p95_latency: this.getP95('event'),
      },
    };
  }
}

export const orchestratorMetrics = new OrchestratorMetrics();
```

### 3.2 Alert Configuration

**Alert Thresholds:**
- P95 latency >100ms → WARN
- P95 latency >120ms → CRITICAL
- Error rate >0.5% → WARN
- Error rate >1% → CRITICAL
- Agent offline >5 minutes → WARN
- Agent offline >15 minutes → CRITICAL

### 3.3 Health Endpoint Extension

**server/health.ts additions:**
```typescript
router.get('/', async (req, res) => {
  const checks: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };

  // Agent registry check
  const agents = agentRegistry.getAllAgents();
  const onlineAgents = agents.filter(a => a.status === 'online').length;
  checks.agents = {
    total: agents.length,
    online: onlineAgents,
    offline: agents.length - onlineAgents,
  };

  // Orchestrator metrics
  const metrics = orchestratorMetrics.getSummary();
  checks.orchestrator = {
    p95_latency_register: metrics.registrations.p95_latency,
    p95_latency_heartbeat: metrics.heartbeats.p95_latency,
    error_rate_register: metrics.registrations.error_rate,
    error_rate_heartbeat: metrics.heartbeats.error_rate,
  };

  // Check for unhealthy conditions
  if (metrics.registrations.p95_latency > 120 || metrics.heartbeats.p95_latency > 120) {
    checks.status = 'degraded';
  }
  if (metrics.registrations.error_rate > 0.01 || metrics.heartbeats.error_rate > 0.01) {
    checks.status = 'degraded';
  }

  const statusCode = checks.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(checks);
});
```

---

## Part 4: Delivery Timeline

### Day 1 (Today - Nov 13)
- ✅ Implementation plan documented
- ⏳ Awaiting workspace access from Ops
- ⏳ Ops sets COMMAND_CENTER_URL secret

### Day 2 (Nov 14)
- ⏳ Implement orchestrator endpoints (4 hours)
- ⏳ Add metrics collection (2 hours)
- ⏳ Test with student_pilot Agent Bridge (1 hour)
- ⏳ Initial load test run (1 hour)

### Day 3 (Nov 15, Gate 1 Deadline)
- ⏳ Alert configuration (2 hours)
- ⏳ Health endpoint enhancement (1 hour)
- ⏳ Documentation + evidence package (2 hours)
- ⏳ Final load test + evidence collection (2 hours)

---

## Part 5: Evidence Package

**Deliverables for Gate 1:**

1. **k6 Load Test Results:**
   - JSON output with P50/P95/P99 latencies
   - Error rate analysis
   - Throughput metrics
   - Screenshots of k6 summary

2. **Alert Rules Configuration:**
   - Threshold definitions
   - Alert routing
   - Escalation policy

3. **Sample Failure Handling Report:**
   - Example of agent offline detection
   - Example of high latency alert
   - Example of error rate spike

4. **Health Endpoint Evidence:**
   - `/health` response showing agent status
   - Orchestrator metrics included

5. **Integration Proof:**
   - student_pilot successfully registering
   - Heartbeat flowing
   - Task callbacks working

---

## Part 6: Future Enhancements (Post-Gate 1)

**After scholar_auth M2M is live:**
1. Replace HS256 SHARED_SECRET with opaque token introspection
2. Implement proper scopes (orchestrator.register, orchestrator.task)
3. Add RBAC for admin endpoints (/agents list)

**Persistence Layer:**
1. Store agent registrations in database
2. Store task results for replay
3. Store events for audit trail

**Advanced Features:**
1. Task queueing and prioritization
2. Dead letter queue (DLQ) for failed tasks
3. Task retry logic with backoff
4. Event streaming/subscriptions

---

## Sign-Off

**DRI:** Agent3  
**Status:** READY TO EXECUTE  
**Blocking:** Ops workspace access  
**ETA:** 8 hours after workspace access granted

**Next Action:** Await Ops confirmation of auto_com_center workspace access + COMMAND_CENTER_URL secret

---

**END OF IMPLEMENTATION PLAN**
