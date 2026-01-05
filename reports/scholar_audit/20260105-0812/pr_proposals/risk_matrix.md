# Risk Matrix - Phase 2 Change Proposals

**Audit Date:** 2026-01-05T09:18Z
**Status:** PENDING HUMAN_APPROVAL_REQUIRED

---

## Summary

| Issue | Priority | Risk Level | Owner | Rollback Time | Data Loss Risk |
|-------|----------|------------|-------|---------------|----------------|
| A: A2 /ready endpoint | P1 | 🟢 LOW | A2 Team | < 5 min | None |
| B: A7 async ingestion | P1 | 🟡 MEDIUM | A7 Team | < 10 min | None (idempotent) |
| C: A8 stale banners | P2 | 🟢 LOW | A8 Team | < 5 min | None |
| D: Demo Mode revenue | P0 | 🟢 LOW | A8 Team | < 2 min | None |

---

## Detailed Risk Assessment

### Issue A: A2 /ready Endpoint

| Factor | Assessment |
|--------|------------|
| Code Complexity | Simple - single endpoint |
| Test Coverage | Easy to unit test |
| Dependency Impact | Improves orchestrator stability |
| Rollback | Remove endpoint, deploy prev version |
| Production Risk | None - additive change |

**Recommendation:** ✅ APPROVE

---

### Issue B: A7 Async Ingestion

| Factor | Assessment |
|--------|------------|
| Code Complexity | Medium - requires idempotency |
| Test Coverage | Needs performance + integration tests |
| Dependency Impact | May affect A8 telemetry timing |
| Rollback | Feature flag toggle |
| Production Risk | Low if idempotency verified |

**Recommendation:** ✅ APPROVE with staging validation

---

### Issue C: A8 Stale Banners

| Factor | Assessment |
|--------|------------|
| Code Complexity | Medium - multiple components |
| Test Coverage | Needs unit + integration tests |
| Dependency Impact | Improves operator experience |
| Rollback | Disable auto-clear flag |
| Production Risk | None - fixes false positives |

**Recommendation:** ✅ APPROVE

---

### Issue D: Demo Mode Revenue

| Factor | Assessment |
|--------|------------|
| Code Complexity | Low - UI toggle + query filter |
| Test Coverage | Visual testing recommended |
| Dependency Impact | None - display only |
| Rollback | Remove toggle, hide test data |
| Production Risk | None - test data clearly labeled |

**Recommendation:** ✅ APPROVE

---

## Rollback Readiness Checklist

| Issue | Rollback Command | Verified |
|-------|------------------|----------|
| A | `git revert <commit>` | ⏳ |
| B | `export ASYNC_INGESTION=false` | ⏳ |
| C | `export AUTO_CLEAR_INCIDENTS=false` | ⏳ |
| D | Remove toggle from UI | ⏳ |

---

## Approval Required

**HUMAN_APPROVAL_REQUIRED** to proceed with:
- [ ] Phase 2: Create PRs in respective repositories
- [ ] Phase 3: Staging validation with synthetic probes

---

## Signatures

- **Principal SRE:** Pending
- **CEO:** Pending
- **CFO:** Pending (for Demo Mode revenue visualization)
