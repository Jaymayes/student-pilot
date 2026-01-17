# Post-Republish Diff Report

**Run ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-035  
**Previous Run:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-031  
**Generated:** 2026-01-17T21:36:00.000Z

## Changes Since Previous Run

### Artifact Generation
- Scorched Earth executed: `rm -rf tests/perf/reports/* tests/perf/evidence/*`
- All artifacts regenerated with fresh timestamps
- New run ID applied to all traces

### External Workspace Status (Unchanged)

| App | Previous Status | Current Status | Change |
|-----|-----------------|----------------|--------|
| A1 | Healthy (200) | Healthy (200) | None |
| A3 | Healthy (200) | Healthy (200) | None |
| A5 | Healthy (200) | Healthy (200) | None |
| A6 | Conditional (/api/providers 404) | Conditional (/api/providers 404) | **BLOCKER PERSISTS** |
| A7 | Healthy (200) | Healthy (200) | None |
| A8 | Healthy (200) | Healthy (200) | None |

### Uptime Comparison

| App | Previous Uptime | Current Uptime | Delta |
|-----|-----------------|----------------|-------|
| A1 | 37531s | 40623s | +3092s (~52 min) |
| A3 | 58506s | 61598s | +3092s (~52 min) |
| A7 | 47784s | 50877s | +3093s (~52 min) |
| A8 | 62828s | 65921s | +3093s (~52 min) |

### New Artifacts Created (FIX-035)

```
tests/perf/reports/
├── a1_health.json
├── a3_health.json
├── a5_health.json
├── a6_health.json
├── a7_health.json
├── a8_health.json
├── a8_telemetry_audit.md
├── b2b_funnel_verdict.md
├── b2c_funnel_verdict.md
├── ecosystem_double_confirm.md
├── hitl_approvals.log
├── hitl_microcharge_runbook.md
├── manual_intervention_manifest.md
├── perf_summary.md
├── post_republish_diff.md
├── rl_observation.md
├── security_headers_report.md
├── seo_verdict.md
├── system_map.json
├── version_manifest.json
└── go_no_go_report.md

tests/perf/evidence/
├── raw_curl_evidence.txt
└── checksums.json
```

### A6 Blocker (Persists)

```
Previous: GET /api/providers → 404 NOT_FOUND
Current:  GET /api/providers → 404 NOT_FOUND

No change detected. Owner action still required.
```

### Manual Intervention Manifest Updates

- Added comprehensive copy-paste fix with 3 language options:
  - Node.js/Express
  - Python/FastAPI
  - Python/Flask
- Added republish steps
- Added verification curls

### Telemetry

| Run | Event ID | Persisted |
|-----|----------|-----------|
| FIX-031 | evt_1768682690404_dfuxr19ey | true |
| FIX-035 | evt_1768685782961_blo7a7ly8 | true |

### Performance

| Metric | FIX-031 | FIX-035 | Change |
|--------|---------|---------|--------|
| P95 (health) | 165ms | 200ms | +35ms |
| Success Rate | 100% | 100% | None |

## Summary

- External workspaces remain stable (all uptime increased)
- A6 /api/providers blocker persists (owner action required)
- All other endpoints continue to pass verification
- Attestation remains: **CONDITIONAL GO (ZT3G)**
