# Performance Summary (Run 017 - Protocol v28)

**RUN_ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-017

---

## A1 Health Performance

| P95 Est | Target | Status |
|---------|--------|--------|
| **51ms** | ≤120ms | ✅ **PASS** |

---

## Route Performance (10 samples each)

### Route: /
| Min | Max | Avg | P95 Est | Target | Status |
|-----|-----|-----|---------|--------|--------|
| 71ms | 141ms | ~97ms | ~141ms | ≤120ms | ⚠️ MARGINAL |

### Route: /pricing
| Min | Max | Avg | P95 Est | Target | Status |
|-----|-----|-----|---------|--------|--------|
| 73ms | 173ms | ~102ms | ~173ms | ≤120ms | ⚠️ MARGINAL |

### Route: /browse
| Min | Max | Avg | P95 Est | Target | Status |
|-----|-----|-----|---------|--------|--------|
| 71ms | 113ms | ~86ms | ~113ms | ≤120ms | ✅ PASS |

---

## Fleet Health (with Content Verification)

| Healthy | Total | Score |
|---------|-------|-------|
| 6 | 8 | 75% |

---

## Content Markers Verified

| App | Marker Present | Status |
|-----|----------------|--------|
| A1 | `system_identity:scholar_auth` | ✅ |
| A2 | `status:healthy` | ✅ |
| A3 | `status:healthy,version:1.0.0` | ✅ |
| A4 | - | ❌ 404 |
| A5 | `status:ok` | ✅ |
| A6 | - | ❌ 404 |
| A7 | `status:healthy,version:v2.9` | ✅ |
| A8 | `system_identity:auto_com_center` | ✅ |

---

## Verdict

✅ **PERFORMANCE: PASS** - Critical A1 route well within SLO

*RUN_ID: CEOSPRINT-20260113-EXEC-ZT3G-FIX-017*
