# NLP Scoring Contract

**Service**: onboarding-orchestrator/nlpScoring  
**Version**: 2.0.0  
**Date**: 2026-01-21

## Overview

The NLP Scoring module analyzes uploaded documents to generate implicit_fit scores for scholarship matching.

## Interface

### scoreDocument(uploadId, documentType)

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| uploadId | string | UUID of the uploaded document |
| documentType | string | Type: 'transcript', 'resume', 'essay', 'letter' |

**Returns:**
```typescript
interface NlpScoreResult {
  score: number;           // 0.0 - 1.0 fit score
  confidence: number;      // 0.0 - 1.0 confidence in score
  suggestions: string[];   // Category suggestions
  processingTimeMs: number;
}
```

## Scoring Logic

### Current Implementation (Stub)

```typescript
// Mock scoring with random variation
const baseScore = 0.7 + (Math.random() * 0.2);
const confidence = 0.8 + (Math.random() * 0.15);
```

### Document Type Mapping

| Document Type | Suggestion Categories |
|--------------|----------------------|
| transcript | Academic Excellence, GPA-Based Awards |
| resume | Leadership Awards, Community Service |
| essay | Writing Excellence, Creative Awards |
| letter | Character-Based Scholarships |
| default | General Scholarships, Merit-Based Awards |

## Production Integration (Future)

### Endpoint Contract
```
POST /nlp/score
Content-Type: application/json

{
  "document_id": "uuid",
  "document_type": "transcript",
  "text_content": "extracted text..."
}
```

### Response Contract
```json
{
  "implicit_fit_score": 0.85,
  "confidence": 0.92,
  "categories": [
    {"name": "STEM", "score": 0.88},
    {"name": "Merit", "score": 0.82}
  ],
  "keywords": ["honor roll", "4.0 GPA", "calculus"],
  "processing_ms": 250
}
```

## Compliance

### Data Handling
- Document text is NOT persisted after scoring
- Only scores and metadata are stored
- PII redaction applied before NLP processing

### FERPA Considerations
- Transcripts are education records
- Scoring must follow school official exception rules
- All access logged in audit_trail

## Telemetry

Event: `DocumentScored`
```json
{
  "guestId": "uuid",
  "uploadId": "uuid",
  "score": 0.85,
  "confidence": 0.92,
  "processingTimeMs": 150,
  "documentType": "transcript"
}
```

## Performance SLAs

| Metric | Target |
|--------|--------|
| p50 latency | <200ms |
| p95 latency | <500ms |
| Error rate | <1% |
| Availability | 99.5% |
