# A2 scholarship_api - v2.6 Compliance Checklist

**Run ID:** CEOSPRINT-20260114-A2-HOTFIX  
**HITL Token:** HITL-CEO-20260113-CUTOVER-V2 (CONSUMED)

---

## Pre-Deployment

| # | Requirement | Status |
|---|-------------|--------|
| 1 | error_handlers.py deployed | PENDING |
| 2 | register_error_handlers wired in main.py | PENDING |
| 3 | ENV ASSIGNED_APP=scholarship_api set | PENDING |
| 4 | X-API-Key enforcement on external routes | PENDING |
| 5 | X-Privacy-Context header propagation | PENDING |
| 6 | DoNotSell=true for minors | PENDING |

---

## Validation Matrix (U0-U8)

| ID | Test | Expected | Status |
|----|------|----------|--------|
| U0 | GET /health | 200 + {service, env} | PENDING |
| U1 | Unauthorized → 401 | 401 response | PENDING |
| U2 | 10-min P95 | ≤120ms | PENDING |
| U3 | 404 + validation error | JSON schema match | PENDING |
| U4 | A8 telemetry | request_count, error_count, privacy_enforced | PENDING |
| U5 | FERPA flag | is_ferpa_covered=false (B2C) | PENDING |
| U6 | CSP/DoNotSell | minors path enforced | PENDING |
| U7 | Write isolation | staging only; prod blocked | PENDING |
| U8 | Artifacts | v2_6_compliant + validation_report + checksums | PENDING |

---

## Artifacts Required

- [ ] v2_6_compliant signal file
- [ ] validation_report.md
- [ ] checksums.json
- [ ] A8 evidence events

---

## Deadline

**EOD Today** - Hard blocker for Phase 2 (Canary)
