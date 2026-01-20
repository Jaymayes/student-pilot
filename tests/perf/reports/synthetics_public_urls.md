# Synthetics Public URLs Report

**CIR ID:** CIR-1768893338  
**Phase:** 3 - Health/Synthetic Monitors Repair  
**Date:** 2026-01-20T07:23:00.000Z

## Summary

All synthetic monitors configured to use public URLs only. Localhost probes are disabled.

## Configuration

```typescript
// server/config/featureFlags.ts
localhost_probes_disabled: true,
```

## Public URLs per Service

| App | App ID | PUBLIC_BASE_URL |
|-----|--------|-----------------|
| Student Pilot | A5 | https://student-pilot-jamarrlmayes.replit.app |
| Scholar Auth | A1 | https://scholar-auth-jamarrlmayes.replit.app |
| Scholarship API | A2 | https://scholarship-api-jamarrlmayes.replit.app |
| Scholarship Agent | A3 | https://scholarship-agent-jamarrlmayes.replit.app |
| Scholarship Sage | A4 | https://scholarship-sage-jamarrlmayes.replit.app |
| Provider Register | A6 | https://provider-register-jamarrlmayes.replit.app |
| Auto Page Maker | A7 | https://auto-page-maker-jamarrlmayes.replit.app |
| Auto Com Center | A8 | https://auto-com-center-jamarrlmayes.replit.app |

## Forbidden Patterns

The following patterns are BLOCKED:

- `localhost:*`
- `127.0.0.1:*`
- `::1:*`
- `0.0.0.0:*`

## Synthetic Monitor Configuration

```typescript
// All monitors MUST use:
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || serviceConfig.frontends.student;

// FORBIDDEN:
// const url = `http://localhost:${PORT}/health`;  // NO!
// const url = `http://127.0.0.1:5000/health`;     // NO!

// CORRECT:
const url = `${PUBLIC_BASE_URL}/health?t=${Date.now()}`;
```

## TLS Requirements

- Minimum: TLSv1.2
- Preferred: TLSv1.3
- Legacy/insecure transports: DISABLED

## Verification

```bash
curl -sS -H "Cache-Control: no-cache" \
  "https://student-pilot-jamarrlmayes.replit.app/health?t=$(date +%s)"
```

**Expected Response:**
```json
{
  "service": "student_pilot",
  "status": "healthy",
  "timestamp": "...",
  "version": "dev",
  "checks": {
    "database": "ok",
    "auth": "ok",
    "telemetry": "ok"
  }
}
```

## SHA256 Checksum

```
synthetics_public_urls.md: (to be computed)
```
