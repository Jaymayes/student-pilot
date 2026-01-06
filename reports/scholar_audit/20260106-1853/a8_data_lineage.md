# A8 Command Center Data Lineage
**Scholar Ecosystem Audit**  
**Date:** 2026-01-06T18:55Z

## Data Flow Diagram

```
┌─────────┐    ┌─────────┐    ┌─────────┐
│   A5    │    │   A7    │    │   A3    │
│ Student │    │ SEO/Mkt │    │ Agent   │
└────┬────┘    └────┬────┘    └────┬────┘
     │              │              │
     │   /events    │   /events    │   /events
     └──────────────┼──────────────┘
                    │
                    ▼
              ┌─────────┐
              │   A8    │
              │ Command │
              │ Center  │
              └────┬────┘
                   │
     ┌─────────────┼─────────────┐
     │             │             │
     ▼             ▼             ▼
┌─────────┐  ┌─────────┐  ┌─────────┐
│ Finance │  │ B2B     │  │ SEO     │
│ Tile    │  │ Supply  │  │ Tile    │
└─────────┘  └─────────┘  └─────────┘
```

## Event Sources

| Source | Event Types | Protocol | Status |
|--------|-------------|----------|--------|
| A5 Student Pilot | page_view, payment_succeeded, ai_assist_used | v3.5.1 | ✅ Active |
| A7 Auto Page Maker | page_created, sitemap_updated, lead_captured | v3.5.1 | ✅ Active |
| A3 Scholarship Agent | lead_scored, cta_emitted, revenue_event | v3.5.1 | ⚠️ Blocked |
| A2 Scholarship API | data_sync, query_processed | v3.5.1 | ✅ Active |
| A6 Provider Register | provider_registered, contract_signed | v3.5.1 | ❌ Down |

## Event Schema (v3.5.1)

Required fields for all events:
```json
{
  "event_type": "string",
  "source": "string (app_id)",
  "timestamp": "ISO8601",
  "namespace": "string (production|simulated_audit)",
  "version": "string (v3.5.1)",
  "env": "string (production|development)"
}
```

## Data Sinks

| Sink | Purpose | Write Status |
|------|---------|--------------|
| PostgreSQL (Events) | Raw event storage | ✅ Active |
| Finance Tile | Revenue aggregation | ⚠️ $0 (no data) |
| B2B Supply Tile | Provider metrics | ❌ Blocked (A6 down) |
| SEO Tile | Marketing attribution | ✅ Active |
| SLO Tile | Performance metrics | ✅ Active |

## Namespace Isolation

| Namespace | Purpose | Isolation |
|-----------|---------|-----------|
| production | Live analytics | ✅ Separate |
| simulated_audit | Test/demo data | ✅ Filterable |
| test | Stripe test mode | ✅ Labeled |

## Telemetry Verification

Test event sent:
```json
{
  "event_type": "test_probe",
  "source": "audit",
  "namespace": "simulated_audit"
}
```

Response:
```json
{
  "accepted": true,
  "event_id": "evt_1767725723319_2ia314xv7",
  "persisted": true
}
```

## Data Quality Issues

| Issue | Severity | Impact |
|-------|----------|--------|
| Revenue events = 0 | High | Finance Tile empty |
| A6 events missing | High | B2B Supply Tile empty |
| Stale ARR data alerts | Medium | Monitoring noise |

## UTM Attribution Flow

```
A7 (Marketing) → A1 (Auth) → A5 (Student)
      │                           │
      └─── UTM params ────────────┘
                │
                ▼
         Stripe Metadata
                │
                ▼
         A8 (payment_succeeded with utmSource)
```

Status: ✅ Implemented (localStorage persists UTM across OIDC redirect)
