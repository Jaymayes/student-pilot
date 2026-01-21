# A8 Telemetry Audit

**Run ID**: CEOSPRINT-20260121-EXEC-ZT3G-V2S2-FIX-027
**Generated**: 2026-01-21T22:55:00Z

## Configuration

| Setting | Value |
|---------|-------|
| Primary Endpoint | https://auto-com-center-jamarrlmayes.replit.app/events |
| Fallback Endpoint | https://scholarship-api-jamarrlmayes.replit.app/events |
| Local Spool | business_events table |
| Flush Interval | 10000ms |
| Batch Max | 100 |

## Recent Activity

- Events last hour (A2): 262
- Unique apps reporting: 5
- Last event: 2026-01-21T22:49:56Z

## Round-Trip Test

- POST /api/events: PASS (event accepted)
- GET /api/events: PASS (events retrievable)

## Fallback/Backfill Status

| Component | Status |
|-----------|--------|
| Primary (A8) | Online |
| Fallback (A2) | Online |
| Local Spool | 65 events (24h) |
| Backfill Job | Available |

## Verdict

**A8 Telemetry**: PASS

All telemetry paths operational. Local spool contains 65 events from earlier outage; backfill available on demand.
