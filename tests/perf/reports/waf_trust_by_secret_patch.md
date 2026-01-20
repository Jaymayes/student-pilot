# WAF Trust-by-Secret Patch
**RUN_ID**: CEOSPRINT-20260120-EXEC-ZT3G-GATE2-STABILIZE-033
**Timestamp**: 2026-01-20T19:00:00Z

## Summary
Implemented Trust-by-Secret bypass for authenticated S2S telemetry requests to eliminate WAF false positives.

## Changes Made

### server/config/wafConfig.ts
- Added `35.184.0.0/13` to TRUSTED_INGRESS_CIDRS (GCP us-central1 primary)
- Added `S2S_TELEMETRY_CONFIG` with:
  - `ALLOWED_PATHS`: /api/telemetry/ingest, /telemetry/ingest, /events, /api/events
  - `SECRET_HEADER`: x-scholar-shared-secret
  - `SECRET_ENV_VAR`: SHARED_SECRET
- Added `SQLI_PATTERNS`: Strong patterns only (UNION/SELECT, OR 1=1, DROP, DELETE, xp_cmdshell, etc.)
- Removed overbroad SQLi regex that matched encoded quotes (\x27|\x22)
- Added `shouldBypassSqliInspection()` function - checks all 3 conditions
- Added `detectSqli()` function - strong pattern matching only

### server/middleware/wafMiddleware.ts
- Added Trust-by-Secret bypass check before SQLi inspection
- Logs `[WAF] BYPASS S2S` for authenticated telemetry
- Logs `[WAF] BLOCK` with pattern for SQLi detections
- Extracted `ensureTraceHeaders()` for DRY

## Bypass Conditions (ALL must be true)
1. Path in ALLOWED_PATHS
2. x-scholar-shared-secret header matches SHARED_SECRET env var
3. Client IP in TRUSTED_INGRESS_CIDRS

## Security Maintained
- Prototype pollution vectors blocked: __proto__, constructor, prototype
- Strong SQLi patterns still detected for untrusted requests
- Underscore key allowlist: _meta, _trace, _correlation
