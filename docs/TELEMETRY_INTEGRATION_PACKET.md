# Telemetry Integration Packet for A5 (student_pilot)

## Overview
This document provides the configuration requirements for enabling telemetry from student_pilot (A5) to the central aggregator and fallback endpoints.

**App Identity:**
- APP_ID: `student_pilot`
- APP_BASE_URL: `https://student-pilot-jamarrlmayes.replit.app`
- Protocol: ONE_TRUTH v1.2

## Authentication Format

student_pilot uses per-app secret format for S2S authentication:

```
Authorization: Bearer student_pilot:<SHARED_SECRET>
```

Where `<SHARED_SECRET>` is the shared secret configured across the AGENT3 ecosystem.

## Request Headers

```
Content-Type: application/json
X-App-Id: student_pilot
X-Source-App: student_pilot
X-Request-Type: S2S
Authorization: Bearer student_pilot:<SHARED_SECRET>
```

## Event Envelope Format (Protocol ONE_TRUTH v1.2)

Events use a DUAL-FIELD approach for forward/backward compatibility:

```json
{
  "events": [
    {
      "id": "uuid-v4",
      "app": "student_pilot",
      "event_name": "payment_succeeded",
      "ts_iso": "2025-12-02T15:30:00.000Z",
      "data": {
        "amount_cents": 999,
        "product": "credits_10",
        "credits": 10,
        "intent_id": "pi_xxx",
        "user_id_hash": "sha256_hash",
        "app_base_url": "https://student-pilot-jamarrlmayes.replit.app"
      },
      "schema_version": "v1.2",
      "event_id": "uuid-v4",
      "event_type": "payment_succeeded",
      "ts": "2025-12-02T15:30:00.000Z",
      "app_id": "student_pilot",
      "properties": { "...same as data..." },
      "app_base_url": "https://student-pilot-jamarrlmayes.replit.app",
      "env": "prod",
      "_meta": {
        "protocol": "ONE_TRUTH",
        "version": "1.2"
      }
    }
  ],
  "app": "student_pilot",
  "app_id": "student_pilot",
  "app_base_url": "https://student-pilot-jamarrlmayes.replit.app",
  "source": "student_pilot",
  "timestamp": "2025-12-02T15:30:00.000Z"
}
```

## A5 Event Types and Command Center Tile Mapping

| Event Name | Tile | Data Fields |
|------------|------|-------------|
| `app_started` | SLO | version, uptime_sec, p95_ms, error_rate_pct, app_base_url |
| `app_heartbeat` | SLO | uptime_sec, p95_ms, error_rate_pct, queue_depth, app_base_url |
| `page_view` | SEO | page, utm_source, utm_medium, utm_campaign, referrer |
| `payment_succeeded` | Finance | amount_cents, product, credits, intent_id, user_id_hash |
| `credit_purchased` | Finance | credits, amount_cents, source, user_id_hash |
| `payment_failed` | Finance | reason, amount_cents, intent_id |
| `document_uploaded` | B2C | document_type, document_id, is_first, user_id_hash |
| `ai_assist_used` | Trust | tool, op, tokens_in, tokens_out, user_id_hash |
| `checkout_started` | Finance | amount_cents, product, user_id_hash |
| `application_started` | B2C | scholarship_id, user_id_hash |
| `application_submitted` | B2C | scholarship_id, application_id, user_id_hash |

## Configuration Requirements by Service

### A2 scholarship_api (Primary Telemetry Endpoint)

**Current Issue:** Returns 403 on S2S requests

**Required Configuration:**
1. Whitelist S2S Bearer tokens for `student_pilot` app
2. Accept auth format: `Bearer student_pilot:<SHARED_SECRET>`
3. Accept the dual-field event envelope format

**Endpoint:** `POST /api/analytics/events`

**Expected Success Response:**
```json
{
  "status": "ok",
  "received": 3,
  "processed": 3
}
```

### A4 scholarship_sage (Fallback Telemetry Endpoint)

**Current Issue:** Returns 401 "Telemetry not configured for app 'student_pilot'"

**Required Configuration:**
1. Add `student_pilot` to the allowed apps list in telemetry config
2. Accept auth format: `Bearer student_pilot:<SHARED_SECRET>`

**Endpoint:** `POST /api/analytics/events`

### A8 auto_com_center (Command Center)

**Current Issue:** Returns 404 on registration

**Required Configuration:**
1. Register `student_pilot` in the Command Center app registry
2. Entry should include:
   - app_id: `student_pilot`
   - app_base_url: `https://student-pilot-jamarrlmayes.replit.app`
   - role: `Student App + Payments`
   - tiles: Finance, SLO, B2C

**Registration Endpoint:** `POST /api/register`

## Sample curl Commands

### Test telemetry write to A2:
```bash
curl -X POST https://scholarship-api-jamarrlmayes.replit.app/api/analytics/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer student_pilot:<SHARED_SECRET>" \
  -H "X-App-Id: student_pilot" \
  -H "X-Source-App: student_pilot" \
  -H "X-Request-Type: S2S" \
  -d '{
    "events": [{
      "id": "test-uuid",
      "app": "student_pilot",
      "event_name": "app_heartbeat",
      "ts_iso": "2025-12-02T15:30:00.000Z",
      "data": {"uptime_sec": 3600, "p95_ms": 45, "error_rate_pct": 0.1},
      "schema_version": "v1.2",
      "event_id": "test-uuid",
      "event_type": "app_heartbeat",
      "ts": "2025-12-02T15:30:00.000Z",
      "app_id": "student_pilot",
      "properties": {"uptime_sec": 3600, "p95_ms": 45, "error_rate_pct": 0.1},
      "app_base_url": "https://student-pilot-jamarrlmayes.replit.app",
      "env": "prod",
      "_meta": {"protocol": "ONE_TRUTH", "version": "1.2"}
    }],
    "app": "student_pilot",
    "app_id": "student_pilot",
    "source": "student_pilot",
    "timestamp": "2025-12-02T15:30:00.000Z"
  }'
```

### Check telemetry status in student_pilot:
```bash
curl -X GET https://student-pilot-jamarrlmayes.replit.app/api/internal/telemetry/status \
  -H "Cookie: <session_cookie>"
```

## Verification Steps

After configuration is complete:

1. **Restart student_pilot** to trigger immediate `app_started` event
2. **Check A8 Command Center** within 60-120 seconds for:
   - SLO tile showing `app_started` and `app_heartbeat` events
   - Finance tile receiving payment events (when transactions occur)
3. **Verify backfill** - Locally stored events should sync automatically

## Contact

For questions about student_pilot telemetry implementation:
- App: student_pilot (A5)
- Role: Student App + Credits/Payments
- Primary tiles: Finance, SLO, B2C
