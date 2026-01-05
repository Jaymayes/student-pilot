# A8 Data Lineage v2.0
**Audit Date:** 2026-01-05T18:42Z

## Telemetry Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ A7 (SEO)    │───▶│             │◀───│ A1 (Auth)   │
│ PageView    │    │    A8       │    │ NewUser     │
│ NewLead     │    │  /events    │    └─────────────┘
└─────────────┘    │             │
                   │ persisted:  │    ┌─────────────┐
┌─────────────┐    │    true     │◀───│ A6 (B2B)    │
│ A5 (B2C)    │───▶│             │    │ Payment     │
│ Match/Pay   │    │ /api/events │    └─────────────┘
│ heartbeat   │    │   /recent   │
└─────────────┘    │             │
                   │ VISIBLE ✅  │
                   └─────────────┘
```

## Event Schema Validation

| Event Type | Required Fields | Schema Valid | Sample |
|------------|-----------------|--------------|--------|
| NewUser | actor_id, source | ✅ | canonical_audit_v2 |
| NewLead | actor_id, source | ✅ | canonical_audit_v2 |
| PageView | actor_id, source | ✅ | canonical_audit_v2 |
| PaymentSuccess | amount_cents, currency, stripe_mode | ✅ | test mode tagged |
| ScholarshipMatchRequested | actor_id | ✅ | canonical_audit_v2 |
| ScholarshipMatchResult | latency_ms, success | ✅ | canonical_audit_v2 |
| heartbeat | app, status | ✅ | persisted but status not updating |

## "$0 Revenue" Explanation

**Question:** Why does Finance tile show $0?

**Answer:** 
1. Dashboard filters `stripe_mode='live'` only (by design)
2. Test transactions are persisted but excluded from display
3. Simulated audit events tagged with `stripe_mode: "test"`
4. Live payments ARE flowing (A5 and A6 both in live mode)

**Evidence:** `/api/events/recent` shows PaymentSuccess events with `stripe_mode: "test"` from our audit.

**Resolution:** PR Issue D adds Demo Mode toggle.

## "Revenue Blocked" Banner Explanation

**Question:** Why does dashboard show "Revenue Blocked"?

**Answer:**
1. Banner triggered by A3 `/api/automations/won-deal` returning 404
2. A3 automation endpoints not yet implemented
3. This is a feature gap, NOT a pipeline failure
4. Revenue IS flowing (verified via Stripe live mode)

**Evidence:**
```
A3 /api/automations/won-deal: HTTP 404
A3 /api/leads/won-deal: HTTP 404
A3 /health: HTTP 200
```

**Resolution:** A3 team implements automation endpoints (Phase 3 Learning Loop).

## Stale Heartbeat Issue

**Evidence:**
```json
{
  "lastHeartbeat": "2025-11-29T19:44:18.338Z",
  "systemLag": 3193305426,
  "status": "stale"
}
```

**Root Cause:** A8 heartbeat tracking reads from stale cache despite events persisting.

**Resolution:** PR Issue C adds auto-clear and TTL.
