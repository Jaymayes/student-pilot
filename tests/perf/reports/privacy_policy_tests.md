# Privacy Policy Test Cases

**Version**: 1.0.0  
**Date**: 2026-01-21

## Test Matrix

### GPC/DNT Header Tests

| Test | Input | Expected |
|------|-------|----------|
| GPC enabled | `Sec-GPC: 1` | doNotSell=true |
| GPC string | `Sec-GPC: true` | doNotSell=true |
| DNT enabled | `DNT: 1` | doNotTrack=true |
| Both enabled | GPC + DNT | Both flags true |
| Neither | No headers | Default settings |

### Age-Based Protection Tests

| Test | Age | Expected Restrictions |
|------|-----|----------------------|
| Child <13 | 12 | All tracking disabled |
| Young teen 13-15 | 14 | marketing_pixels, third_party_sharing |
| Older teen 16-17 | 17 | cross_site_tracking, location_tracking |
| Adult 18+ | 25 | No automatic restrictions |

### doNotSell Flag Tests

| Test | Scenario | Expected |
|------|----------|----------|
| Set via API | POST /users with doNotSell=true | Field persisted |
| Read via API | GET /users/:id | Field returned |
| Filter on doNotSell | Query users | Optional filter works |
| Auto-set for minors | User <18 signup | Automatically true |

### Privacy Mode Tests

| Test | Scenario | Expected |
|------|----------|----------|
| Enable privacy mode | PUT /users/:id | privacyMode=true persisted |
| Response filtering | GET with privacyMode | Email masked, PII redacted |
| Telemetry tagging | Event emission | privacy_mode=true in payload |

### FERPA Access Tests

| Test | Scenario | Expected |
|------|----------|----------|
| Non-covered access | Provider without FERPA flag | 403 Forbidden |
| Covered access | Provider with is_ferpa_covered | Access granted, logged |
| Self access | Student own records | Access granted |
| Audit logging | Any FERPA access | ferpa_access=true in audit_trail |

## Automated Test Coverage

### Endpoint Tests

```typescript
// Privacy header propagation
describe('Privacy Middleware', () => {
  it('sets Permissions-Policy header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['permissions-policy']).toContain('interest-cohort=()');
  });

  it('honors GPC header', async () => {
    const res = await request(app)
      .get('/api/auth/user')
      .set('Sec-GPC', '1');
    // Verify doNotSell is applied
  });
});
```

### Database Tests

```typescript
// doNotSell persistence
describe('User Privacy Fields', () => {
  it('persists doNotSell flag', async () => {
    const user = await createUser({ doNotSell: true });
    expect(user.doNotSell).toBe(true);
  });

  it('persists privacyMode flag', async () => {
    const user = await createUser({ privacyMode: true });
    expect(user.privacyMode).toBe(true);
  });
});
```

## Manual Verification

1. **GPC Test**: Send request with `Sec-GPC: 1`, verify doNotSell in response
2. **Minor Test**: Create user with birthdate <18 years ago, verify restrictions
3. **Audit Test**: Access FERPA data, verify audit_trail entry
4. **Header Test**: Check Permissions-Policy header blocks FLoC/Topics
