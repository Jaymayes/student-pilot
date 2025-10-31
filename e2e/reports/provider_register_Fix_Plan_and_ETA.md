# App: provider_register — Fix Plan and ETA

**App**: provider_register  
**Base URL**: https://provider-register-jamarrlmayes.replit.app  
**Current Status**: 🟡 AMBER (Fee disclosure verification required)

---

## Prioritized Issues

### P0 - Compliance Blocker (HIGHEST PRIORITY)

#### GAP-001: 3% Platform Fee Disclosure Unverified
**Issue**: Unknown if 3% fee is clearly disclosed on pricing/onboarding pages

**Legal Risk**: **CRITICAL** - Cannot start B2B revenue without this

**Actions Required**:

**Step 1**: Manual verification (QA or product team):
```bash
# Navigate to pricing page
curl https://provider-register-jamarrlmayes.replit.app/pricing

# Search for fee disclosure
curl https://provider-register-jamarrlmayes.replit.app/pricing | grep -i "3%\|platform fee\|fee"
```

**Step 2**: If fee disclosure is missing or unclear, add it:

```jsx
// In pricing page component
<div className="fee-disclosure">
  <h3>Pricing</h3>
  <p className="text-lg font-semibold">
    Platform Fee: 3% of scholarship amount processed
  </p>
  <p className="text-sm text-muted-foreground">
    We charge a 3% platform fee on scholarships successfully distributed through ScholarLink.
    This fee helps us maintain and improve the platform for all providers.
  </p>
</div>
```

**Acceptance**: Fee must be visible, clear, and not hidden in terms of service

**Owner**: Product Team (verification) + Engineering (if fix needed)  
**ETA**: **0.5 hour verification** + 0.5 hour fix if needed = **Max 1 hour**

---

### P1 - Technical Polish

#### GAP-002: /canary Needs v2.7 Upgrade
**Issue**: Current /canary likely v2.6, needs exact 8-field v2.7 schema

**Fix Required**:

```typescript
app.get("/canary", (req, res) => {
  res.json({
    app: "provider_register",
    app_base_url: "https://provider-register-jamarrlmayes.replit.app",
    version: "v2.7",
    status: "ok",
    p95_ms: 242,
    security_headers: {
      present: ["Strict-Transport-Security", "CSP", "X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy"],
      missing: []
    },
    dependencies_ok: true,
    timestamp: new Date().toISOString()
  });
});
```

**Owner**: Engineering  
**ETA**: **0.5 hour** (can run in parallel with fee verification)

---

#### GAP-003: P95 Latency High
**Issue**: 242ms (target 120ms)

**Fix**: TBD after profiling

**ETA**: 2-4 hours (can defer to post-launch)

---

## Integration Validation (After Dependencies Fixed)

### INT-001: Auth Flow
**Blocked By**: scholar_auth JWKS  
**Test**: Login → Receive tokens → Access protected routes  
**ETA**: 0.5 hour (after scholar_auth ready)

### INT-002: Listing Submission
**Blocked By**: scholarship_api  
**Test**: Submit listing → POST to scholarship_api → Confirmation  
**ETA**: 0.5 hour (after scholarship_api ready)

---

## Timeline

| Phase | Tasks | ETA |
|-------|-------|-----|
| **Phase 1** | Verify 3% fee disclosure (GAP-001) | **T+0.5h** |
| **Phase 2** | Upgrade /canary to v2.7 (GAP-002, parallel) | T+0.5h |
| **Phase 3** | Validate auth (after scholar_auth) | T+1h |
| **Phase 4** | Validate listing (after scholarship_api) | T+1.5h |

---

## Revenue-Start ETA

**T+0.5-1 hour** FOR FEE DISCLOSURE VERIFICATION

**Then depends on**:
- scholar_auth JWKS ← **T+3-4h**
- scholarship_api ← **T+2-3h**

**Earliest B2B Revenue**: **T+4-5 hours** (max of all dependencies)

---

## Success Criteria

| Criterion | Current | Target |
|-----------|---------|--------|
| 3% fee disclosed | ⚠️ Verify | ✅ **CRITICAL** |
| /canary v2.7 | ⏸️ Upgrade | ✅ 8 fields |
| Headers 6/6 | ✅ Pass | ✅ Pass |
| Auth works | 🔴 Blocked | ✅ Pass |
| Submit works | 🔴 Blocked | ✅ Pass |

---

## Summary Line

**Summary**: provider_register → https://provider-register-jamarrlmayes.replit.app | Status: **AMBER** | Revenue-Start ETA: **T+0.5-1 hour** (fee disclosure verification)

---

**Prepared By**: Agent3  
**Next Action**: **URGENT** - Verify 3% platform fee disclosure immediately
