# URGENT: SENTRY_DSN Format Fix Required

**Priority:** BLOCKING (Infra DRI - T+15 min deadline)  
**App:** student_pilot  
**Issue Date:** 2025-11-05T15:40:00Z  
**Owner:** Infra DRI

---

## Problem

The SENTRY_DSN environment variable contains an invalid format that causes Sentry initialization warnings.

**Current Value (INVALID):**
```
SENTRY_DSN=dsn: https://9023cf8e1d72b9df9a6eb010c7968b7c@o4510308661723136.ingest.us.sentry.io/4510308666310656
```

**Error in Logs:**
```
Invalid Sentry Dsn: dsn: https://9023cf8e1d72b9df9a6eb010c7968b7c@o4510308661723136.ingest.us.sentry.io/4510308666310656
```

---

## Required Fix

Remove the `dsn: ` prefix. Sentry expects only the raw URL.

**Required Value (CORRECT):**
```
SENTRY_DSN=https://9023cf8e1d72b9df9a6eb010c7968b7c@o4510308661723136.ingest.us.sentry.io/4510308666310656
```

---

## Impact

**Current:**
- ✅ Sentry is initializing despite warning
- ✅ Error tracking appears functional
- ⚠️ Validation warning in logs
- ⚠️ Potential impact on production monitoring

**After Fix:**
- ✅ Clean initialization without warnings
- ✅ Full Sentry validation passing
- ✅ Production-grade observability confirmed

---

## Verification Steps

1. Update SENTRY_DSN secret to remove `dsn: ` prefix
2. Restart student_pilot workflow
3. Verify log shows: `✅ Sentry initialized for student_pilot (error + performance monitoring)`
4. Confirm NO warning: `Invalid Sentry Dsn`
5. Test error capture with sample exception

---

## Contingency Plan (from CEO Directive)

If production DSN not ready by T+15 min SLA:
1. Inject staging DSN per Contingency A
2. Swap to production DSN within 24 hours
3. No code changes required

---

## CEO Directive Compliance

Per Gate A/B executive decision:
- **SLA:** 15 minutes from directive issue
- **Requirement:** SENTRY_DSN standardized to raw URL format across all 8 apps
- **Owner:** Infra DRI
- **Evidence Required:** App boot logs showing "Sentry initialized" with clean validation

---

## Related Evidence

- Gate A Status: `e2e/gate_a_status_student_pilot.md`
- Sentry Integration: `e2e/sentry_integration_evidence.md`
- Config Manifest: `e2e/config_manifest.json`
