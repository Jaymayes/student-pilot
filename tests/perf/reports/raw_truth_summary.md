# Raw Truth Summary (Run 015)

**RUN_ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-015  
**Timestamp:** 2026-01-12T18:34:31Z  
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

**Trigger:** A6 ≠ 200 (11th consecutive)  
**Action:** Proceeding with partial verification

---

## Evidence

- Raw curl output: `tests/perf/evidence/raw_curl_evidence.txt`
- X-Trace-Id: CEOSPRINT-20260113-EXEC-ZT3G-FIX-015.raw_truth

---

## Verdict

⚠️ **RAW TRUTH GATE: PARTIAL PASS** (A6 blocked)

*RUN_ID: CEOSPRINT-20260113-EXEC-ZT3G-FIX-015*
