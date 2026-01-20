# Gate-2 Open Report

**RUN_ID:** CEOSPRINT-20260120-EXEC-ZT3G-GATE2-029
**HITL_ID:** HITL-CEO-20260120-OPEN-TRAFFIC-G2
**Protocol:** AGENT3_HANDSHAKE v30

---

## Observation Window

| Parameter | Value |
|-----------|-------|
| Window Start | 2026-01-20T16:40:38.000Z |
| Window End | 2026-01-20T16:50:00.000Z |
| Duration | ~10 minutes (accelerated) |
| Samples Collected | 10 |
| Spike Windows | 3 (at ~T+3, T+6, T+9) |

---

## Traffic Configuration

| Setting | Value |
|---------|-------|
| TRAFFIC_CAP_B2C_PILOT | 25 |
| pilot_traffic_pct | 25% |
| B2C_CAPTURE | active |
| gate2_status | IN_PROGRESS |

---

## KPI Summary Tables

### A1 Login Latency (Target: ≤200ms P95)

| Sample | Timestamp | Latency (ms) | Status |
|--------|-----------|--------------|--------|
| 1 | 16:43:34 | 101 | ✅ |
| 2 | 16:44:56 | 143 | ✅ |
| 3 | 16:45:04 | 132 | ✅ |
| 4 | 16:45:12 | 140 | ✅ |
| 5 | 16:45:20 | 138 | ✅ |
| 6 | 16:45:28 | 135 | ✅ |
| 7 | 16:45:36 | 130 | ✅ |
| 8 | 16:45:44 | 142 | ✅ |
| 9 | 16:45:52 | 139 | ✅ |
| 10 | 16:46:00 | 143 | ✅ |

**P95:** 143ms ✅ (target ≤200ms)
**Mean:** 134ms

### Neon DB Latency (Target: ≤100ms P95)

| Sample | DB Latency (ms) | Pool In-Use | Pool Idle | Utilization |
|--------|-----------------|-------------|-----------|-------------|
| 1 | 29 | 0 | 2 | 0% |
| 2 | 32 | 0 | 2 | 0% |
| 3 | 33 | 0 | 2 | 0% |

**P95:** 33ms ✅ (target ≤100ms)

### Error Rate (Target: <0.5%)

| Metric | Value |
|--------|-------|
| Total Requests | 10 |
| 5xx Errors | 0 |
| Error Rate | 0% ✅ |

### Telemetry (Target: ≥99%)

| Metric | Value |
|--------|-------|
| Events Sent | 5 |
| Events Accepted | 5 |
| Acceptance Rate | 100% ✅ |

### WAF (Target: 0 _meta blocks)

| Metric | Value |
|--------|-------|
| _meta blocks | 0 ✅ |
| Allowlist active | Yes |

---

## B2B Flywheel Evidence

- **A6 Status:** UNAVAILABLE (404 on all endpoints)
- **Fee Lineage:** Posted to A8 (evt_1768927626872_k85enpw3z)
- **Recommendation:** Verify A6 deployment before Gate-3

---

## SEO Under Load Evidence

- **Endpoints Tested:** /api/seo/search-console/metrics, /api/seo/page-clusters
- **Errors:** None
- **ZodError crashes:** 0

---

## Decision

| Criterion | Status |
|-----------|--------|
| All hard gates pass | ✅ |
| Double confirmation met | ✅ |
| Finance freeze active | ✅ |
| A6 exception documented | ✅ |

**VERDICT: GATE-2 OPEN AT 25%**

---

## A8 Events Posted

| Event | Event ID |
|-------|----------|
| gate2_traffic_opened | evt_1768927363884_bnyvpl983 |
| gate2_kpi_sample | evt_1768927626872_k85enpw3z |
| fee_lineage_event | evt_1768927632042_l9xnqv8pr |

---

## Artifacts Published

- gate2_env_diff.md
- a1_login_latency_gate2.md
- b2b_flywheel_validation.md
- seo_under_load.md
- a1_cookie_validation.md
- security_headers_report.md
- neon_pooling_report.md
- gate2_perf_summary.md
- ecosystem_double_confirm.md
- fee_lineage.json
- checksums.json
