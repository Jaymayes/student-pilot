# Raw Truth Summary (Run 017 - Protocol v28 Strict Mode)

**RUN_ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-017  
**Timestamp:** 2026-01-12T19:06:05Z  
**Protocol:** AGENT3_HANDSHAKE v28 (Strict Mode)  
**Cache-Bust:** Applied (epoch_ms)

---

## Raw Truth Gate Results (with Content Verification)

| App | Endpoint | HTTP | Content Marker | Verdict |
|-----|----------|------|----------------|---------|
| A3 | /health | **200** | ✅ `status:healthy,version:1.0.0` | ✅ **PASS** |
| A6 | /health | **404** | ❌ NO_MARKER | ❌ **FAIL** |
| A8 | /health | **200** | ✅ `system_identity:auto_com_center` | ✅ **PASS** |

---

## Protocol v28 Requirements

| Requirement | Status |
|-------------|--------|
| Cache-busting (`?t={epoch_ms}`) | ✅ Applied |
| X-Trace-Id in request | ✅ Sent |
| Content marker verification | ✅ Enforced |
| No false positives | ✅ A6 correctly marked FAIL |

---

## Content Markers Captured

### A3 (scholarship_agent)
```json
{"status":"healthy","timestamp":"2026-01-12T19:06:06.923Z","version":"1.0.0"...}
```

### A8 (auto_com_center)
```json
{"status":"ok","system_identity":"auto_com_center","base_url":"https://auto-com-center..."}
```

---

## Fail-Fast Assessment

**Trigger:** A6 ≠ 200 (12th consecutive)  
**Action:** Proceeding with partial verification  
**Manual Intervention:** Required for A6

---

## Evidence

- Raw curl output: `tests/perf/evidence/raw_curl_evidence.txt`
- X-Trace-Id: CEOSPRINT-20260113-EXEC-ZT3G-FIX-017.{A3|A6|A8}

---

## Verdict

⚠️ **RAW TRUTH GATE: PARTIAL PASS** (2/3 - A6 blocked)

*RUN_ID: CEOSPRINT-20260113-EXEC-ZT3G-FIX-017*
