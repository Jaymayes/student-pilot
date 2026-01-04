# A5 (student_pilot) Rollback Procedure
**Date:** 2026-01-04
**Pre-Change Commit:** Previous checkpoint before 7b5dd9d0ea

## Quick Rollback Commands

### Option 1: Replit Checkpoint Rollback (Recommended)

Use Replit's built-in checkpoint system to restore to the previous state.

### Option 2: Manual Rollback

#### 1. Revert Telemetry Endpoints

Edit `server/telemetry/telemetryClient.ts`:

```typescript
// Revert to legacy endpoints
const primaryEndpoint = 'https://auto-com-center-jamarrlmayes.replit.app/ingest';
const fallbackEndpoint = 'https://scholarship-api-jamarrlmayes.replit.app/telemetry/ingest';
```

#### 2. Revert Billing Rollout

```bash
# In Replit Secrets panel or via environment:
BILLING_ROLLOUT_PERCENTAGE=1
```

#### 3. Restart Application

```bash
npm run dev
```

---

## Verification After Rollback

```bash
# Verify telemetry using old endpoint
curl http://localhost:5000/api/probe/data
# Should show: "primary_endpoint": "...replit.app/ingest"

# Verify Stripe mode
curl http://localhost:5000/api/health
# Should show: "stripe": "mixed_mode" or similar
```

---

## When to Rollback

| Symptom | Action |
|---------|--------|
| A8 /events returns 5xx | Rollback telemetry to /ingest |
| Stripe payment failures in live mode | Rollback BILLING_ROLLOUT_PERCENTAGE to 1 |
| Both issues | Full rollback via checkpoint |

---

## Post-Rollback Monitoring

1. Check `/api/health` for system status
2. Check `/api/probes` for business probes
3. Monitor A8 dashboard for event receipt
4. Monitor Stripe dashboard for transaction status

---

## Contact

If issues persist after rollback, escalate to:
- A8 Team: Command Center telemetry issues
- A1 Team: Authentication/OIDC issues
- A3 Team: Automation endpoint issues
