# Raw Truth Summary (Run 026 - Protocol v30)

**RUN_ID:** CEOSPRINT-20260113-VERIFY-ZT3G-026

## Fleet Status

| App | HTTP | Size | Marker | Status |
|-----|------|------|--------|--------|
| A1 | 200 | 3628B | system_identity | HEALTHY |
| A2 | 200 | 70B | status:healthy | HEALTHY |
| A3 | 200 | 251B | status:healthy,v1.0.0 | HEALTHY |
| A4 | 404 | 9B | - | DEGRADED |
| A5 | 200 | 4508B | status:ok + stripe.js | HEALTHY |
| A6 | 404 | 9B | - | BLOCKED |
| A7 | 200 | 583KB | 2908 URLs | HEALTHY |
| A8 | 200 | - | POST+GET | HEALTHY |

## Raw Truth Gate (A3/A6/A8)

| App | Target | Actual | Status |
|-----|--------|--------|--------|
| A3 | 200+marker | 200+marker | PASS |
| A6 | 200+marker | 404 | FAIL |
| A8 | 200+marker | 200+POST+GET | PASS |

**Gate:** PARTIAL (A6 blocked)

## Fleet Health

**6/8 deployed healthy (75%)**
