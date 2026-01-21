# Onboarding First-Upload Flow Sequence

**Service**: onboarding-orchestrator  
**Version**: 2.0.0  
**Date**: 2026-01-21

## Flow Overview

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Signup    │───▶│ Create Guest│───▶│   Upload    │───▶│  NLP Score  │
│   (User)    │    │  (Step 1)   │    │  (Step 2)   │    │  (Step 3)   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                          │                  │                  │
                          ▼                  ▼                  ▼
                   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
                   │ GuestCreated│    │DocUploaded  │    │DocScored    │
                   │  (A8 Event) │    │  (A8 Event) │    │  (A8 Event) │
                   └─────────────┘    └─────────────┘    └─────────────┘
```

## Endpoints

### POST /api/v2/onboarding/guest

Creates a guest user account.

**Request:**
```json
{
  "email": "student@example.com"
}
```

**Response:**
```json
{
  "guest_id": "uuid",
  "email": "student@example.com"
}
```

**Telemetry Event:**
```json
{
  "event_type": "GuestCreated",
  "payload": {
    "guestId": "uuid",
    "emailHash": "sha256-hash",
    "source": "onboarding"
  }
}
```

### POST /api/v2/onboarding/upload

Uploads document metadata.

**Request:**
```json
{
  "guest_id": "uuid",
  "filename": "transcript.pdf",
  "mimeType": "application/pdf",
  "size": 102400,
  "type": "transcript"
}
```

**Response:**
```json
{
  "upload_id": "uuid",
  "guest_id": "uuid",
  "filename": "transcript.pdf"
}
```

**Telemetry Event:**
```json
{
  "event_type": "DocumentUploaded",
  "payload": {
    "guestId": "uuid",
    "uploadId": "uuid",
    "documentType": "transcript",
    "mimeType": "application/pdf"
  }
}
```

### POST /api/v2/onboarding/score

Runs NLP scoring on uploaded document.

**Request:**
```json
{
  "upload_id": "uuid"
}
```

**Response:**
```json
{
  "upload_id": "uuid",
  "score": 0.85,
  "confidence": 0.92,
  "suggestions": ["STEM Scholarships", "Merit-Based Awards"],
  "processingTimeMs": 150
}
```

**Telemetry Event:**
```json
{
  "event_type": "DocumentScored",
  "payload": {
    "guestId": "uuid",
    "uploadId": "uuid",
    "score": 0.85,
    "processingTimeMs": 150
  }
}
```

### POST /api/v2/onboarding/complete-flow

Orchestrates the entire flow in one request.

**Request:**
```json
{
  "email": "student@example.com",
  "documentMeta": {
    "filename": "transcript.pdf",
    "mimeType": "application/pdf",
    "size": 102400,
    "type": "transcript"
  }
}
```

**Response:**
```json
{
  "guestId": "uuid",
  "uploadId": "uuid",
  "score": {
    "score": 0.85,
    "confidence": 0.92,
    "suggestions": ["STEM Scholarships"]
  },
  "status": "completed",
  "traceId": "X-Trace-Id header value"
}
```

## Idempotency

All endpoints support idempotency via:
- `X-Idempotency-Key` header (UUIDv4)
- Duplicate requests with same key return cached response

## Retry/Backoff

Failed operations use exponential backoff:
- Initial delay: 100ms
- Max retries: 3
- Backoff multiplier: 2x

## Error Handling

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 400 | Validation error |
| 404 | Guest or upload not found |
| 500 | Internal error (logged, graceful degradation) |
