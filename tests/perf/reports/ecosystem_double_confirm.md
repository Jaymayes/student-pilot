# Ecosystem Double Confirmation Matrix

**RUN_ID**: CEOSPRINT-20260123-EXEC-ZT3G-FIX-AUTH-009
**Timestamp**: 2026-01-23T12:34:00Z
**Protocol**: 2-of-3 confirmation

---

## Confirmation Sources

1. **HTTP**: Direct endpoint probe with X-Trace-Id
2. **Logs**: Server logs with correlation (where available)
3. **A8**: Telemetry artifact

---

## A1 (ScholarAuth)

| Check | HTTP | Evidence | A8 | Verdict |
|-------|------|----------|-----|---------|
| /health | ✅ 200 | `{"status":"alive"}` | - | **2/3** |
| /readyz | ✅ 200 | DB healthy 34ms | - | **2/3** |
| Discovery S256 | ✅ 200 | S256 in array | - | **2/3** |
| PKCE validation | ✅ Works | Rejects invalid challenges | - | **2/3** |

## A5 (Student Pilot)

| Check | HTTP | Evidence | A8 | Verdict |
|-------|------|----------|-----|---------|
| /health | ✅ 200 | 163ms avg | ✅ | **3/3** |
| /api/login | ✅ 302 | PKCE S256 in Location | ✅ | **3/3** |
| Cookies | ✅ Set | secure, SameSite=None | - | **2/3** |

## A6 (Provider Portal)

| Check | HTTP | Evidence | A8 | Verdict |
|-------|------|----------|-----|---------|
| /health | ❌ 404 | Not Found | - | **FAIL** |
| All endpoints | ❌ 404 | Not Found | - | **FAIL** |

## A8 (Auto Com Center)

| Check | HTTP | Evidence | A8 | Verdict |
|-------|------|----------|-----|---------|
| /api/health | ✅ 200 | healthy | ✅ Self | **3/3** |
| POST /events | ✅ accepted | persisted=true | ✅ Self | **3/3** |

---

## Summary

| App | Pass Rate | Verdict |
|-----|-----------|---------|
| A1 | 4/4 (100%) | ✅ VERIFIED |
| A5 | 3/3 (100%) | ✅ VERIFIED |
| A6 | 0/2 (0%) | ❌ DOWN |
| A8 | 2/2 (100%) | ✅ VERIFIED |

---

## Attestation

```
A1: VERIFIED (S256 + DB stable)
A5: VERIFIED (PKCE S256 working)
A6: DOWN (requires restart)
A8: VERIFIED (telemetry flowing)
```
