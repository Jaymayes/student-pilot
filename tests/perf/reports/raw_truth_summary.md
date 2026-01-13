# Raw Truth Summary (Golden Record - Run 028)

**RUN_ID:** CEOSPRINT-20260113-VERIFY-ZT3G-028

## Fleet Status

| App | HTTP | Marker | Status |
|-----|------|--------|--------|
| A1 | 200 | system_identity | HEALTHY |
| A2 | 200 | status:healthy | HEALTHY |
| A3 | 200 | status:healthy,v1.0.0 | HEALTHY |
| A4 | 404 | - | DEGRADED |
| A5 | 200 | status:ok + stripe.js | HEALTHY |
| A6 | 404 | - | BLOCKED |
| A7 | 200 | 2908 URLs | HEALTHY |
| A8 | 200 | POST+GET | HEALTHY |

## Raw Truth Gate

| App | Target | Actual | Status |
|-----|--------|--------|--------|
| A3 | 200+marker | 200+marker | PASS |
| A6 | 200+marker | 404 | FAIL |
| A8 | 200+POST | 200+POST | PASS |

**Gate:** PARTIAL (A6 blocked)

**Fleet:** 6/8 healthy (75%)
