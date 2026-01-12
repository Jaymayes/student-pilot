# Manual Intervention Manifest (ZT3G-RERUN-007)

**RUN_ID:** CEOSPRINT-20260111-REPUBLISH-ZT3G-RERUN-007  
**Protocol:** AGENT3_HANDSHAKE v27  
**Timestamp:** 2026-01-12T04:35:00Z  
**Mode:** TRUTH & RECONCILIATION

---

## ❌ RAW TRUTH PROBE FAILED

The following core app failed the anti-hallucination gate:

### A6 (scholarship_admin) — **HTTP/2 404**

**Raw curl output (verbatim from evidence):**
```
< HTTP/2 404 
< date: Mon, 12 Jan 2026 04:34:59 GMT
< content-length: 9
< content-type: text/plain; charset=utf-8
< via: 1.1 google
```

---

## ✅ PASSED Raw Truth Probes

| App | Status | Evidence |
|-----|--------|----------|
| A3 (scholarship_agent) | **HTTP/2 200** | ✅ VERIFIED |
| A8 (auto_com_center) | **HTTP/2 200** | ✅ VERIFIED |

---

## A6 Manual Intervention Steps (CEO/BizOps Required)

### Root Cause Analysis

| Factor | Assessment |
|--------|------------|
| Binding | Likely bound to 127.0.0.1 instead of 0.0.0.0 |
| PORT env var | May not be correctly read/used |
| App state | May not be started or crashed |

### Fix Steps (Cross-Workspace)

1. **Open A6 Workspace:**
   - Navigate to: `https://replit.com/@jamarrlmayes/scholarship-admin`

2. **Verify Startup Command:**
   - Ensure server binds to `0.0.0.0:$PORT`
   - For Express.js: `app.listen(process.env.PORT || 3000, '0.0.0.0')`
   - For Flask: `app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))`
   - For FastAPI/Uvicorn: `uvicorn main:app --host 0.0.0.0 --port $PORT`

3. **Verify PORT Environment Variable:**
   - Check that `PORT` is defined in the environment
   - The server must read and use this variable

4. **Republish/Deploy:**
   - Click "Deploy" in the Replit dashboard
   - Wait for deployment to complete

5. **Verify Fix:**
   ```bash
   curl -I -v https://scholarship-admin-jamarrlmayes.replit.app/health
   ```
   - Expected: `HTTP/2 200`

---

## Acceptance Tests After Fix

| Test | Command | Expected Result |
|------|---------|-----------------|
| Health check | `curl -s -w '%{http_code}' -o /dev/null https://scholarship-admin-jamarrlmayes.replit.app/health` | `200` |
| Readiness | `curl -s -w '%{http_code}' -o /dev/null https://scholarship-admin-jamarrlmayes.replit.app/readyz` | `200` |
| Provider portal | `curl -s -w '%{http_code}' -o /dev/null https://scholarship-admin-jamarrlmayes.replit.app/` | `200` |

---

## Risk Notes

| Risk | Mitigation |
|------|------------|
| Data loss | No data migration required - just fix binding |
| Downtime | A6 is already down (404) |
| Rollback | Revert to last known good Git SHA if issues |

---

## Consecutive Failures

| Sprint | A6 Status | Result |
|--------|-----------|--------|
| RERUN-003 | 404 | ❌ UNVERIFIED |
| RERUN-004 | 404 | ❌ UNVERIFIED |
| RERUN-005 | 404 | ❌ UNVERIFIED |
| RERUN-006 | 404 | ❌ UNVERIFIED |
| **RERUN-007** | **404** | ❌ **UNVERIFIED** |

**A6 has failed for 5+ CONSECUTIVE SPRINTS.**

---

## Summary

| Component | Status | Action Required |
|-----------|--------|-----------------|
| A3 | ✅ 200 | None |
| A8 | ✅ 200 | None |
| **A6** | ❌ **404** | **REPUBLISH FROM REPLIT DASHBOARD** |

---

## Next Steps

1. **BizOps:** Execute A6 fix steps above (P0 CRITICAL)
2. **Re-run:** Sprint ZT3G-RERUN-008 after A6 returns 200
3. **Expected:** VERIFIED LIVE (TRUTH CONFIRMED)

---

**Evidence Location:** `tests/perf/evidence/raw_curl_evidence.txt`

*RUN_ID: CEOSPRINT-20260111-REPUBLISH-ZT3G-RERUN-007*
