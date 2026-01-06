# Documentation Update Plan
**Scholar Ecosystem Audit**  
**Date:** 2026-01-06

---

## Overview

This document outlines the documentation updates required based on audit findings. All changes follow docs-first principles and require PR review before merge.

---

## 1. ECOSYSTEM_README Updates

### Current State
The ECOSYSTEM_README needs updates to reflect:
- Current service health status
- Known issues and workarounds
- Updated architecture diagram

### Proposed Changes

#### Section: Service Health Matrix
Add real-time health matrix:
```markdown
| Service | Status | Last Verified |
|---------|--------|---------------|
| A1 Scholar Auth | ✅ Healthy | 2026-01-06 |
| A2 Scholarship API | ⚠️ Degraded | 2026-01-06 |
| A3 Scholarship Agent | ✅ Healthy | 2026-01-06 |
| A5 Student Pilot | ✅ Healthy | 2026-01-06 |
| A6 Provider Register | ❌ Down | 2026-01-06 |
| A7 Auto Page Maker | ✅ Healthy | 2026-01-06 |
| A8 Command Center | ✅ Healthy | 2026-01-06 |
```

#### Section: Known Issues
Add known issues section:
```markdown
## Known Issues

### Issue A: A2 Missing /ready Endpoint
- **Status:** Open
- **Impact:** Health checks report A2 as unhealthy
- **Workaround:** A5 falls back to /health endpoint
- **PR:** [Link to PR when created]

### Issue B: A6 Service Down
- **Status:** Critical
- **Impact:** B2B revenue pathway blocked
- **Workaround:** None - requires fix
- **Investigation:** Check DATABASE_URL and env vars
```

---

## 2. Runbook Updates

### New Runbook: A6 Provider Register Recovery
**File:** `runbooks/a6-provider-register-recovery.md`

```markdown
# A6 Provider Register Recovery Runbook

## Symptoms
- 500 Internal Server Error on all endpoints
- /api/health returns 500
- No detailed error message

## Diagnosis Steps
1. Check application logs: `replit logs a6`
2. Verify DATABASE_URL is set: Check Replit Secrets
3. Check database connectivity: Test PostgreSQL connection
4. Verify STRIPE_SECRET_KEY is present

## Recovery Steps
1. If DATABASE_URL missing: Add to Replit Secrets
2. If database unreachable: Check Neon dashboard
3. If schema migration failed: Run `npm run db:migrate`
4. Restart application after fixes

## Verification
- /api/health should return 200
- /api/register should be accessible
```

### New Runbook: A8 Revenue Debugging
**File:** `runbooks/a8-revenue-debugging.md`

```markdown
# A8 Revenue Debugging Runbook

## Symptoms
- Finance Tile showing $0
- REVENUE BLOCKED message from A3
- No revenue events in A8

## Diagnosis Steps
1. Verify A8 health: GET /api/health
2. Test event ingestion: POST /events with test event
3. Check A3 preflight: GET /api/preflight (if available)
4. Verify Stripe webhook configuration

## Resolution
1. If A8 not accepting events: Check write permissions
2. If A3 blocked: Investigate bandit_config
3. If Stripe webhooks failing: Check webhook secret
```

---

## 3. API Documentation Updates

### A5 /api/readyz Response Schema
Update to document dependency health format:

```yaml
/api/readyz:
  responses:
    200:
      schema:
        type: object
        properties:
          status:
            type: string
            enum: [ready, degraded]
          dependencies:
            type: object
            properties:
              database:
                type: object
                properties:
                  healthy: boolean
                  latency_ms: number
              scholarship_api:
                type: object
                properties:
                  healthy: boolean
                  fallback: boolean
                  note: string
              auto_com_center:
                type: object
                properties:
                  healthy: boolean
                  latency_ms: number
```

---

## 4. Architecture Diagram Updates

### Current State
Architecture diagram may not reflect:
- A6 current failure status
- Telemetry flow to A8
- UTM attribution flow A7→A1→A5

### Proposed Updates
1. Add health status indicators to service boxes
2. Add telemetry arrows to A8
3. Add UTM attribution flow annotation

---

## 5. PR Plan

### PR #1: Known Issues Documentation
- **Files:** ECOSYSTEM_README.md
- **Changes:** Add Known Issues section with Issue A-D
- **Reviewer:** Tech Lead
- **Priority:** High

### PR #2: Recovery Runbooks
- **Files:** runbooks/a6-provider-register-recovery.md, runbooks/a8-revenue-debugging.md
- **Changes:** Add new runbooks
- **Reviewer:** SRE Team
- **Priority:** High

### PR #3: API Documentation
- **Files:** API docs (location TBD)
- **Changes:** Update /api/readyz schema
- **Reviewer:** API Team
- **Priority:** Medium

### PR #4: Architecture Diagram
- **Files:** docs/architecture.md or similar
- **Changes:** Update diagram with health indicators
- **Reviewer:** Architect
- **Priority:** Low

---

## 6. Timeline

| PR | Description | ETA | Status |
|----|-------------|-----|--------|
| PR #1 | Known Issues | Day 1 | Draft Ready |
| PR #2 | Runbooks | Day 1-2 | Draft Ready |
| PR #3 | API Docs | Day 3 | Pending |
| PR #4 | Architecture | Day 5 | Pending |

---

## HUMAN_APPROVAL_REQUIRED

All documentation PRs require:
1. Technical review by relevant team
2. Accuracy verification against current system state
3. Approval before merge to main

---

*Documentation update plan generated as part of audit process.*
