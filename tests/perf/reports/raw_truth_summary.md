# Raw Truth Summary (Run 025 - Protocol v30)

**RUN_ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-025  
**Protocol:** AGENT3_HANDSHAKE v30 (Functional Deep-Dive + Strict + Scorched Earth)

---

## Raw Truth Gate (A3/A6/A8)

| App | HTTP | Content Marker | Status |
|-----|------|----------------|--------|
| A3 | 200 | `status:healthy,version:1.0.0` | **PASS** |
| A6 | 404 | - | **FAIL** |
| A8 | 200 | `system_identity:auto_com_center` | **PASS** |

**Result:** 2-of-3 (A6 BLOCKED)

---

## Full Fleet Summary

| App | Name | HTTP | Marker | Status |
|-----|------|------|--------|--------|
| A1 | scholar_auth | 200 | `system_identity:scholar_auth` | HEALTHY |
| A2 | scholarship_api | 200 | `status:healthy` | HEALTHY |
| A3 | scholarship_agent | 200 | `status:healthy` | HEALTHY |
| A4 | scholarship_ai | 404 | - | DEGRADED |
| A5 | student_pilot | 200* | `status:ok` | DEPLOYMENT_PENDING |
| A6 | scholarship_admin | 404 | - | BLOCKED |
| A7 | auto_page_maker | 200 | `status:healthy,v2.9` | HEALTHY |
| A8 | auto_com_center | 200 | `system_identity:auto_com_center` | HEALTHY |

*A5 local is healthy; deployed URL pending/404

---

## Content Verification (Protocol v30)

All healthy apps have valid JSON content markers. A4/A6 return 404 (no markers possible).

*RUN_ID: CEOSPRINT-20260113-EXEC-ZT3G-FIX-025*
