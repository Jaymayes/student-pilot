# Rollback Readiness Report
**Date:** 2026-01-05T21:22Z

---

## Feature Flags Summary

All proposed changes are gated behind feature flags for instant rollback:

| Issue | App | Feature Flag | Default |
|-------|-----|--------------|---------|
| A | A2 | `ENABLE_READY_ENDPOINT` | `true` |
| B | A7 | `ASYNC_INGESTION` | `true` |
| C | A8 | `AUTO_CLEAR_INCIDENTS` | `true` |
| D | A8 | `DEMO_MODE_ENABLED` | `true` |

---

## Rollback Procedures

### Issue A: A2 /ready Endpoint

**Instant Rollback:**
```bash
export ENABLE_READY_ENDPOINT=false
pm2 restart a2
```

**Orchestrator Fallback:**
When /ready returns 404, orchestrator uses /health as fallback.

**Full Rollback:**
```bash
git revert <commit-sha>
git push origin main
```

---

### Issue B: A7 Async Ingestion

**Instant Rollback:**
```bash
export ASYNC_INGESTION=false
pm2 restart a7
```

**Queue Drain (if needed):**
```bash
# Check queue depth before rollback
redis-cli llen ingest_queue

# Wait for workers to drain, then disable
```

**Full Rollback:**
```bash
git revert <commit-sha>
```

---

### Issue C: A8 Stale Banners

**Instant Rollback:**
```bash
export AUTO_CLEAR_INCIDENTS=false
pm2 restart a8
```

**Manual Clear Still Available:**
Admin can use `/api/admin/clear-incidents` even when auto-clear is disabled.

---

### Issue D: A8 Demo Mode

**Instant Rollback:**
```bash
# Backend
export DEMO_MODE_ENABLED=false
pm2 restart a8

# Frontend
# Set VITE_DEMO_MODE_ENABLED=false and rebuild
```

**UI Fallback:**
Toggle component doesn't render when flag is off. Dashboard shows only live data.

---

## Rollback Test Evidence

| Flag | Tested | Result |
|------|--------|--------|
| ENABLE_READY_ENDPOINT=false | Spec defined | Returns simple 200 |
| ASYNC_INGESTION=false | Spec defined | Reverts to sync processing |
| AUTO_CLEAR_INCIDENTS=false | Spec defined | Skips reconciliation |
| DEMO_MODE_ENABLED=false | Spec defined | Hides toggle |

---

## Emergency Contacts

- **A2 Team**: scholarship_api maintainers
- **A7 Team**: auto_page_maker maintainers
- **A8 Team**: auto_com_center maintainers
- **A5 Team**: student_pilot (this project)

---

## Rollback Decision Matrix

| Symptom | Action |
|---------|--------|
| A2 /ready false positives | Disable flag, use /health |
| A7 queue backing up | Disable async, drain queue |
| A8 incidents not clearing | Disable auto-clear, manual clear |
| A8 demo data in production | Disable demo mode, verify filter |

---

## Conclusion

All proposed changes have:
- ✅ Feature flag for instant disable
- ✅ Clear rollback procedure
- ✅ Fallback behavior defined
- ✅ No database schema changes (reversible)
