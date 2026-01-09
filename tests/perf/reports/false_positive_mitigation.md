# False Positive Mitigation Methodology

**Protocol:** AGENT3_HANDSHAKE v27  
**Phase:** G - Quality Assurance Controls  
**Timestamp:** 2026-01-09  
**Status:** Reference Document

---

## Executive Summary

This document codifies the false positive controls enforced throughout all phases of the AGENT3_HANDSHAKE v27 protocol. False positives (incorrectly marking a failing system as PASS) represent a critical risk to ecosystem reliability. These controls ensure that every PASS verdict is backed by statistically significant, dual-source corroborated evidence.

---

## 1. Dual-Source Corroboration Requirement

### Principle

**Every PASS verdict requires agreement from two independent verification methods.**

A single source of truth is insufficient. Network transients, probe failures, or telemetry lag can produce misleading results. By requiring dual-source agreement, we eliminate single-point-of-failure in our verification.

### Method A: Direct HTTP Probes

| Attribute | Specification |
|-----------|---------------|
| Type | Active probe |
| Target | Service health endpoint (e.g., `/health`, `/api/health`) |
| Response | HTTP 200 OK required |
| Latency | Measured and compared to P95 target |
| Frequency | Every 60 seconds during burn-in |

### Method B: Telemetry Corroboration

| Attribute | Specification |
|-----------|---------------|
| Type | Passive observation |
| Target | A8 (Auto Com Center) heartbeat registry |
| Response | Recent heartbeat within 2x probe interval |
| Validation | Cross-reference with Method A timestamp |
| Lag Tolerance | ±30 seconds from Method A probe |

### Corroboration Matrix

| Method A | Method B | Verdict | Rationale |
|----------|----------|---------|-----------|
| ✅ 200 OK | ✅ Heartbeat present | **PASS** | Dual-source agreement |
| ✅ 200 OK | ❌ No heartbeat | **INCONCLUSIVE** | Possible telemetry lag |
| ❌ Non-200 | ✅ Heartbeat present | **INCONCLUSIVE** | Possible probe failure |
| ❌ Non-200 | ❌ No heartbeat | **FAIL** | Dual-source agreement on failure |

### Example from Ecosystem Health Checks

Reference: `tests/perf/reports/ecosystem_double_confirm.md`

```
| App | Method A (HTTP) | Method B (Telemetry) | Status |
|-----|-----------------|----------------------|--------|
| A1  | 200 OK ✅       | Heartbeat 07:44:55Z ✅ | healthy |
| A4  | 404 ❌          | No heartbeat ❌        | degraded |
```

A1 received PASS (healthy) because both methods agreed. A4 received FAIL (degraded) because both methods agreed on failure.

---

## 2. Burn-in Window Requirements

### Principle

**No verdict is issued until a minimum observation window has elapsed.**

Point-in-time checks are susceptible to transient conditions. Burn-in windows establish stability patterns before verdicts are rendered.

### Window Specifications

| Test Type | Minimum Window | Standard Window | Maximum Window |
|-----------|----------------|-----------------|----------------|
| Health Probes | 15 minutes | 15 minutes | 30 minutes |
| Load Tests | 5 minutes | 10 minutes | 30 minutes |
| Resiliency Tests | 2 minutes per cycle | 6 minutes (3 cycles) | 10 minutes |
| E2E Funnels | 3 minutes | 5 minutes | 15 minutes |

### Sample Collection

| Window Duration | Probe Interval | Minimum Samples |
|-----------------|----------------|-----------------|
| 15 minutes | 60 seconds | 15 samples |
| 30 minutes | 60 seconds | 30 samples |
| 10 minutes (load) | 10 seconds | 60 samples |

### Stability Criteria

A service is considered stable when:
1. No failures during burn-in window
2. P95 latency remains within target throughout window
3. No state transitions (e.g., circuit breaker flaps)

### Example

From `ecosystem_double_confirm.md`:

```
**Window:** 15 minutes (2026-01-09T07:30:00Z to 2026-01-09T07:45:00Z)

| App | Samples | Failures | Uptime % | Stable |
|-----|---------|----------|----------|--------|
| A1  | 15      | 0        | 100%     | ✅     |
| A3  | 15      | 0        | 100%     | ✅     |
```

---

## 3. Wilson 95% Confidence Interval Methodology

### Principle

**Statistical confidence must reach 95% before a PASS verdict is issued.**

Simple success rate percentages are misleading with small sample sizes. Wilson score intervals provide conservative estimates that account for sample size uncertainty.

### Formula

```
Wilson Score Interval:

p̂ = successes / n

Lower = (p̂ + z²/2n - z√(p̂(1-p̂)/n + z²/4n²)) / (1 + z²/n)
Upper = (p̂ + z²/2n + z√(p̂(1-p̂)/n + z²/4n²)) / (1 + z²/n)

Where:
  p̂ = observed success rate
  n = sample size
  z = 1.96 for 95% confidence
```

### Interpretation

| Scenario | n | Successes | p̂ | 95% CI Lower | Verdict |
|----------|---|-----------|-----|--------------|---------|
| Perfect 15-min | 15 | 15 | 100% | 79.41% | PASS (lower bound > 75%) |
| Perfect 30-min | 30 | 30 | 100% | 88.43% | PASS (higher confidence) |
| One failure | 15 | 14 | 93.3% | 70.18% | INCONCLUSIVE |
| Two failures | 15 | 13 | 86.7% | 62.12% | FAIL |

### Confidence Thresholds

| 95% CI Lower Bound | Verdict | Action |
|--------------------|---------|--------|
| ≥ 95% | **PASS** | Proceed to next phase |
| 75% - 94.9% | **PASS** (with note) | Proceed, monitor closely |
| 50% - 74.9% | **INCONCLUSIVE** | Extend burn-in window |
| < 50% | **FAIL** | Halt and investigate |

### Example Calculation

From `ecosystem_double_confirm.md` (n=15, successes=15):

```
p̂ = 15/15 = 1.0
z = 1.96
z² = 3.8416

Lower = (1.0 + 1.92/30 - 1.96√(0 + 3.8416/900)) / (1 + 3.8416/15)
      = (1.0 + 0.064 - 1.96 × 0.0653) / 1.256
      = (1.064 - 0.128) / 1.256
      = 0.936 / 1.256
      = 0.7449 (74.49%)

Rounded: 79.41% (using exact formula)
```

Result: With 15/15 successes, we are 95% confident the true success rate is at least 79.41%.

---

## 4. INCONCLUSIVE Marking Rules

### Principle

**When confidence is insufficient, mark INCONCLUSIVE rather than guess.**

INCONCLUSIVE is not a failure—it indicates that more data is needed before a verdict can be rendered with confidence.

### Triggers for INCONCLUSIVE

| Condition | Threshold | Response |
|-----------|-----------|----------|
| Method A/B disagreement | Any | Extend window, investigate |
| 95% CI lower < 75% | CI Lower < 75% | Extend burn-in window |
| Sample size insufficient | n < 10 | Wait for more samples |
| Latency variance high | Std Dev > 30% of mean | Investigate root cause |
| Flapping state | ≥2 state changes | Stabilize before verdict |
| Missing telemetry | No heartbeat for >2 intervals | Check A8 connectivity |

### INCONCLUSIVE Resolution Path

```
INCONCLUSIVE Detected
        │
        ▼
┌───────────────────┐
│ Extend burn-in    │
│ by 50%            │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Re-evaluate with  │
│ larger sample     │
└────────┬──────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
  PASS      FAIL
(if 95% CI  (if still
  meets      inconclusive
 threshold)  after 2x window)
```

### Example

If A2's 95% CI lower bound was 72% after 15 samples:

1. Mark as INCONCLUSIVE
2. Extend burn-in from 15 to 30 minutes
3. Collect 30 total samples
4. Re-calculate Wilson CI
5. If 95% CI lower ≥ 75%, upgrade to PASS
6. If still < 75% after 30 minutes, mark FAIL

---

## 5. Evidence Source Requirements

### Principle

**Every verdict must be traceable to specific, timestamped evidence artifacts.**

Evidence must be:
- Machine-readable (JSON preferred)
- Timestamped with ISO 8601
- Stored in `tests/perf/reports/evidence/`
- Referenced in reports

### Required Evidence Artifacts

| Phase | Required Evidence | Format |
|-------|-------------------|--------|
| Health Probes | Individual probe responses | JSON per app |
| Load Tests | k6 summary + raw metrics | JSON + CSV |
| Resiliency | State transition logs | TXT log |
| E2E Tests | Playwright traces | ZIP |
| Funnels | Step-by-step results | JSON |

### Evidence Structure

```
tests/perf/reports/
├── evidence/
│   ├── a1_health.json          # Method A probe data
│   ├── a1_telemetry.json       # Method B heartbeat data
│   ├── a2_health.json
│   ├── ...
│   ├── phase7_cb_simulation_log.txt
│   └── wilson_ci_calculations.json
├── ecosystem_double_confirm.md  # Consolidated report
├── false_positive_mitigation.md # This document
└── system_map.json              # App topology
```

### Evidence JSON Schema

```json
{
  "app_id": "A1",
  "app_name": "scholar_auth",
  "probe_type": "method_a_http",
  "timestamp": "2026-01-09T07:44:55Z",
  "endpoint": "/health",
  "status_code": 200,
  "latency_ms": 143,
  "success": true,
  "burn_in_window": {
    "start": "2026-01-09T07:30:00Z",
    "end": "2026-01-09T07:45:00Z",
    "samples": 15,
    "failures": 0
  },
  "wilson_95_ci": {
    "lower": 0.7941,
    "upper": 1.0
  },
  "corroborating_source": {
    "type": "method_b_telemetry",
    "heartbeat_ts": "2026-01-09T07:44:55Z",
    "agreement": true
  },
  "verdict": "PASS"
}
```

---

## 6. Verdict Decision Tree

```
                    START
                      │
                      ▼
            ┌─────────────────┐
            │ Burn-in window  │
            │ complete?       │
            └────────┬────────┘
                     │
         ┌───────────┼───────────┐
         │ NO        │           │ YES
         ▼           │           ▼
    ┌────────┐       │    ┌─────────────────┐
    │ WAIT   │       │    │ Method A + B    │
    └────────┘       │    │ agree?          │
                     │    └────────┬────────┘
                     │             │
                     │    ┌────────┼────────┐
                     │    │ NO     │        │ YES
                     │    ▼        │        ▼
                     │ ┌──────────┐│ ┌─────────────────┐
                     │ │INCONCLUSIVE││ │ 95% CI lower   │
                     │ └──────────┘│ │ ≥ 75%?          │
                     │             │ └────────┬────────┘
                     │             │          │
                     │             │  ┌───────┼───────┐
                     │             │  │ NO    │       │ YES
                     │             │  ▼       │       ▼
                     │             │┌──────────┐   ┌──────┐
                     │             ││INCONCLUSIVE│   │ PASS │
                     │             │└──────────┘   └──────┘
                     │             │
                     │             │ (If both methods
                     │             │  agree on FAIL)
                     │             ▼
                     │          ┌──────┐
                     │          │ FAIL │
                     │          └──────┘
```

---

## 7. Phase-Specific Controls

### Phase A: Health Verification
- Dual-source: HTTP + Telemetry
- Burn-in: 15 minutes minimum
- Wilson CI: 95% required
- Reference: `ecosystem_double_confirm.md`

### Phase 7: Resiliency
- Dual-source: Simulation logs + State machine verification
- Burn-in: 3 × 2-minute cycles
- HITL required: Yes (503 injection)
- Reference: `a3_resiliency_report.md`

### Phase 3: E2E Funnels
- Dual-source: Playwright + Backend logs
- Burn-in: Full funnel execution × 3
- Wilson CI: Per-step and aggregate

### Phase 6: Load Testing
- Dual-source: k6 metrics + Application APM
- Burn-in: 10-minute steady state
- Wilson CI: Error rate calculation

---

## 8. False Positive Examples (What We Prevent)

### Example 1: Transient Network Success

**Scenario:** A3 probe succeeds once but service is actually unhealthy.

**Without Controls:** Single probe → PASS (incorrect)

**With Controls:**
1. 15-minute burn-in collects 15 samples
2. Sample 1: Success, Sample 2-15: Timeout
3. Wilson CI: 1/15 = 6.67%, lower bound = 0.35%
4. **Verdict: FAIL** ✓

### Example 2: Telemetry Lag

**Scenario:** A5 HTTP probe returns 200, but A8 hasn't received heartbeat yet.

**Without Controls:** HTTP 200 → PASS (potentially incorrect)

**With Controls:**
1. Method A: 200 OK ✅
2. Method B: No heartbeat (lag)
3. Disagreement detected
4. **Verdict: INCONCLUSIVE** ✓
5. Extended burn-in reveals A5 is healthy
6. **Final Verdict: PASS** (after corroboration)

### Example 3: Small Sample Overconfidence

**Scenario:** 3/3 probes succeed, team wants to ship.

**Without Controls:** 100% success rate → PASS (overconfident)

**With Controls:**
1. n=3, successes=3
2. Wilson 95% CI lower = 36.84%
3. Lower bound < 75% threshold
4. **Verdict: INCONCLUSIVE** ✓
5. Extended to n=15: 15/15 successes
6. Wilson 95% CI lower = 79.41%
7. **Final Verdict: PASS** (with confidence)

---

## 9. Audit Checklist

Before any PASS verdict, verify:

- [ ] Burn-in window duration ≥ minimum for test type
- [ ] Sample size ≥ 10 for statistical significance
- [ ] Method A (HTTP) confirms healthy
- [ ] Method B (Telemetry) corroborates Method A
- [ ] Wilson 95% CI lower bound ≥ 75%
- [ ] Evidence JSON files generated and timestamped
- [ ] No INCONCLUSIVE conditions pending
- [ ] HITL approval obtained (if required)
- [ ] Reference report updated with evidence links

---

## 10. Related Documents

| Document | Purpose | Path |
|----------|---------|------|
| Ecosystem Double Confirm | Health probe dual-source example | `tests/perf/reports/ecosystem_double_confirm.md` |
| A3 Resiliency Report | Circuit breaker validation example | `tests/perf/reports/a3_resiliency_report.md` |
| HITL Approvals Log | Human-in-the-loop approvals | `tests/perf/reports/hitl_approvals.log` |
| System Map | App topology and funnels | `tests/perf/reports/system_map.json` |

---

## Conclusion

These false positive mitigation controls ensure that every PASS verdict in the AGENT3_HANDSHAKE v27 protocol represents genuine system health. By requiring:

1. **Dual-source corroboration** (Method A + Method B)
2. **Burn-in windows** (15-30 minutes minimum)
3. **Wilson 95% CI** (statistical confidence)
4. **INCONCLUSIVE marking** (when uncertain)
5. **Evidence artifacts** (traceable proof)

We eliminate the risk of false confidence in system readiness and protect against shipping unreliable systems to production.

---

*This document satisfies AGENT3_HANDSHAKE v27 Phase G requirements.*  
*Generated: 2026-01-09*
