# Raw Truth Summary

**Run ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-037  
**Generated:** 2026-01-18T19:45:00.000Z

## Endpoint Verification Summary

| App | Endpoint | HTTP | Content Markers | Verdict |
|-----|----------|------|-----------------|---------|
| A1 | /health | 200 | status:ok, scholar_auth | **PASS** |
| A2 | /health | 200 | status:healthy, trace_id | **PASS** |
| A3 | /health | 200 | status:healthy, v1.0.0 | **PASS** |
| A4 | /health | 200 | status:healthy, scholarship_sage | **PASS** |
| A5 | /api/health | 200 | status:ok, stripe:live_mode | **PASS** |
| A6 | /health | 200 | status:ok, db:healthy | **PASS** |
| A6 | /api/providers | 200 | 3 providers, JSON array | **PASS** ✓ |
| A7 | /health | 200 | status:healthy, v2.9 | **PASS** |
| A7 | /sitemap.xml | 200 | Valid XML urlset | **PASS** |
| A8 | /api/health | 200 | status:healthy, db:healthy | **PASS** |
| A8 | POST /events | 200 | event_id, persisted | **PASS** |

## Content Verification

- No "Waking/Loading" placeholders detected
- All responses >50 bytes
- Valid JSON/XML structures confirmed
- Functional markers present in all responses

## Total: 11/11 checks PASS (8/8 apps verified)

## Verdict

**PASS** - All external URLs return HTTP 200 with valid content markers.
