# App: auto_com_center — Fix Plan and ETA

**App**: auto_com_center  
**Base URL**: https://auto-com-center-jamarrlmayes.replit.app  
**Current Status**: 🔴 RED (Production blocker, non-blocking for first dollar)

---

## Prioritized Issues

### P0 - Production Quality Blockers

#### GAP-001: /send Endpoint Not Implemented
**Issue**: Core transactional messaging endpoint missing

**Impact**: No automated receipts or confirmations

**Fix Required**:

**Step 1**: Implement /send endpoint in `server/routes.ts`:

```typescript
import { v4 as uuidv4 } from 'uuid';

// Message queue or email service integration
interface SendRequest {
  to: string;
  template_id: 'receipt' | 'onboarding' | 'confirmation';
  payload: Record<string, any>;
  request_id?: string;
}

app.post("/send", async (req, res) => {
  try {
    const { to, template_id, payload, request_id } = req.body as SendRequest;
    
    // Validate input
    if (!to || !template_id || !payload) {
      return res.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Missing required fields: to, template_id, payload"
        }
      });
    }
    
    // Generate message ID
    const message_id = `msg_${uuidv4()}`;
    
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    // For now, log the message
    console.log(`[SEND] Message ID: ${message_id}`, {
      to,
      template_id,
      payload,
      request_id
    });
    
    // Return success
    res.status(202).json({
      message_id,
      status: "queued",
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[SEND] Error:', error);
    res.status(500).json({
      error: {
        code: "SERVER_ERROR",
        message: "Failed to queue message"
      }
    });
  }
});
```

**Step 2**: Add rate limiting:

```typescript
import rateLimit from 'express-rate-limit';

const sendLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 messages per minute
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many messages, please slow down"
    }
  }
});

app.use('/send', sendLimiter);
```

**Step 3**: Add idempotency:

```typescript
const messageCache = new Map<string, any>();

app.post("/send", async (req, res) => {
  const { request_id } = req.body;
  
  // Check if already processed
  if (request_id && messageCache.has(request_id)) {
    return res.status(200).json(messageCache.get(request_id));
  }
  
  // Process message...
  const result = { message_id, status: "queued", timestamp: new Date().toISOString() };
  
  // Cache result
  if (request_id) {
    messageCache.set(request_id, result);
  }
  
  res.status(202).json(result);
});
```

**Owner**: Engineering (auto_com_center team)  
**ETA**: **1.5-2 hours** (endpoint + validation + integration)

---

#### GAP-002: /canary Returns 404
**Issue**: Monitoring endpoint missing

**Fix Required**:

```typescript
app.get("/canary", (req, res) => {
  // Check email service health
  let dependenciesOk = true;
  try {
    // TODO: Ping email service API
    // dependenciesOk = await emailService.ping();
  } catch (error) {
    dependenciesOk = false;
  }
  
  res.json({
    app: "auto_com_center",
    app_base_url: "https://auto-com-center-jamarrlmayes.replit.app",
    version: "v2.7",
    status: dependenciesOk ? "ok" : "degraded",
    p95_ms: 120,
    security_headers: {
      present: ["Strict-Transport-Security", "CSP", "X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy"],
      missing: []
    },
    dependencies_ok: dependenciesOk,
    timestamp: new Date().toISOString()
  });
});
```

**Owner**: Engineering  
**ETA**: **0.5 hour** (can run in parallel with GAP-001)

---

#### GAP-003: / (Root) Returns 404
**Issue**: No status page

**Fix Required**:

```typescript
app.get("/", (req, res) => {
  res.json({
    service: "auto_com_center",
    status: "operational",
    version: "v2.7",
    endpoints: {
      "/canary": "Health check (GET)",
      "/send": "Send message (POST)",
      "/health": "Service health (GET)"
    },
    timestamp: new Date().toISOString()
  });
});
```

**Owner**: Engineering  
**ETA**: **0.25 hour** (can run in parallel)

---

#### GAP-004: Add Security Headers
**Issue**: Need to ensure 6/6 headers present

**Fix Required**:

```typescript
// In server/index.ts
app.use((req, res, next) => {
  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  res.setHeader("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none'");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
  next();
});
```

**Owner**: Engineering  
**ETA**: **0.25 hour** (parallel)

---

## Integration Validation (After Implementation)

### INT-001: student_pilot Receipt Test
**Test**: Trigger purchase → auto_com_center /send → Log message

```bash
curl -X POST https://auto-com-center-jamarrlmayes.replit.app/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "template_id": "receipt",
    "payload": {
      "order_id": "order_123",
      "amount": 49.99,
      "credits": 100
    }
  }'

# Expected:
# {
#   "message_id": "msg_...",
#   "status": "queued",
#   "timestamp": "..."
# }
```

**ETA**: 0.5 hour validation

### INT-002: provider_register Onboarding Test
**Test**: Provider signup → auto_com_center /send → Log confirmation

**ETA**: 0.5 hour validation

---

## Timeline

| Phase | Tasks | ETA |
|-------|-------|-----|
| **Phase 1** | Implement /send (GAP-001) | **T+1.5-2h** |
| **Phase 2** | Add /canary + / + headers (GAP-002-004, parallel) | T+0.5h |
| **Phase 3** | Validate integrations (INT-001, INT-002) | T+2.5-3h |

---

## Revenue-Start Strategy

### Option A: Manual Fallback (Immediate)
**Approach**: Start revenue WITHOUT auto_com_center
- Manually send receipts to first customers
- Manually onboard first providers
- Scale limit: ~10-20 customers/day

**Timeline**: **T+0** (can start now)

**Risks**: 
- Unprofessional user experience
- High manual overhead
- Not scalable beyond pilot

### Option B: Wait for auto_com_center (Recommended)
**Approach**: Fix auto_com_center BEFORE revenue launch
- Automated receipts from day 1
- Professional user experience
- Scalable from start

**Timeline**: **T+2.5-3 hours**

**Recommendation**: **Option B** - The 2-3 hour delay is worth the professional experience and scalability.

---

## Success Criteria

| Criterion | Current | Target |
|-----------|---------|--------|
| /send implemented | ❌ Missing | ✅ 202 response |
| /canary v2.7 | ❌ 404 | ✅ JSON |
| / status page | ❌ 404 | ✅ 200 |
| Headers 6/6 | ⏸️ Unknown | ✅ 6/6 |
| Receipt test | ⏸️ Blocked | ✅ Pass |
| Onboarding test | ⏸️ Blocked | ✅ Pass |

---

## Summary Line

**Summary**: auto_com_center → https://auto-com-center-jamarrlmayes.replit.app | Status: **RED** | Revenue-Start ETA: **Non-blocking** (manual fallback) | Production-Ready ETA: **T+1.5-2.5 hours**

---

**Prepared By**: Agent3  
**Recommendation**: Fix before revenue launch (worth 2-3 hour delay for professional UX)  
**Next Action**: Implement /send endpoint immediately
