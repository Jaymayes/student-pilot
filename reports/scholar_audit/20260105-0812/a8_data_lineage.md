# A8 Data Lineage - Scholar Ecosystem
**Audit Date:** 2026-01-05T08:12Z

## Telemetry Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ A7 (SEO)    │───▶│ A8 Command  │◀───│ A1 (Auth)   │
│ PageView    │    │   Center    │    │ NewUser     │
└─────────────┘    │             │    └─────────────┘
                   │  /events    │
┌─────────────┐    │             │    ┌─────────────┐
│ A5 (App)    │───▶│ persisted:  │◀───│ A6 (B2B)    │
│ Match/Pay   │    │   true      │    │ Payment     │
└─────────────┘    └─────────────┘    └─────────────┘
```

## Event Schema Validation

| Event Type | Required Fields | Schema Valid | Status |
|------------|-----------------|--------------|--------|
| NewUser | actor_id, source | ✅ | PASS |
| NewLead | actor_id, source | ✅ | PASS |
| PageView | actor_id, source | ✅ | PASS |
| PaymentSuccess | amount_cents, currency | ✅ | PASS |
| ScholarshipMatchRequested | actor_id | ✅ | PASS |
| ScholarshipMatchResult | latency_ms, success | ✅ | PASS |
| heartbeat | app, status | ✅ | PASS |
| identify | app_id, base_url | ✅ | PASS |

## Round-Trip Verification

| Test | Source | A8 Response | DB Evidence |
|------|--------|-------------|-------------|
| NewUser | scholar_auth | persisted:true | ✅ |
| NewLead | auto_page_maker | persisted:true | ✅ |
| PaymentSuccess | provider_register | persisted:true | ✅ |
| All 8 events | simulated_audit | 8/8 persisted | ✅ |

## Namespace Tagging

All simulated audit events tagged with:
- `"simulated": true`
- `"namespace": "simulated_audit"`

Production analytics NOT polluted.

## Known Issue: Dashboard Stale

A8 `/api/system/status` shows:
```json
{
  "lastHeartbeat": "2025-11-29T19:44:18.338Z",
  "status": "stale"
}
```

**Root Cause:** A8 internal polling mechanism not updating despite events being persisted.
**Impact:** Dashboard shows false incident banners.
**Resolution:** A8 team must fix heartbeat tracking.
