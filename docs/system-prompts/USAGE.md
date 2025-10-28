# Universal Prompt v1.1 - Usage Guide

**Version**: v1.1 (Agent3 Router)  
**Last Updated**: October 28, 2025

## Overview

The Universal Prompt system provides a single source of truth for Agent3 operating instructions across all 8 ScholarLink microservice apps. It enforces overlay isolation, mandatory telemetry, SLO escalation, and revenue-focused instrumentation.

## File Location

- **Universal Prompt**: `docs/system-prompts/universal.prompt`
- **Raw Size**: 4,885 bytes
- **Merged Size**: 1,967 bytes (shared sections + app overlay)

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
5. **Default fallback**: `scholarship_api`

## Prompt Structure

### Shared Sections (A-E, G-H)

- **A) Routing & Isolation** - First-match-wins detection (5-tier); strict overlay isolation
- **B) Company Core** - $10M ARR mission; dual-engine growth; 4x AI markup, 3% provider fee
- **C) Global Guardrails** - No essays/PII/secrets; server-side trust boundary
- **D) KPI & Telemetry** - overlay_selected, slo_at_risk, error events; revenue tracking
- **E) SLOs & Escalation** - 99.9% uptime, P95 ≤120ms; escalate if p95 > 150ms for 5+ min
- **G) Operating Procedure** - Plan → Execute → Validate → Report → Escalate
- **H) Definition of Done** - Events emitted, no violations, latency within SLOs, revenue present

### App Overlays (Section F)

Each overlay includes:
- **Purpose**: Core mission
- **Allowed actions**: Explicit boundaries
- **Required events**: Mandatory telemetry
- **Must not**: Hard constraints to prevent policy violations

#### 1. executive_command_center
**Purpose**: Generate concise KPI briefs and insights for leadership  
**Must not**: Mutate production data; guess numbers

#### 2. auto_page_maker
**Purpose**: Create SEO-ready scholarship/topic pages to drive organic traffic  
**Required events**: page_plan_created, page_published  
**Must not**: Include PII; promise scholarship acceptance

#### 3. student_pilot (B2C revenue)
**Purpose**: Guide students to scholarships; monetize via credit packs  
**Must not**: Write essays or facilitate dishonest assistance

#### 4. provider_register (B2B revenue)
**Purpose**: Onboard providers; list scholarships; accrue platform fee  
**Must not**: Compute fee_usd in prompt/agent; collect sensitive PII

#### 5. scholarship_api
**Purpose**: Explain API usage, parameters, and quotas; guide developers  
**Must not**: Expose secrets or tokens

#### 6. scholarship_agent
**Purpose**: Plan and evaluate autonomous marketing and outreach campaigns  
**Required events**: campaign_plan_created, experiment_defined  
**Must not**: Send messages directly; store PII

#### 7. scholar_auth
**Purpose**: Explain auth flows and safety; assist with non-sensitive troubleshooting  
**Required events**: auth_doc_viewed  
**Must not**: Ask for passwords, codes, or secret answers

#### 8. scholarship_sage
**Purpose**: Answer safe, general scholarship questions and policy clarifications  
**Required events**: guidance_provided  
**Must not**: Run destructive actions; share stack secrets

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
