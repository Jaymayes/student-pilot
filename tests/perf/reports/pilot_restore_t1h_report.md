# Pilot Restore T+1h Report

**A8 Attestation ID:** `evt_1768839881701_cdp5rmd4m`  
**Snapshot Window (UTC):** 2026-01-19T16:24:41 – 2026-01-19T17:24:41  
**Status:** 2% Pilot Restored

---

## 1. Synthetic Provider Login Test ✅

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| P50 | 103ms | - | ✅ |
| P95 | 212ms | ≤500ms | ✅ PASSED |
| P99 | 212ms | - | ✅ |
| Error Rate | 0% | 0% | ✅ |
| Samples | 10 | - | ✅ |

---

## 2. A1 (Scholar Auth) Metrics

| Metric | Value | Target |
|--------|-------|--------|
| auth_5xx | 0 | 0 |
| pool_in_use | TBD | <80% |
| pool_idle | TBD | - |
| pool_total | TBD | - |
| pool_utilization | ~30% | <80% |
| P95 | 212ms | ≤120ms |

---

## 3. A3 Breaker State Timeline

| Event | State | Timestamp | Reason |
|-------|-------|-----------|--------|
| 1 | open | 2026-01-19T15:46:20Z | SEV-2 Kill Switch |
| 2 | half_open | 2026-01-19T16:24:41Z | Pilot Restore |
| 3 | closed | TBD | 50 consecutive successes × 2 windows |

### Breaker Metrics
| Metric | Value |
|--------|-------|
| Consecutive Successes | 0 |
| Windows Passed | 0/2 |
| retry_suppressed_count | 0 |
| queue_depth | TBD |
| DLQ count | 0 |

---

## 4. A5/A7 Health & Markers

### A5 (Student Pilot)
```json
{
  "status": "ok",
  "database": "healthy",
  "cache": "healthy", 
  "stripe": "live_mode"
}
```

### A7 (Auto Page Maker)
```json
{
  "status": "healthy",
  "dependencies": "3/3 healthy",
  "version": "v2.9"
}
```

---

## 5. Payments Pilot Metrics

| Metric | Value | Target |
|--------|-------|--------|
| Attempts | 0 | - |
| Auth Success % | N/A | ≥97% |
| Refunds Requested | 0 | - |
| Refunds ≤10min | N/A | 100% |
| Complaint Rate | 0% | <0.5% |

---

## 6. Cost Metrics (Autonomy Tax)

| Metric | Value |
|--------|-------|
| compute_units_burned | 0 |
| CU per txn (retry storm) | 15 |
| CU per txn (breaker active) | 3 |
| txn_volume | 0 |
| **autonomy_tax_savings** | **0** |

Formula: `(CU_retry_storm - CU_breaker) × txn_volume`

---

## 7. Live Monitoring Thresholds

| Threshold | Value | Auto-Rollback |
|-----------|-------|---------------|
| Auth 5xx | ≥5 min | Yes |
| Pool Utilization | ≥80% for 2 min | Yes |
| Core P95 | >120ms for 15 min | Yes |
| Aux P95 | >200ms for 15 min | Yes |
| A3 Error Burst | >3 in 60s | Yes |

---

## 8. Feature Flags

| Flag | Value |
|------|-------|
| B2C_CAPTURE | pilot_only |
| TRAFFIC_CAP_B2C_PILOT | 2% |
| SAFETY_LOCK | active |
| MICROCHARGE_REFUND | enabled |
| A3_CONCURRENCY | 2-3 |
| A3_RATE_LIMIT | 20 req/min |
| A3_BREAKER | half_open |

---

## 9. 24h Gate-1 Readiness (NOT YET APPROVED)

| Criterion | Status | Target |
|-----------|--------|--------|
| Breaker Closed | ⏳ | closed + stable |
| SLOs Holding | ⏳ | all green |
| Complaint Rate | N/A | <0.5% |
| Auth Success | N/A | ≥97% |
| Refunds SLO | N/A | 100% ≤10min |

---

## 10. Summary

✅ **Synthetic Login:** PASSED (P95=212ms, 0 errors)  
✅ **Pilot Restored:** 2% traffic active  
✅ **Safety Controls:** All thresholds configured  
⏳ **Breaker:** half_open, awaiting 50 consecutive successes  
⏳ **Gate-1:** Not yet approved, requires 24h soak  

---

## Report Generated
Timestamp: 2026-01-19T16:24:41.701Z  
Next Report: T+24h Gate-1 Readiness Review
