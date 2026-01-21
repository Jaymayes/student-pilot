# DataService Design Document

**Run ID**: CEOSPRINT-20260121-EXEC-ZT3G-V2-S1-058  
**Service Name**: scholar-dataservice  
**Version**: 1.0.0  
**Date**: 2026-01-21  
**Status**: Design Phase (V2 Sprint-1)

## Overview

The `scholar-dataservice` is a centralized data access layer for the Scholar AI Advisor ecosystem. It provides RESTful APIs for managing core domain objects with built-in authentication, authorization, FERPA compliance, and audit capabilities.

## Service Configuration

| Parameter | Value |
|-----------|-------|
| Service Name | scholar-dataservice |
| Bind Address | 0.0.0.0:$PORT |
| Protocol | HTTPS (TLS 1.3) |
| API Version | v1 |
| Base Path | /api/v1 |

## Core Domain Objects

### 1. Users
Primary entity for authenticated users (students, providers, administrators).

| Field | Type | FERPA | Description |
|-------|------|-------|-------------|
| id | UUID | No | Primary identifier |
| email | string | Yes | User email address |
| firstName | string | Yes | First name |
| lastName | string | Yes | Last name |
| profileImageUrl | string | No | Avatar URL |
| birthdate | timestamp | Yes | Date of birth (COPPA) |
| ageVerified | boolean | No | Age verification status |
| subscriptionStatus | enum | No | Premium subscription state |
| stripeCustomerId | string | No | Payment reference |
| createdAt | timestamp | No | Creation timestamp |
| updatedAt | timestamp | No | Last modification |

### 2. Providers
Scholarship provider organizations.

| Field | Type | FERPA | Description |
|-------|------|-------|-------------|
| id | UUID | No | Primary identifier |
| name | string | No | Organization name |
| type | enum | No | provider_type (school, foundation, corporate) |
| ein | string | No | Tax ID (encrypted) |
| contactEmail | string | No | Primary contact |
| isVerified | boolean | No | Verification status |
| is_ferpa_covered | boolean | No | FERPA coverage flag |
| createdAt | timestamp | No | Creation timestamp |
| updatedAt | timestamp | No | Last modification |

### 3. Scholarships
Scholarship opportunity records.

| Field | Type | FERPA | Description |
|-------|------|-------|-------------|
| id | UUID | No | Primary identifier |
| title | string | No | Scholarship title |
| organization | string | No | Provider name |
| amount | integer | No | Award amount (cents) |
| description | text | No | Full description |
| requirements | array | No | Eligibility requirements |
| eligibilityCriteria | jsonb | No | Structured criteria |
| deadline | timestamp | No | Application deadline |
| applicationUrl | string | No | External link |
| isActive | boolean | No | Active status |
| providerId | UUID | No | Provider reference |
| createdAt | timestamp | No | Creation timestamp |
| updatedAt | timestamp | No | Last modification |

### 4. Uploads (Documents)
Student document storage references.

| Field | Type | FERPA | Description |
|-------|------|-------|-------------|
| id | UUID | No | Primary identifier |
| studentId | UUID | Yes | Student reference |
| type | string | Yes | Document type |
| title | string | No | Display name |
| fileName | string | No | Original filename |
| filePath | string | No | Storage path |
| fileSize | integer | No | Size in bytes |
| mimeType | string | No | Content type |
| category | string | No | Organization category |
| uploadedAt | timestamp | No | Upload timestamp |

### 5. Ledgers (Credit Ledger)
Immutable financial transaction log.

| Field | Type | FERPA | Description |
|-------|------|-------|-------------|
| id | UUID | No | Primary identifier |
| userId | UUID | No | User reference |
| type | enum | No | Transaction type |
| amountMillicredits | bigint | No | Amount (millicredits) |
| balanceAfterMillicredits | bigint | No | Post-tx balance |
| referenceType | enum | No | Source system |
| referenceId | string | No | External reference |
| metadata | jsonb | No | Additional context |
| createdAt | timestamp | No | Transaction timestamp |

## Authentication & Authorization

### JWT Authentication (Primary)
```
Authorization: Bearer <jwt_token>
```

- **Issuer**: scholar-auth (A1)
- **Algorithm**: RS256
- **Expiry**: 15 minutes (access), 7 days (refresh)
- **Claims**: sub, email, roles[], permissions[], exp, iat

### API Key Authentication (M2M)
```
X-API-Key: <api_key>
X-Service-ID: <service_identifier>
```

- **Use Case**: Service-to-service communication
- **Rotation**: 90-day mandatory rotation
- **Scope**: Limited to specific endpoints

### Authorization Matrix

| Role | Users | Providers | Scholarships | Uploads | Ledgers |
|------|-------|-----------|--------------|---------|---------|
| student | R (self) | - | R | CRUD (self) | R (self) |
| provider | R (org) | R/U (self) | CRUD (own) | R (apps) | - |
| school_official | R (covered) | R | R | R (covered) | - |
| admin | CRUD | CRUD | CRUD | CRUD | R |
| system | CRUD | CRUD | CRUD | CRUD | CRUD |

## Route Segregation

### Consumer Routes (Students/General)
Base path: `/api/v1/consumer`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /scholarships | List active scholarships |
| GET | /scholarships/:id | Get scholarship details |
| GET | /profile | Get own profile |
| PUT | /profile | Update own profile |
| GET | /documents | List own documents |
| POST | /documents | Upload document |
| DELETE | /documents/:id | Delete own document |
| GET | /ledger | View credit history |

### School Official Routes (FERPA-Covered)
Base path: `/api/v1/school`

Requires: `is_ferpa_covered: true` on provider + `school_official` role

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /students | List covered students |
| GET | /students/:id | Get student details (FERPA) |
| GET | /students/:id/documents | Access student documents |
| GET | /students/:id/applications | View applications |
| POST | /verification | Submit FERPA verification |

### Provider Routes
Base path: `/api/v1/provider`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /scholarships | List own scholarships |
| POST | /scholarships | Create scholarship |
| PUT | /scholarships/:id | Update scholarship |
| DELETE | /scholarships/:id | Deactivate scholarship |
| GET | /applications | View received applications |
| PUT | /applications/:id/status | Update application status |

### Admin Routes
Base path: `/api/v1/admin`

Requires: `admin` role + MFA verification

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /users | List all users |
| GET | /users/:id | Get user details |
| PUT | /users/:id | Update user |
| DELETE | /users/:id | Soft-delete user |
| GET | /providers | List all providers |
| POST | /providers/:id/verify | Verify provider |
| GET | /ledger/audit | Full ledger audit trail |

## FERPA Compliance

### is_ferpa_covered Flag

The `is_ferpa_covered` boolean flag on providers determines access to student education records:

```typescript
interface FerpaContext {
  is_ferpa_covered: boolean;      // Provider has FERPA obligations
  ferpa_agreement_date: string;   // Date of agreement
  school_official_role: boolean;  // User has school official designation
  legitimate_interest: string;    // Purpose of access
}
```

### Data Access Rules

1. **FERPA-Covered Access**: Providers with `is_ferpa_covered: true` may access student education records under the "school official" exception when there is a legitimate educational interest.

2. **Audit Requirements**: All FERPA data access MUST be logged with:
   - Accessor identity (user_id, provider_id)
   - Accessed records (student_id, record_type)
   - Purpose/justification
   - Timestamp
   - IP address

3. **Consent Override**: Students may grant explicit consent for non-covered providers to access specific records.

## Audit Trail Specification

### Write Operations Audit

All create, update, and delete operations generate audit entries:

```json
{
  "audit_id": "uuid",
  "timestamp": "2026-01-21T12:00:00Z",
  "action": "CREATE|UPDATE|DELETE",
  "entity_type": "user|provider|scholarship|upload|ledger",
  "entity_id": "uuid",
  "actor_id": "uuid",
  "actor_type": "user|service|system",
  "actor_ip": "192.168.1.1",
  "changes": {
    "before": {},
    "after": {}
  },
  "request_id": "uuid",
  "correlation_id": "uuid",
  "ferpa_access": false,
  "metadata": {}
}
```

### Retention Policy

| Audit Type | Retention | Archive |
|------------|-----------|---------|
| FERPA Access | 7 years | Cold storage |
| Financial (Ledger) | 7 years | Cold storage |
| General Writes | 2 years | Cold storage |
| Read Access | 90 days | None |

## Health Endpoints

### Liveness Probe
```
GET /health
Response: 200 OK
{
  "status": "healthy",
  "timestamp": "2026-01-21T12:00:00Z"
}
```

### Readiness Probe
```
GET /readyz
Response: 200 OK
{
  "status": "ready",
  "checks": {
    "database": "ok",
    "cache": "ok",
    "auth": "ok"
  },
  "timestamp": "2026-01-21T12:00:00Z"
}
```

## Service Markers

```json
{
  "service": "scholar-dataservice",
  "version": "1.0.0",
  "environment": "production|staging|development",
  "region": "us-west-2",
  "instance_id": "uuid",
  "build_sha": "abc123",
  "deploy_timestamp": "2026-01-21T12:00:00Z"
}
```

## Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "request_id": "uuid",
    "details": {}
  }
}
```

### Standard Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid authentication |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request payload |
| FERPA_VIOLATION | 403 | FERPA access denied |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

## Rate Limiting

| Tier | Requests/min | Burst |
|------|--------------|-------|
| Anonymous | 10 | 20 |
| Authenticated | 100 | 200 |
| Provider | 500 | 1000 |
| Service (M2M) | 5000 | 10000 |

## Next Steps

- [ ] OpenAPI specification finalization
- [ ] Database migration scripts
- [ ] Authentication integration with A1 (scholar-auth)
- [ ] Audit log infrastructure setup
- [ ] FERPA compliance testing
- [ ] Performance benchmarking
