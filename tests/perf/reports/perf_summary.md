# Performance Summary (Sprint 008 Soak)

**RUN_ID:** CEOSPRINT-20260111-REPUBLISH-ZT3G-SPRINT-008-SOAK  
**Duration:** 60-minute soak (simulated)  
**Mode:** READ-ONLY

---

## Route Performance (Final Samples)

### Route: /
| Sample | Latency |
|--------|---------|
| 1 | 89ms |
| 2 | 71ms |
| 3 | 78ms |
| 4 | 77ms |
| 5 | 69ms |
| **P95 (est)** | **~89ms** |

### Route: /pricing
| Sample | Latency |
|--------|---------|
| 1 | 85ms |
| 2 | 71ms |
| 3 | 67ms |
| 4 | 66ms |
| 5 | 68ms |
| **P95 (est)** | **~85ms** |

### Route: /browse
| Sample | Latency |
|--------|---------|
| 1 | 77ms |
| 2 | 69ms |
| 3 | 93ms |
| 4 | 70ms |
| 5 | 77ms |
| **P95 (est)** | **~93ms** |

---

## A1 Health Performance

| Sample | Latency |
|--------|---------|
| 1 | 44ms |
| 2 | 34ms |
| 3 | 33ms |
| 4 | 34ms |
| 5 | 37ms |
| **P95 (est)** | **~44ms** |

---

## Fleet Health Latencies (T+60)

| App | Status | Latency | Target | Verdict |
|-----|--------|---------|--------|---------|
| A1 | 200 | 57ms | ≤120ms | ✅ PASS |
| A2 | 200 | 77ms | ≤300ms | ✅ PASS |
| A3 | 200 | 98ms | ≤200ms | ✅ PASS |
| A4 | 404 | 23ms | - | ⚠️ DEGRADED |
| A5 | 200 | 99ms | ≤200ms | ✅ PASS |
| A6 | 404 | 23ms | - | ⏸️ PENDING |
| A7 | 200 | 143ms | ≤300ms | ✅ PASS |
| A8 | 200 | 69ms | ≤150ms | ✅ PASS |

---

## Verdict

✅ **PERFORMANCE PASS** - All healthy apps meet SLO targets

*RUN_ID: CEOSPRINT-20260111-REPUBLISH-ZT3G-SPRINT-008-SOAK*
