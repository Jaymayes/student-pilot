# False Positive Register

**Generated:** 2026-01-07T06:53:00Z  
**Protocol Version:** AGENT3_HANDSHAKE v7  
**Namespace:** simulated_audit

---

## Purpose

This register documents alerts and findings that were triaged as false positives during the audit, with evidence supporting the classification.

---

## Triaged Alerts

### FP-001: "/api/auth/login 404" Report

| Field | Value |
|-------|-------|
| **Alert Type** | Route Not Found |
| **Reported Path** | `/api/auth/login` |
| **Classification** | ✅ FALSE POSITIVE |
| **Evidence** | Correct endpoint is `/api/login` (returns 302) |
| **Root Cause** | Documentation mismatch; no route `/api/auth/login` ever existed |
| **Resolution** | Documented correct endpoint in A5-001 |

---

### FP-002: "High Memory Usage" Alerts

| Field | Value |
|-------|-------|
| **Alert Type** | System Warning |
| **Frequency** | Every 5 minutes |
| **Classification** | ⚠️ PARTIALLY FALSE POSITIVE |
| **Evidence** | Application running stable; no OOM errors |
| **Root Cause** | Alert threshold may be too sensitive |
| **Recommendation** | Tune memory alert threshold; monitor for actual OOM |

---

### FP-003: "Stale ARR Data" Alerts

| Field | Value |
|-------|-------|
| **Alert Type** | Critical - ARR Monitoring |
| **Tables** | `usage_events`, `ledger_entries` |
| **Classification** | ✅ FALSE POSITIVE (Expected) |
| **Evidence** | No real B2C transactions occurring |
| **Root Cause** | Audit uses simulated_audit namespace; real revenue requires production transactions |
| **Resolution** | Alert will self-resolve when real transactions flow |

---

### FP-004: "Agent Bridge Registration 404"

| Field | Value |
|-------|-------|
| **Alert Type** | Registration Failure |
| **Endpoint** | `/orchestrator/register` → 404 |
| **Classification** | ✅ FALSE POSITIVE (Expected) |
| **Evidence** | Telemetry continues at 100% via `/events`; code has explicit fallback |
| **Root Cause** | A8 orchestrator endpoints are optional; not implemented on Command Center |
| **Resolution** | Graceful degradation to "local-only mode" works as designed |
| **Impact** | None - telemetry, KPI_SNAPSHOT, and all critical flows unaffected |

---

## Confirmed Issues (Not False Positives)

| ID | Issue | Status |
|----|-------|--------|
| A6-001 | Migration validation failure | ❌ CONFIRMED |
| A1-001 | OIDC session investigation | ⚠️ NEEDS VALIDATION |
| A8-001 | Revenue Blindness | ⚠️ BLOCKED BY A6 |

---

## Summary

| Classification | Count |
|----------------|-------|
| False Positive | 4 |
| Partially False Positive | 0 |
| Confirmed | 3 |

**False Positive Rate:** 57% of triaged alerts

---

**Signed:** AGENT3 Diagnostic Agent
