# Agent3 E2E Testing - Operator Quick Start

## Setup (One-Time)

1. **Paste the Universal Prompt into Agent3**
   - Open `docs/testing/AGENT3_SYSTEM_PROMPT.txt`
   - Copy the entire contents
   - Paste into Agent3 as the system message

2. **Ready to Test**
   - Agent3 will auto-detect the app type from the URL
   - Only the relevant test module will execute
   - All tests are strictly read-only (no mutations)

## Usage Examples

### Single App Test

```
Test https://student-pilot-jamarrlmayes.replit.app
```

### Gate Validation

**T+24h Gate (Infrastructure)**
```
T+24h gate: Test Scholarship API and Scholarship Agent
```

URLs:
- https://scholarship-api-jamarrlmayes.replit.app
- https://scholarship-agent-jamarrlmayes.replit.app

Pass Criteria: Both score ≥ 4

**T+48h Gate (Revenue)**
```
T+48h gate: Test Student Pilot and Provider Register
```

URLs:
- https://student-pilot-jamarrlmayes.replit.app
- https://provider-register-jamarrlmayes.replit.app

Pass Criteria: Both score exactly 5

**T+72h Gate (Full Rollout)**
```
T+72h gate: Test all apps
```

All 8 URLs:
- https://auto-com-center-jamarrlmayes.replit.app
- https://scholarship-agent-jamarrlmayes.replit.app
- https://scholarship-sage-jamarrlmayes.replit.app
- https://scholarship-api-jamarrlmayes.replit.app
- https://student-pilot-jamarrlmayes.replit.app
- https://provider-register-jamarrlmayes.replit.app
- https://auto-page-maker-jamarrlmayes.replit.app
- https://scholar-auth-jamarrlmayes.replit.app

Pass Criteria:
- Auto Page Maker = 5 (SEO critical)
- Scholar Auth = 5 (Security critical)
- All others ≥ 4

## Readiness Scores

| Score | Status | Action |
|-------|--------|--------|
| **0** | Not Reachable | 🛑 STOP - Fix deployment |
| **1** | Major Blockers | 🛑 STOP - Fix critical issues |
| **2** | Critical Issues | ⚠️ HOLD - Address before rollout |
| **3** | Usable | ✅ PROCEED with caution |
| **4** | Near-Ready | ✅ PROCEED - Fix minor issues |
| **5** | Production-Ready | ✅ PROCEED - No action needed |

## Report Format

Each test produces a structured report:

```yaml
app_name: Student Pilot
readiness_score_0_to_5: 5
rollout_gate_status:
  gate: T+48h
  meets_gate: true
  note: "Revenue-critical app production-ready"
key_findings:
  - Clean load with no console errors
  - All critical security headers present
  - Payment provider CSP configured
recommended_actions:
  - Consider adding Permissions-Policy header
```

## Safety Guarantees

✅ **Enforced**:
- Only GET, HEAD, OPTIONS
- Max 1 req/path/10s
- Max 20 req/app total
- No PII collection
- No state mutations

❌ **Prohibited**:
- POST/PUT/PATCH/DELETE
- Form submissions
- Authentication attempts
- Cookie manipulation
- File uploads

## Notes

### Auto Com Center
- Admin dashboard
- 200 on login page OR 302 to login = acceptable
- Do NOT attempt to authenticate
- Focus: availability, headers, no critical errors

### Student Pilot & Provider Register
- Revenue-critical (must be 5 for T+48h)
- Check CSP supports payment providers
- Verify cookie security flags
- No authentication attempts

### Auto Page Maker
- SEO-critical (must be 5 for T+72h)
- robots.txt and sitemap.xml required
- Check canonical tags
- Fast TTFB required

### Scholar Auth
- Security-critical (must be 5 for T+72h)
- Ironclad security headers
- Cookie flags: Secure, HttpOnly, SameSite
- CSRF token presence

## Quick Reference

| App | Type | T+24h | T+48h | T+72h |
|-----|------|-------|-------|-------|
| Auto Com Center | Admin | - | - | ≥4 |
| Scholarship Agent | Public | ≥4 | - | ≥4 |
| Scholarship Sage | Public | - | - | ≥4 |
| Scholarship API | API | ≥4 | - | ≥4 |
| Student Pilot | Auth/B2C | - | =5 | =5 |
| Provider Register | Public/B2B | - | =5 | =5 |
| Auto Page Maker | SEO | - | - | =5 |
| Scholar Auth | Auth | - | - | =5 |

## Troubleshooting

**Score 0 (Not Reachable)**
1. Verify URL is correct
2. Check DNS resolution
3. Validate SSL certificate
4. Check deployment status

**Score 1-2 (Blockers)**
1. Review console errors
2. Check missing security headers
3. Verify JavaScript loads
4. Check for broken assets

**Rate Limited (429)**
- Agent3 auto-backs off
- Wait 60s between retries
- Note in report if persistent

## Full Documentation

- System Prompt: `docs/testing/AGENT3_SYSTEM_PROMPT.txt`
- Detailed Runbook: `docs/testing/E2E_TESTING_RUNBOOK.md`
- Framework Overview: `docs/testing/universal_readonly_e2e_prompt.md`
