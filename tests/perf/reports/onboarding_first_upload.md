# Onboarding Orchestrator + First-Upload Pivot

**Run ID**: CEOSPRINT-20260121-EXEC-ZT3G-V2-S1-058  
**Timestamp**: 2026-01-21T08:35:00Z

## Overview

The onboarding orchestrator service manages the student signup flow with a focus on immediate value through document upload.

## Flow Diagram

```
[User Signup] → [Create "guest" record] → [Prompt Upload]
                                              ↓
                              [Transcript/Essay Upload]
                                              ↓
                              [DocumentUploaded Event → A8]
                                              ↓
                              [NLP Analyzer (async)]
                                              ↓
                              [Persist implicit_fit scores via DataService]
                                              ↓
                              [Scored Event → A8]
```

## Service: onboarding-orchestrator

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/onboarding/start | POST | Create guest record, return session |
| /api/onboarding/upload | POST | Accept transcript/essay upload |
| /api/onboarding/status | GET | Get onboarding completion status |
| /api/onboarding/scores | GET | Get implicit_fit scores |

## Event Flow

### 1. DocumentUploaded Event

```json
{
  "event_type": "DocumentUploaded",
  "app": "student_pilot",
  "app_id": "A5",
  "user_id": "<guest_id>",
  "document_type": "transcript|essay",
  "file_size_bytes": 12345,
  "timestamp": "2026-01-21T08:35:00Z"
}
```

### 2. Scored Event (after NLP analysis)

```json
{
  "event_type": "DocumentScored",
  "app": "student_pilot",
  "app_id": "A5",
  "user_id": "<guest_id>",
  "document_id": "<doc_id>",
  "implicit_fit_scores": {
    "academic_strength": 0.85,
    "financial_need_indicator": 0.72,
    "extracurricular_diversity": 0.68,
    "essay_quality": 0.79
  },
  "timestamp": "2026-01-21T08:35:05Z"
}
```

## NLP Analyzer Integration

The NLP analyzer extracts implicit fit scores from uploaded documents:

| Document Type | Extracted Signals |
|---------------|-------------------|
| Transcript | GPA, course rigor, grade trend, honors/AP |
| Essay | Writing quality, coherence, originality |

## DataService Integration

```typescript
// Persist scores via DataService
POST /api/v1/users/{userId}/implicit_fit_scores
{
  "document_id": "doc_123",
  "scores": {
    "academic_strength": 0.85,
    "financial_need_indicator": 0.72
  },
  "analyzed_at": "2026-01-21T08:35:05Z"
}
```

## Guest Record Schema

```typescript
interface GuestRecord {
  id: string;               // UUID
  created_at: Date;
  status: 'pending' | 'uploaded' | 'scored' | 'converted';
  documents_uploaded: number;
  implicit_fit_scores?: object;
  conversion_user_id?: string;  // Set when guest converts to full user
}
```

## First-Upload Pivot Strategy

1. **Immediate Value**: Show scholarship matches within 30 seconds of upload
2. **Friction Reduction**: Defer account creation until after first match display
3. **Engagement Hook**: Use implicit_fit scores to personalize match explanations

## A8 Telemetry Events

| Event | Trigger | Purpose |
|-------|---------|---------|
| onboarding_started | Signup | Track funnel entry |
| document_uploaded | Upload complete | Track engagement |
| document_scored | NLP complete | Track analysis success |
| first_match_shown | Match displayed | Track time-to-value |
| guest_converted | Full signup | Track conversion |

## Implementation Status

- [x] Flow design complete
- [x] Event schema defined
- [x] DataService integration specified
- [ ] NLP analyzer integration (depends on OpenAI)
- [ ] A8 event emission (infrastructure ready)

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first match | <30s | From upload to match display |
| Upload success rate | >95% | Successful uploads / attempts |
| Guest conversion rate | >50% | Converted / total guests |
| Score generation rate | >99% | Scored / uploaded |
