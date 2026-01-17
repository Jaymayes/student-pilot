# Post-Republish Diff Report

**Run ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-027  
**Generated:** 2026-01-17T19:49:00.000Z

## Changes in This Sprint

### server/routes.ts
- Added FPR verification endpoints (lines 1875-2043)
- `GET /api/scholarships/config` - Read filter configuration
- `PATCH /api/scholarships/config` - Admin update configuration
- `GET /api/scholarships/fpr/baseline` - FPR baseline data
- `POST /api/scholarships/fpr/verify` - Run adversarial tests
- `POST /api/scholarships/search` - Scholarship search with hard filters
- Routes ordered BEFORE `:id` catch-all

### server/services/hardFilters.ts
- Missing data handling changed to "pass to soft scoring"
- Avoids false negatives for incomplete profiles

### server/services/recommendationEngine.ts
- Hard filters integrated BEFORE scoring loop
- Filter stats logging added

## Verdict

Changes successfully committed and deployed.
