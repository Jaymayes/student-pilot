# A5 (student_pilot) Rollback Procedure
**Date:** 2026-01-04
**Last Known Good Commit:** Before 7b5dd9d0ea

---

## Quick Rollback Commands

### Option 1: Replit Checkpoint Rollback (Recommended)

Use Replit's built-in checkpoint system to restore to the previous state. Click "View Checkpoints" to access previous versions.

---

### Option 2: Manual Rollback

#### Step 1: Revert Telemetry Endpoints

Edit `server/telemetry/telemetryClient.ts`:

```typescript
// Revert to legacy endpoints (if A8 re-enables /ingest)
const primaryEndpoint = 'https://auto-com-center-jamarrlmayes.replit.app/ingest';
const fallbackEndpoint = 'https://scholarship-api-jamarrlmayes.replit.app/telemetry/ingest';
```

#### Step 2: Revert Billing Rollout

In Replit Secrets panel:
```
BILLING_ROLLOUT_PERCENTAGE=1
```

#### Step 3: Revert Payment Probe (Optional)

Remove the payment probe from `server/routes.ts` (lines ~5532-5575) and revert the aggregate probes endpoint to the 3-probe version.

#### Step 4: Restart Application

```bash
npm run dev
```

---

## When to Rollback

| Symptom | Action |
|---------|--------|
| A8 /events returns 5xx | Rollback telemetry to /ingest |
| Stripe payment failures in live mode | Rollback BILLING_ROLLOUT_PERCENTAGE to 1 |
| Payment probe causing issues | Remove payment probe from routes.ts |
| Both issues | Full rollback via checkpoint |

---

## Verification After Rollback

```bash
# Verify telemetry using old endpoint
curl http://localhost:5000/api/probe/data
# Should show: "primary_endpoint": "...replit.app/ingest"

# Verify Stripe mode
curl http://localhost:5000/api/health
# Should show: "stripe": "mixed_mode" or similar

# Verify probes
curl http://localhost:5000/api/probes
# Should show 3 probes (auth, lead, data) if payment probe reverted
```

---

## Rollback Timeline

| Time | Action |
|------|--------|
| T+0 | Identify issue, document symptoms |
| T+5m | Execute rollback command(s) |
| T+10m | Restart workflow |
| T+15m | Verify rollback success |
| T+20m | Notify stakeholders |

---

## Post-Rollback Monitoring

1. Check `/api/health` for system status
2. Check `/api/probes` for business probes
3. Monitor A8 dashboard for event receipt
4. Monitor Stripe dashboard for transaction status
5. Check logs for any errors: `/tmp/logs/Start_application_*.log`

---

## Escalation

If issues persist after rollback:
- **A8 Team:** Command Center telemetry issues
- **A1 Team:** Authentication/OIDC issues
- **A3 Team:** Automation endpoint issues
- **A6 Team:** Provider Register issues

---

## Safe Rollback Guarantees

- Database state is not affected by these changes
- User data remains intact
- Session state preserved
- Credit balances unchanged
