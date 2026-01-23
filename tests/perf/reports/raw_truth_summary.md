# Raw Truth Summary

**RUN_ID**: CEOSPRINT-20260123-EXEC-ZT3G-FIX-AUTH-009
**Timestamp**: 2026-01-23T12:34:00Z

---

## A1 ScholarAuth

| Probe | Result |
|-------|--------|
| /health | ✅ `{"status":"alive"}` |
| /readyz | ✅ `{"status":"ready","checks":{"database":{"status":"healthy"}}}` |
| /.well-known/openid-configuration | ✅ S256 in code_challenge_methods_supported |
| DB Circuit Breaker | ✅ CLOSED (0 failures) |

## A5 Student Pilot

| Probe | Result |
|-------|--------|
| / | ✅ HTTP 200 (152ms avg) |
| /pricing | ✅ HTTP 200 (138ms avg) |
| /browse | ✅ HTTP 200 (133ms avg) |
| /api/login | ✅ HTTP 302 with PKCE S256 |
| code_challenge | ✅ Present in redirect |
| code_challenge_method | ✅ S256 |

## A6 Provider Portal

| Probe | Result |
|-------|--------|
| / | ❌ HTTP 404 |
| /health | ❌ HTTP 404 |
| /api/providers | ❌ HTTP 404 |

## A3, A7, A8

| App | Probe | Result |
|-----|-------|--------|
| A3 | /health | ✅ HTTP 200 |
| A7 | /health | ✅ HTTP 200 |
| A8 | /api/health | ✅ HTTP 200 |
| A8 | POST /events | ✅ accepted |

---

## Verdict

**Raw Truth**: A1/A5 working, A6 down, A3/A7/A8 healthy.
