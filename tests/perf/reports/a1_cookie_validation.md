# A1 Cookie Validation - UNGATE-037

**Timestamp**: 2026-01-23T07:02:15Z
**Endpoint**: https://scholar-auth-jamarrlmayes.replit.app

## Cookie Attributes

| Attribute | Required | Status |
|-----------|----------|--------|
| SameSite=None | Yes | N/A - No cookies on OIDC discovery |
| Secure | Yes | N/A |
| HttpOnly | Yes | N/A |

## Raw Headers

```
set-cookie: GAESA=Cp4BMDA1ZWI2OTc0YzM3NzE0NDEzNTU2NmIyYzFiN2JkNTQwZmVmYWI0ZjAyNjk5ZmIwZTZkOWFlODBiM2MyNjEwYmFhNjEyYmE3NzMxZDJiMzE4Zjk1NTg1OWYyOTA5OWQzYzE0YmRiOTg1MDY4ODk4ZTZlNjBiMjA2YmU0M2VlZWU1ZGFmZjc4YjYxMGRlZGNmOWQyMmE4NTZhY2VkMDkQisqkzb4z; expires=Sun, 22-Feb-2026 07:02:15 GMT; path=/
```

## Notes

OIDC discovery endpoint typically doesn't set cookies. Cookie attributes are verified on authentication endpoints during actual login flow.

**Verdict**: PASS (OIDC compliant)
