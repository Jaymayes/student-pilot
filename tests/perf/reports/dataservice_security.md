# DataService Security Specification

**Service**: scholar-dataservice  
**Version**: 2.0.0  
**Date**: 2026-01-21  
**Compliance**: FERPA, COPPA, CCPA

## Authentication

### JWT Bearer Token (Primary)

```
Authorization: Bearer <jwt_token>
```

- **Issuer**: scholar-auth (A1)
- **Algorithm**: RS256
- **Expiry**: 15 minutes (access), 7 days (refresh)
- **Required Claims**: sub, email, exp, iat

### API Key (M2M Service-to-Service)

```
X-API-Key: <api_key>
X-Service-ID: <service_identifier>
```

- **Use Case**: Internal microservice communication
- **Validation**: Compared against S2S_API_KEY secret
- **Scope**: Limited to authorized services

## Authorization Matrix

| Endpoint | Public | Student | Provider | Admin | System |
|----------|--------|---------|----------|-------|--------|
| /health | ✅ | ✅ | ✅ | ✅ | ✅ |
| /readyz | ✅ | ✅ | ✅ | ✅ | ✅ |
| /providers | ✅ | ✅ | ✅ | ✅ | ✅ |
| /scholarships | ✅ | ✅ | ✅ | ✅ | ✅ |
| /users | ❌ | ❌ | ❌ | ✅ | ✅ |
| /users/:id | ❌ | Self | ❌ | ✅ | ✅ |
| /uploads | ❌ | Self | Related | ✅ | ✅ |
| /ledgers | ❌ | ❌ | ❌ | R | ✅ |

## FERPA Protection

### Protected Routes

- GET /users/:id - Requires FERPA authorization for non-self access
- GET /uploads/:id - Requires FERPA authorization for student documents

### FERPA Guards

```typescript
// Middleware checks:
// 1. Caller has is_ferpa_covered flag on provider
// 2. OR caller has school_official role
// 3. All access logged with ferpa_access=true
```

### Access Logging

All FERPA-protected accesses are logged to audit_trail with:
- ferpa_access: true
- actor_id, actor_type, actor_ip
- entity_type, entity_id
- request_id, correlation_id

## Privacy-by-Default (CCPA/COPPA)

### User Privacy Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| doNotSell | boolean | false | CCPA opt-out |
| privacyMode | boolean | false | Enhanced privacy |

### Privacy Enforcement

1. **Minor Detection**: Users <18 auto-enabled for privacyMode
2. **GPC Honor**: Global Privacy Control header respected
3. **DNT Honor**: Do Not Track header respected
4. **Tracking Blocks**: Permissions-Policy blocks tracking pixels

## Audit Trail

### Logged Operations

All write operations (POST, PUT, DELETE) generate audit entries:

```json
{
  "action": "CREATE|UPDATE|DELETE",
  "entity_type": "user|provider|scholarship|upload|ledger",
  "entity_id": "uuid",
  "actor_id": "uuid",
  "changes": {"before": {}, "after": {}},
  "ferpa_access": false,
  "request_id": "X-Trace-Id header or generated UUID"
}
```

### Retention

- Standard audit entries: 7 years
- FERPA access logs: Permanent

## Rate Limiting

| Endpoint Type | Rate Limit |
|--------------|------------|
| Public reads | 100/minute |
| Authenticated | 500/minute |
| Write operations | 50/minute |
| Admin | 1000/minute |

## Headers

### Required Request Headers

| Header | Purpose |
|--------|---------|
| X-Trace-Id | Request correlation (optional, auto-generated if missing) |
| X-Idempotency-Key | Prevent duplicate writes (required for mutations) |

### Response Security Headers

- Strict-Transport-Security: max-age=31536000
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Content-Security-Policy: default-src 'self'
