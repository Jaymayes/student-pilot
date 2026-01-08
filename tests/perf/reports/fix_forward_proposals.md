# Fix Forward Proposals

**Date:** January 8, 2026  
**Protocol:** AGENT3_HANDSHAKE v27  
**Phase:** Cross-Funnel

---

## Active Issues

### P0 - Critical (Blocking Revenue)

| ID | Issue | App | Impact | Proposed Fix | Owner | ETA | Rollback |
|----|-------|-----|--------|--------------|-------|-----|----------|
| A1-001 | OIDC session loop | A1 | Blocks B2C signups | Set-Cookie SameSite=None; Secure; align TTL | AuthTeam | TBD | Revert cookie config |
| ACTIVATION-001 | 0% AI usage | A5 | Credits unused, no engagement | Add onboarding wizard to Essay Assistant | ProductTeam | TBD | Feature flag off |

### P1 - High (SLO Violations)

| ID | Issue | App | Impact | Proposed Fix | Owner | ETA | Rollback |
|----|-------|-----|--------|--------------|-------|-----|----------|
| A2-PERF-001 | P95 216ms (SLO 125ms) | A2 | Slow event ingestion | DB query optimization, connection pooling | A2Team | TBD | N/A |
| A7-PERF-001 | P95 248ms (SLO 150ms) | A7 | Slow landing pages | CDN, edge caching, warmers | A7Team | TBD | Disable CDN |
| A8-PERF-001 | P95 314ms (SLO 150ms) | A8 | Slow dashboard | Redis caching, CDN | A8Team | TBD | Disable caching |

### P2 - Medium (Improvements)

| ID | Issue | App | Impact | Proposed Fix | Owner | ETA | Rollback |
|----|-------|-----|--------|--------------|-------|-----|----------|
| A8-001 | Finance tile wiring | A8 | Lineage not visible | Wire correct payload keys | A8Team | TBD | N/A |
| A5-SEO-001 | Missing OG image | A5 | Poor social sharing | ✅ FIXED - Added og-image.png | - | DONE | Revert index.html |
| TTFV-001 | TTFV not measured | A5 | Can't track activation | Add TTFV event emission | ProductTeam | TBD | N/A |

---

## Completed Fixes

### A5-SEO-001: OG Image Missing ✅

**Status:** COMPLETED  
**Date:** 2026-01-08  
**Commit:** (included in session)

**Changes:**
- Added `og:image` meta tag to client/index.html
- Added `og:image:width`, `og:image:height`, `og:image:alt`
- Added `twitter:image` and `twitter:image:alt`
- Created client/public/og-image.png (634KB, 1200x630)

**Verification:**
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/og-image.png
# Returns: 200
```

---

## Proposed Diffs

### A1-001: OIDC Cookie Fix

```diff
# A1 cookie configuration (conceptual)
- Set-Cookie: session=xxx; Path=/
+ Set-Cookie: session=xxx; SameSite=None; Secure; Domain=.replit.app; Path=/
```

**Dependencies:** Requires A1 team access  
**Testing:** Playwright B2C funnel test after fix

### ACTIVATION-001: Onboarding Wizard

```tsx
// Conceptual: Add to Dashboard.tsx
<OnboardingWizard
  steps={[
    { title: "Welcome!", description: "You have 5 free credits" },
    { title: "Try Essay Assistant", action: () => navigate("/essay-assistant") },
    { title: "Get Matched", action: () => navigate("/scholarships") }
  ]}
  onComplete={() => markOnboardingComplete(userId)}
/>
```

**Dependencies:** Design guidelines, user testing  
**Testing:** TTFV measurement before/after

---

## Impact Matrix

| Fix | Revenue Impact | User Impact | Effort | Priority Score |
|-----|----------------|-------------|--------|----------------|
| A1-001 OIDC | High (unblocks signups) | Critical | Medium | 10 |
| ACTIVATION-001 | High (drives usage) | High | Medium | 9 |
| A8-PERF-001 | Low | Medium | High | 5 |
| A7-PERF-001 | Medium | Medium | Medium | 6 |
| A2-PERF-001 | Low | Low | Medium | 4 |

---

## Rollback Plans

### A1-001 Rollback
1. Revert cookie configuration to previous settings
2. Clear affected sessions
3. Monitor for session establishment

### ACTIVATION-001 Rollback
1. Disable onboarding feature flag
2. Hide wizard component
3. No data migration needed

### Performance Fix Rollbacks
1. Disable caching layer
2. Revert to direct database queries
3. Monitor for increased latency (expected)

---

## Next Steps

1. **Immediate:** Present fixes to respective team owners
2. **This Sprint:** Implement ACTIVATION-001 (highest ROI within A5)
3. **Blocked:** A1-001 requires AuthTeam coordination
4. **Backlog:** Performance optimizations per priority

---

## Approval Required

| Fix | HITL Required | Reason |
|-----|---------------|--------|
| A1-001 | Yes | OIDC cookie policy change |
| ACTIVATION-001 | No | New feature, feature-flagged |
| A8-PERF-001 | No | Caching layer, no data change |
| A7-PERF-001 | No | CDN configuration |
| A2-PERF-001 | No | Query optimization |

---

*Last updated: 2026-01-08T20:00:00Z*
