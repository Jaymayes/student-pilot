# Post-Republish Diff Report

**Run ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-031  
**Generated:** 2026-01-17T20:44:00.000Z

## Changes Since Previous Run (ZT3G-FIX-027)

### Artifact Generation
- All stale artifacts purged per Scorched Earth protocol
- Fresh probes executed with cache-busting headers
- New run ID applied to all traces

### External Workspace Status Changes

| App | Previous Status | Current Status |
|-----|-----------------|----------------|
| A1 | Unknown/Blocked | Healthy |
| A3 | Unknown/Blocked | Healthy |
| A5 | Unknown/Blocked | Healthy |
| A6 | Unknown/Blocked | Conditional (missing endpoint) |
| A7 | Unknown/Blocked | Healthy |
| A8 | Unknown/Blocked | Healthy |

### New Artifacts Created

1. `manual_intervention_manifest.md` - Copy-paste fix for A6
2. `system_map.json` - Updated ecosystem status
3. `a1_health.json` through `a8_health.json` - Fresh health probes
4. `ecosystem_double_confirm.md` - Second confirmation matrix
5. `rl_observation.md` - Closed loop documentation

### A6 Blocker

```
Issue: GET /api/providers returns 404 NOT_FOUND
Status: Blocker for B2B funnel verification
Fix: Add GET /api/providers endpoint (see manifest)
```

## Verdict

External workspaces now reachable except A6 `/api/providers` endpoint.
Attestation upgraded from BLOCKED → CONDITIONAL GO.
