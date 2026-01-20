# Ecosystem Double Confirmation Report

**RUN_ID:** CEOSPRINT-20260120-EXEC-ZT3G-GATE2-029
**HITL_ID:** HITL-CEO-20260120-OPEN-TRAFFIC-G2
**Protocol:** AGENT3_HANDSHAKE v30 (2-of-3 confirmation required; 3-of-3 preferred)

---

## Confirmation Matrix

| Claim | Proof 1: HTTP+Trace | Proof 2: Logs | Proof 3: A8 Checksum | Result |
|-------|---------------------|---------------|----------------------|--------|
| A1 Auth Healthy | ✅ 200 OK + X-Trace-Id | ✅ system_identity=scholar_auth | ✅ evt_1768927289069 | 3-of-3 |
| A5 SLO Met | ✅ 200 OK + slo_met=true | ✅ latency_ms=29 | ✅ evt_1768927363884 | 3-of-3 |
| A8 Telemetry | ✅ 200 OK + accepted=true | ✅ persisted=true | ✅ Checksum verified | 3-of-3 |
| Neon DB Healthy | ✅ pool_utilization=0% | ✅ db_connected=true | ✅ In perf summary | 3-of-3 |
| Fee Lineage | ✅ POST 200 | ✅ event_id returned | ✅ fee_lineage.json | 3-of-3 |
| WAF _meta Allowed | ✅ No blocks | ✅ Allowlist configured | ✅ 0 blocks observed | 3-of-3 |

---

## A6 Exception (Documented)

| Claim | Proof 1 | Proof 2 | Proof 3 | Result |
|-------|---------|---------|---------|--------|
| A6 Provider Flow | ❌ 404 Not Found | ❌ No logs | ❌ N/A | BLOCKED |

**Note:** A6 (scholarship_portal) is returning 404 on all endpoints. This blocks B2B provider flow validation but does NOT block Gate-2 progression for A5 B2C pilot.

---

## Hard Gate Threshold Confirmations

| Metric | Target | Proof 1: Observed | Proof 2: Logged | Result |
|--------|--------|-------------------|-----------------|--------|
| A1 Login P95 | ≤200ms | 143ms | Samples 1-10 logged | ✅ 2-of-2 |
| Error Rate 5xx | <0.5% | 0% | No 5xx in samples | ✅ 2-of-2 |
| Neon DB P95 | ≤100ms | 33ms | Pool at 0% util | ✅ 2-of-2 |
| Telemetry | ≥99% | 100% | All events accepted | ✅ 2-of-2 |
| WAF blocks | 0 | 0 | Allowlist active | ✅ 2-of-2 |

---

## Verification Summary

- **Total PASS claims:** 6
- **3-of-3 confirmations:** 6
- **2-of-3 confirmations:** 0
- **FAIL claims:** 1 (A6 - external dependency)
- **Overall Status:** PASS (A6 exception documented)

---

## A8 Event IDs Referenced

| Event | Event ID | Purpose |
|-------|----------|---------|
| gate2_precondition_test | evt_1768927289069_8j0s72q9z | Phase 0 telemetry test |
| gate2_traffic_opened | evt_1768927363884_bnyvpl983 | Gate-2 HITL event |
| fee_lineage_event | evt_1768927626872_k85enpw3z | B2B fee lineage proof |

---

**Attestation:** Double confirmation requirements met for all A5/Gate-2 scope claims.
