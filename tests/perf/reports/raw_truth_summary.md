# Raw Truth Summary (Run 009)

**RUN_ID:** CEOSPRINT-20260113-0100Z-ZT3G-RERUN-009-E2E  
**Timestamp:** 2026-01-12T17:30:12Z  
**Protocol:** AGENT3_HANDSHAKE v27

---

## Raw Truth Gate Results

| App | Endpoint | Status | Verdict |
|-----|----------|--------|---------|
| A3 | /health | **200** | ✅ PASS |
| A6 | /health | **404** | ❌ FAIL |
| A8 | /health | **200** | ✅ PASS |

---

## Fail-Fast Assessment

| Criterion | Expected | Actual | Status |
|-----------|----------|--------|--------|
| A3 = 200 | 200 | 200 | ✅ PASS |
| A6 = 200 | 200 | **404** | ❌ FAIL |
| A8 = 200 | 200 | 200 | ✅ PASS |

**Fail-Fast Triggered:** YES (A6 ≠ 200)

---

## Evidence

- Raw curl output: `tests/perf/evidence/raw_curl_evidence.txt`
- HTTP headers captured verbatim
- X-Trace-Id: CEOSPRINT-20260113-0100Z-ZT3G-RERUN-009-E2E.raw_truth

---

## Second Confirmation (2-of-3)

| Proof | A3 | A6 | A8 |
|-------|----|----|-----|
| HTTP 200 | ✅ | ❌ | ✅ |
| Headers captured | ✅ | ✅ | ✅ |
| Verbatim evidence | ✅ | ✅ | ✅ |

**A3:** 2-of-2 ✅  
**A6:** 1-of-2 ❌ (HTTP 404)  
**A8:** 2-of-2 ✅

---

## Verdict

⚠️ **RAW TRUTH GATE: PARTIAL PASS**

A6 requires BizOps republish. Continuing verification for A3/A8.

*RUN_ID: CEOSPRINT-20260113-0100Z-ZT3G-RERUN-009-E2E*
