# A2 scholarship_api Hotfix Package

**Run ID:** CEOSPRINT-20260114-A2-HOTFIX  
**HITL Token:** HITL-CEO-20260113-CUTOVER-V2 (CONSUMED)  
**Deadline:** EOD Today (Hard Blocker for Canary)

---

## Hotfix Contents

| File | Purpose |
|------|---------|
| `middleware/error_handlers.py` | CEO-approved error handler implementation |
| `main_integration.py` | Example wiring for main.py |
| `v2_6_compliance_checklist.md` | U0-U8 validation requirements |

---

## Deployment Steps

### 1. Replace Error Handlers

Copy `middleware/error_handlers.py` to the A2 workspace:

```
staging-v2/a2-hotfix/middleware/error_handlers.py
  → A2:/middleware/error_handlers.py
```

### 2. Wire in main.py

Add to A2's main.py (app factory):

```python
from middleware.error_handlers import register_error_handlers

app = FastAPI()
register_error_handlers(app)
```

### 3. Set Environment Variables

```bash
export ASSIGNED_APP=scholarship_api
export ENV=staging
export APP_ID=scholarship_api
```

### 4. Add API Key Enforcement

All external routes must require X-API-Key header. Return 401 when missing/invalid.

### 5. Privacy Headers

- Propagate X-Privacy-Context header
- Never log PII
- For minors: set DoNotSell=true and block third-party trackers

---

## Validation (U0-U8)

Run each test and record results:

| ID | Test | Command |
|----|------|---------|
| U0 | Health | `curl -X GET /health` → 200 + {service, env} |
| U1 | Auth | Unauthorized request → 401 |
| U2 | Latency | 10-min P95 ≤ 120ms |
| U3 | Errors | 404 + validation error match JSON schema |
| U4 | Telemetry | Check A8 for request_count, error_count, privacy_enforced |
| U5 | FERPA | is_ferpa_covered=false for B2C |
| U6 | Privacy | Minors path: trackers blocked, DoNotSell=true |
| U7 | Writes | Staging only; prod blocked |
| U8 | Artifacts | Post v2_6_compliant + validation_report + checksums |

---

## Success Criteria

1. All U0-U8 tests PASS
2. v2_6_compliant signal file created
3. validation_report.md generated
4. checksums.json posted to A8
5. Evidence bundle uploaded

---

## On Completion

Notify Agent with:
- validation_report.md
- v2_6_compliant signal file
- A8 event IDs

This unlocks Phase 2 (Canary) authorization.
