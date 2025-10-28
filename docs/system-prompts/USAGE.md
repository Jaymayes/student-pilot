# Universal Prompt v1.1 - Usage Guide

## Overview

The Universal Prompt system provides a single source of truth for Agent3 operating instructions across all 8 ScholarLink microservice apps. It enforces overlay isolation, mandatory telemetry, and revenue-focused instrumentation.

## File Location

- **Universal Prompt**: `docs/system-prompts/universal.prompt`
- **Current Size**: 3,091 bytes (shared sections + app overlay)

## Runtime Configuration

### Environment Variables

```bash
# Prompt Mode (default: separate)
PROMPT_MODE=separate  # Use separate app-specific prompts
PROMPT_MODE=universal # Use universal prompt with runtime overlay selection

# Explicit Overlay Override (highest priority)
APP_OVERLAY=student_pilot
APP_OVERLAY=executive_command_center
```

### 5-Tier App Detection Order

The system uses a first-match-wins detection hierarchy:

1. **APP_OVERLAY** env var (explicit override)
2. **Hostname pattern** (e.g., `student-pilot-*.replit.app` → `student_pilot`)
3. **AUTH_CLIENT_ID** (Scholar Auth integration mapping)
4. **APP_NAME** (legacy v1.0 compatibility)
5. **Default fallback**: `executive_command_center`

## Prompt Structure

### Shared Sections (A-E, G-H)

- **A) Routing and Isolation** - App overlay selection, detection order, telemetry bootstrap
- **B) Company Core** - $10M ARR mission, data-first strategy
- **C) Global Guardrails** - Privacy, responsible AI, COPPA/FERPA compliance
- **D) KPI and Telemetry** - Event schema, revenue-critical events
- **E) SLOs and Escalation** - 99.9% uptime, P95 ≤120ms targets
- **G) Operating Procedure** - Plan → Implement → Validate → Report
- **H) Definition of Done** - E2E tests, events flowing, KPI moved

### App Overlays (Section F)

Each overlay includes:
- **Purpose**: Core mission
- **Objectives**: Key goals
- **Success metrics**: How to measure performance
- **Required events**: Mandatory telemetry
- **Allowed actions**: Explicit boundaries

#### 1. executive_command_center
Read-only KPI dashboard, safe rollout coordination

#### 2. auto_page_maker
E-E-A-T SEO engine, no thin pages

#### 3. student_pilot (B2C revenue)
Guide students, monetize via credits, no essay writing

#### 4. provider_register (B2B revenue)
Onboard providers, track 3% server-side fee

#### 5. scholarship_api
Fast, explainable retrieval, P95<120ms SLO

#### 6. scholarship_agent
Autonomous marketing, brand protection

#### 7. scholar_auth
MFA security, zero secret logging

#### 8. scholarship_sage
Internal quality reviews, no production writes

## Mandatory Telemetry

### Bootstrap Event (Required on Every Run)

```typescript
{
  event_name: "overlay_selected",
  properties: {
    app_key: "student_pilot",
    detection_method: "AUTH_CLIENT_ID",
    host: "student-pilot-*.replit.app",
    mode: "separate",
    prompt_version: "v1.1"
  }
}
```

### Revenue-Critical Events

**B2C (Student Pilot)**:
```typescript
{
  event_name: "credit_purchase_succeeded",
  properties: {
    revenue_usd: 4.99,
    credits_purchased: 5,
    sku: "CREDIT_PACK_5"
  }
}
```

**B2B (Provider Register)**:
```typescript
{
  event_name: "fee_accrued",
  properties: {
    scholarship_id: "sch_123",
    fee_usd: 30.00,        // Computed server-side only
    award_amount: 1000.00
  }
}
```

## API Endpoints

### 1. List Prompts
```bash
GET /api/prompts
```

### 2. Get App Metadata
```bash
GET /api/prompts/:app
```

### 3. Verify Prompt System
```bash
GET /api/prompts/verify
```

### 4. Get Universal Prompt
```bash
GET /api/prompts/universal
# Requires PROMPT_MODE=universal
```

### 5. Get Individual Overlay
```bash
GET /api/prompts/overlay/:app
# Works in both separate and universal modes
```

## Phased Rollout Timeline

### T+0 (Current)
✅ Universal Prompt v1.1 deployed  
✅ Numbered overlay format active  
✅ Telemetry flowing to business_events  
✅ PROMPT_MODE=separate (default)

### T+24h
- Enable universal mode for Scholarship API & Scholarship Agent
- Verify overlay_selected, latency, event completeness

### T+48h
- Expand to Student Pilot & Provider Register
- Validate revenue events and server-side fee computation

### T+72h
- Enable all remaining apps
- Generate first daily kpi_brief_generated with real revenue numbers

## Server-Side Rules

### Fee Calculation (CRITICAL)
**Never compute fees in prompt/agent logic**. All fee calculations must be server-side:

```typescript
// ❌ WRONG - Never in agent/prompt
const fee = awardAmount * 0.03;

// ✅ CORRECT - Server-side only
const fee = calculatePlatformFee(awardAmount); // Returns 3%
```

### PII Protection
- No raw PII in event properties
- Hash user identifiers (SHA-256)
- Never log secrets or tokens
- Use user_id_hash for linkage

### SLO Enforcement
- Uptime ≥ 99.9%
- P95 latency ≤ 120ms
- Escalate if P95 > 150ms for 5+ minutes

## Verification

### Check Current Detection
```sql
SELECT 
  event_name,
  properties->>'app_key' as app,
  properties->>'detection_method' as method,
  properties->>'prompt_version' as version
FROM business_events 
WHERE event_name = 'overlay_selected' 
ORDER BY ts DESC LIMIT 5;
```

### Verify Overlay Extraction
```bash
curl http://localhost:5000/api/prompts/overlay/student_pilot
```

### Check Universal Prompt Size
```bash
curl http://localhost:5000/api/prompts/universal | grep -o '"size":[0-9]*'
```

## Backward Compatibility

The parser supports three formats:

1. **v1.0**: `[APP: app_key]`
2. **v1.1 Overlay**: `Overlay: app_key`
3. **v1.1 Numbered**: `1. app_key`

Default PROMPT_MODE=separate preserves existing Student Pilot behavior with hash `16316c971227190a`.

## Troubleshooting

### Overlay Not Found
Check the universal.prompt file has the correct numbered format:
```
F) App Overlays (select one)

1. executive_command_center

Purpose: ...
```

### Telemetry Not Flowing
Verify business_events table and emitBusinessEvent function:
```typescript
emitBusinessEvent({
  eventName: "overlay_selected",
  actorType: "system",
  properties: { ... }
}).catch(err => console.error("Event failed:", err));
```

### Hash Mismatch
Run verification endpoint:
```bash
curl http://localhost:5000/api/prompts/verify
```
