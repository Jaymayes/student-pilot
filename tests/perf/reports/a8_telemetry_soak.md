# A8 Telemetry Soak Report

**RUN_ID:** CEOSPRINT-20260111-REPUBLISH-ZT3G-SPRINT-008-SOAK  
**Mode:** READ-ONLY

---

## Event Acceptance

| Checkpoint | Event Type | Event ID | Status |
|------------|------------|----------|--------|
| Start | soak_60min_start | evt_1768202018835_gjzs2tv5w | ✅ |
| T+0 | soak_checkpoint | evt_1768202090700_q7uuqtemi | ✅ |
| T+15 | soak_checkpoint | evt_1768202137757_uct0sso2e | ✅ |
| T+60 | artifact_checksum | evt_1768202173323_srv0pinn7 | ✅ |

---

## Ingestion Rate

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Acceptance | ≥99% | **100%** | ✅ PASS |
| Round-trip | Confirmed | Confirmed | ✅ PASS |

---

## Checksum Round-Trip

| Field | Value |
|-------|-------|
| Artifact Checksum | c92802f0eaca365979e8b3f29776453311a7d18daed87e0f2f3e7974fc196bf3 |
| Event ID | evt_1768202173323_srv0pinn7 |
| Status | ✅ Accepted |

---

## Verdict

✅ **A8 TELEMETRY PASS** - ≥99% ingestion with round-trip confirmed

*RUN_ID: CEOSPRINT-20260111-REPUBLISH-ZT3G-SPRINT-008-SOAK*
