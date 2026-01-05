# PR Links and Status
**Date:** 2026-01-05T21:22Z

---

## Status: DRAFT SPECIFICATIONS

These are comprehensive implementation specifications, not yet GitHub PRs.
Actual PR creation requires access to the respective repositories.

---

## PR Specifications

| Issue | App | Specification File | Status |
|-------|-----|-------------------|--------|
| A | A2 (scholarship_api) | `pr_drafts/issue_a_a2_ready_endpoint_full.md` | 📝 DRAFT |
| B | A7 (auto_page_maker) | `pr_drafts/issue_b_a7_async_ingestion_full.md` | 📝 DRAFT |
| C | A8 (auto_com_center) | `pr_drafts/issue_c_a8_stale_banners_full.md` | 📝 DRAFT |
| D | A8 (auto_com_center) | `pr_drafts/issue_d_a8_demo_mode_full.md` | 📝 DRAFT |

---

## Next Steps to Create Actual PRs

1. **Access Required**: Obtain write access to A2, A7, A8 repositories
2. **Branch Creation**: Create feature branches from main
3. **Implementation**: Follow specifications in draft files
4. **PR Opening**: Open PRs with templates from drafts
5. **Review**: Request code review from respective teams

---

## Specification Contents

Each draft includes:
- ✅ Executive summary
- ✅ Before/after architecture diagrams
- ✅ Implementation code
- ✅ Feature flag configuration
- ✅ Risk analysis
- ✅ Rollback plan
- ✅ Test cases
- ✅ Monitoring alerts
- ✅ Documentation updates
- ✅ Acceptance criteria

---

## A5 Integration Work (Implemented)

| Integration | Description | Status | File |
|-------------|-------------|--------|------|
| A2 /ready fallback | Graceful handling when /ready unavailable | ✅ COMPLETE | `server/services/externalHealthClient.ts` |
| A7 202 async handling | Handle async responses from A7 ingestion | ✅ COMPLETE | `server/services/externalHealthClient.ts` |
| Enhanced /api/readyz | External dependency health monitoring | ✅ COMPLETE | `server/routes.ts` |
| A7 health in readyz | A7 status exposed in readiness | ✅ COMPLETE | `server/routes.ts` |

These integrations are now live in A5 development environment.

---

## Implementation Details

### externalHealthClient.ts
- `checkA2Health()`: Tries /ready, falls back to /health if 404
- `checkA7Health()`: Health checks for auto_page_maker
- `checkA8Health()`: Health checks for Command Center
- `ingestToA7()`: POST with idempotency key, handles 202/200 responses
- `pollA7EventStatus()`: Polls for event processing completion
- Health caching with 30s TTL

### /api/readyz Enhancement
- Now reports A2, A7, A8 health with latencies
- Shows fallback status when A2 /ready unavailable
- Graceful degradation indicators for all external services
