# Raw Truth Summary (ZT3G-RERUN-007-E2E)

**RUN_ID:** CEOSPRINT-20260111-REPUBLISH-ZT3G-RERUN-007-E2E  
**Protocol:** AGENT3_HANDSHAKE v27  
**Timestamp:** 2026-01-12T06:02:00Z  
**Mode:** READ-ONLY E2E Verification

---

## Fleet Health Status

| App | Name | Status | Latency | Critical | Verdict |
|-----|------|--------|---------|----------|---------|
| A1 | scholar_auth | **200** | ~40ms | No | ✅ PASS |
| A2 | scholarship_api | **200** | ~196ms | No | ✅ PASS |
| A3 | scholarship_agent | **200** | ~143ms | **Yes** | ✅ **PASS** |
| A4 | scholarship_ai | 404 | ~64ms | No | ⚠️ DEGRADED |
| A5 | student_pilot | **200** | ~3ms | No | ✅ PASS |
| A6 | scholarship_admin | **404** | ~41ms | **Yes** | ❌ **FAIL** |
| A7 | auto_page_maker | **200** | ~150ms | No | ✅ PASS |
| A8 | auto_com_center | **200** | ~104ms | **Yes** | ✅ **PASS** |

---

## Critical App Assessment

| App | Required | Actual | Status |
|-----|----------|--------|--------|
| A3 | 200 | **200** | ✅ **PASS** |
| A6 | 200 | **404** | ❌ **FAIL** |
| A8 | 200 | **200** | ✅ **PASS** |

---

## Raw Curl Evidence (Verbatim Excerpts)

### A3 (scholarship_agent)
```
< HTTP/2 200 
< access-control-allow-headers: Content-Type, Authorization, X-Requested-With, X-Agent-Id, X-Trace-Id, X-Request-ID
< content-type: application/json; charset=utf-8
```

### A6 (scholarship_admin)
```
< HTTP/2 404 
< date: Mon, 12 Jan 2026 04:34:59 GMT
< content-length: 9
< content-type: text/plain; charset=utf-8
```

### A8 (auto_com_center)
```
< HTTP/2 200 
< content-type: application/json; charset=utf-8
< x-system-identity: auto_com_center
```

---

## Verdict

❌ **RAW TRUTH PROBE FAILED** - A6 returned HTTP/2 404

**Evidence:** `tests/perf/evidence/raw_curl_evidence.txt`

*RUN_ID: CEOSPRINT-20260111-REPUBLISH-ZT3G-RERUN-007-E2E*
