# Master Evidence Index - Nov 10, 2025 Go-Live

**Last Updated:** 2025-11-10 00:59 UTC  
**Maintained By:** Agent3  
**Prime Objective:** Protect SEO flywheel, ship with evidence, unlock both funnels with lowest CAC. No paid acquisition until deliverability GREEN and payments PASS.

---

## Section V Status Reports (Last Updated: 2025-11-09 18:32 UTC)

### APPLICATION NAME: student_pilot
**APP_BASE_URL:** https://student-pilot-jamarrlmayes.replit.app  
**Status:** DELAYED

**What's ready:**
- App healthy, pre-soak guardrails defined
- request_id lineage across scholar_auth → scholarship_api → student_pilot
- Rollback and 60-minute RCA protocol armed

**Blockers (Section IV):**
- **Security/Compliance:** Awaiting posted evidence of PKCE correctness and immediate token revocation proof via scholar_auth; confirm no-PII-in-logs audit (FERPA/COPPA) with sample traces and log redaction checks
- **Integration:** Pre-soak dependence on scholarship_api meeting SLOs; include latency/lineage artifacts
- **Go-to-market gates:** Deliverability GREEN (auto_com_center T+90) and Stripe PASS

**Estimated Go-Live Date:**
- Nov 11, 16:00 UTC if Deliverability GREEN and Stripe PASS are achieved by Nov 10, 18:00 UTC
- Otherwise Nov 12, 16:00 UTC with CEO approval

**ARR Ignition:**
- B2C credit sales begin immediately upon CEO GREEN
- Pricing remains 4× AI service markup
- Track free→paid conversion and ARPU

**Third-Party Dependencies:**
- scholar_auth (MFA/SSO, RBAC, token lifecycle)
- scholarship_api (search/match data)
- Stripe (payments)
- Postmark (transactional email via auto_com_center)
- Evidence of TLS 1.3 in transit and encryption at rest required for any sensitive stores

**Evidence to attach:**
- Pre-soak T+30 bundle with P50/P95 histograms (service-side and E2E)
- Uptime, error rates, 10+ request_id traces
- PKCE + revocation proof
- No-PII log validation

---

### APPLICATION NAME: auto_com_center
**APP_BASE_URL:** https://auto-com-center-jamarrlmayes.replit.app  
**Status:** DELAYED

**What's ready:**
- T+90 runbook complete
- Seed inboxes provisioned
- Success criteria locked (≥90% Primary inbox, ≤10% Promotions, <0.3% bounce, zero blocklists)
- Evidence bundle template prepared

**Blockers (Section IV):**
- **Security/Compliance:** T0 awaited; DMARC p=quarantine with strict alignment set (aspf=s, adkim=s). Move to p=reject post-stabilization (7–14 days) contingent on monitoring
- **Integration:** Return-Path alignment and DKIM selectors (Postmark) must be live; headers captured in seed tests for alignment proof

**Estimated Go-Live Date:**
- Deliverability GREEN decision due T0+90 (evidence posted by T0+105)
- If T0 lands after 19:30 UTC, window slides accordingly

**ARR Impact:**
- Required for reliable transactional and lifecycle comms
- Gate for B2C/B2B funnels

**Third-Party Dependencies:**
- Postmark (ESP)
- DNS provider (SPF/DMARC/DKIM)
- Seed inbox providers
- Evidence includes DNS screenshots, ESP verification, message headers, placement matrix, bounce and blocklist checks

---

## Executive Notes on Ecosystem Posture

**auto_page_maker:** GO-LIVE READY (GREEN; frozen). Maintain observe-only posture to protect SEO-driven low-CAC acquisition. Continue daily KPI rollups. This aligns with our strategy to prioritize scalable, organic growth while other gates converge.

**scholarship_api:** Pre-soak participant; must meet SLOs and provide lineage/no-PII artifacts. Our autonomous operations standard emphasizes proactive, data-driven recovery and secure-by-design patterns; keep audit trails immutable and complete.

**scholarship_agent and other observer apps:** Remain GREEN/frozen; maintain fairness telemetry and ethical governance routines, with HOTL (human-on-the-loop) approval gates for high-risk changes.

---

## Evidence Discipline and Governance

**Autonomous Operations Standards:**
- ✅ Reconstructable audit trail (inputs, reasoning, actions)
- ✅ Explainability and accountability
- ✅ Traceability and override mechanisms for critical actions
- ✅ Zero-trust posture for sensitive systems
- ✅ Immutable and complete audit trails
- ✅ HOTL approval gates for high-risk changes with financial or privacy impact
- ✅ Revocable credentials for any agentic action

**Ethics/Responsible AI:**
- ✅ Fairness telemetry and daily rollups for student/provider-facing decisioning
- ✅ Periodic audits and user redress mechanisms
- ✅ Transparent, audit-ready controls

**Security/Compliance:**
- ✅ TLS 1.3 in transit and encryption at rest
- ✅ No PII in logs (FERPA/COPPA compliance)
- ✅ PKCE correctness and immediate token revocation
- ✅ request_id lineage for full traceability

---

## Evidence Bundles - Tracking

| Evidence Package | Owner | Deadline | Status | Link |
|------------------|-------|----------|--------|------|
| **Pre-Soak T+30** | Agent3 | 21:30-22:00 UTC | ⏳ Pending execution | [TBD] |
| **Deliverability T+90** | Agent3 | T+90 + 15 min | ⏳ Awaiting T0 | [TBD] |
| **Stripe PASS** | Finance | TBD | ⏳ Pending | [TBD] |

---

## Gate Status - Real-Time Tracking

| Gate | Target | Status | Owner | ETA |
|------|--------|--------|-------|-----|
| **Pre-Soak PASS** | 20:00-21:00 UTC | ⏳ Scheduled | Agent3 + All DRIs | Approaching |
| **Deliverability GREEN** | T+90 from T0 | ⏳ Awaiting T0 | Agent3 (executor) | T0 + 90 min |
| **Stripe PASS** | Nov 10, 18:00 UTC | ⏳ Pending | Finance | Hard deadline |

---

## T0 Definition (Deliverability)

**T0 Trigger:** Postmark shows "Verified" on mail2.scholaraiadvisor.com AND DNS records resolve globally (SPF/DMARC/DKIM)

**Responsible Parties:**
- Email Ops: Add mail2.scholaraiadvisor.com to Postmark; return DKIM CNAMEs to Deputy Ops within 10 minutes
- Deputy Ops: Publish SPF/DMARC immediately; add both DKIM CNAMEs upon receipt; signal T0 to Agent3

**Agent3 Action Upon T0:** Execute deliverability T+90 runbook immediately and deliver evidence within +15 minutes of completion

---

## DNS and Email Policy Configuration (Deputy Ops + Email Ops)

**Fallback Domain:** mail2.scholaraiadvisor.com

**SPF (root and subdomain):**
```
v=spf1 include:spf.mtasv.net -all
```

**DMARC (org and subdomain policy; strict alignment):**
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@scholaraiadvisor.com; aspf=s; adkim=s; pct=100
```

**DKIM:**
- Use two Postmark-provided CNAME selectors for mail2.scholaraiadvisor.com
- Confirm alignment with From and Return-Path

**Return-Path:**
- Align on mail2.scholaraiadvisor.com to ensure SPF/DMARC alignment

---

## Deliverability T+90 Certification Window

**Timeline:**
- T+0–T+45: Propagation and Postmark verification monitoring
- T+45–T+75: Seed inbox tests (Gmail x2, Outlook x2, Yahoo, Proton, iCloud)
- T+75–T+90: Evidence bundle assembly
- T+90–T+105: Post evidence to Master Evidence Index; request CEO review

**Targets:**
- ≥90% inbox placement, transactional not in Promotions (>90%)
- <0.3% bounces
- Zero blocklist hits
- SPF/DKIM/DMARC PASS and alignment

**Hard Deadline:**
- GREEN/RED call: 22:30 UTC today unless T0 slips
- If T0 slips: GREEN/RED due within 105 minutes of T0

---

## Gate Acceptance Criteria (Unchanged)

**Platform SLOs:**
- 99.9% uptime
- P95 ≤120 ms service-side (≤200 ms E2E)
- Error rate ≤0.1%

**Auth:**
- PKCE correctness and immediate token revocation proof
- request_id lineage across scholar_auth → scholarship_api → app
- No PII in logs (FERPA/COPPA)

**Responsible AI:**
- Controls active; fairness telemetry on

**Financial:**
- Stripe PASS (test transactions, webhooks, KYC verified or scheduled)
- Freeze on charging until CEO GREEN

---

## Risk Controls and Rollback

**Guardrail Breach:** Any breach triggers immediate rollback and 60-minute RCA with corrective actions and retest plan

**Communications Freeze:** Remains until CEO GREEN; all evidence must be posted on time

**Vendor Strategy:** No switch; stay with Postmark shared pool

---

---

### APPLICATION NAME: provider_register
**APP_BASE_URL:** https://provider-register-jamarrlmayes.replit.app  
**Status:** DELAYED (Waitlist Mode ON)

**Blockers:**
- Same email + Stripe gates as student_pilot
- **Security/Compliance:** PKCE, token revocation, no-PII logs evidence
- Lineage across scholar_auth → scholarship_api → provider_register

**Estimated Go-Live Date:**
- Earliest: Nov 12, 16:00 UTC contingent on deliverability GREEN + Stripe PASS + CEO GREEN

**ARR Ignition:**
- B2B onboarding; 3% platform fee upon activation

**Third-Party Dependencies:**
- scholar_auth, scholarship_api, Stripe, auto_com_center

---

### APPLICATION NAME: auto_page_maker
**APP_BASE_URL:** https://auto-page-maker-jamarrlmayes.replit.app  
**Status:** GO-LIVE READY (GREEN; FROZEN)

**Confirmation:**
- Observe-only posture to protect SEO-driven, low-CAC growth
- Daily KPI rollups continue
- No code/infrastructure/template changes through Nov 12

**Evidence/Docs:**
- Daily rollup cadence maintained
- CWV p75 GREEN and indexation targets monitored

---

### APPLICATION NAME: scholarship_api
**APP_BASE_URL:** https://scholarship-api-jamarrlmayes.replit.app  
**Status:** DELAYED (Pre-soak participant; pending sign-off)

**Blockers:**
- Must produce SLO metrics (uptime, P95, error rate)
- 10+ request_id lineage samples
- No-PII log validation for T+30 bundle

**Estimated Sign-Off:**
- Included in student_pilot T+30 evidence review tonight
- Final sign-off on CEO GREEN

---

### APPLICATION NAME: scholar_auth
**APP_BASE_URL:** https://scholar-auth-jamarrlmayes.replit.app  
**Status:** 🚨 **P1 INCIDENT - JWKS 404** (BLOCKING ENTIRE ECOSYSTEM)

**P1 Incident Details:**
- Issue: JWKS endpoint 404 error
- Impact: Blocks pre-soak/launch for entire ecosystem
- SLA: 2 hours to resolve
- Assigned: Agent3 (execution owner per CEO directive)

**Fix Steps (CEO Directive):**
1. Immediate rollback to last known-good artifact serving /.well-known/openid-configuration and jwks_uri
2. If rollback fails: Publish current public JWK set from KMS to static /oidc/jwks endpoint behind CDN; rotate signing keys; invalidate caches; retest OIDC end-to-end
3. Reinstate PKCE S256 enforcement and immediate token revocation tests

**Current Status (from student_pilot logs):**
- ✅ Scholar Auth discovery successful from student_pilot
- ✅ OAuth configured correctly
- ⚠️ SCOPE ISSUE: scholar_auth is separate Replit application - Agent3 has no access to codebase

**Additional Security Evidence Required (Post-Fix):**
- MFA/SSO verification summary
- RBAC policy review
- PKCE S256 enforcement proof
- Immediate token revocation test
- Audit logging scope
- No-PII logging confirmation

**Estimated Sign-Off:**
- With T+30 evidence bundle after P1 resolution, subject to CEO review

---

### APPLICATION NAME: scholarship_sage
**APP_BASE_URL:** https://scholarship-sage-jamarrlmayes.replit.app  
**Status:** GO-LIVE READY (GREEN; FROZEN—Observer)

**Confirmation:**
- Observer role; fairness/analytics routines maintained
- HOTL gates enforced
- No changes during freeze

---

### APPLICATION NAME: scholarship_agent
**APP_BASE_URL:** https://scholarship-agent-jamarrlmayes.replit.app  
**Status:** GO-LIVE READY (GREEN; FROZEN—Observer)

**Confirmation:**
- Fairness telemetry active
- Ethical governance routines on schedule
- HOTL gates enforced
- No changes during freeze

---

## Tonight's Mandatory Evidence Windows

**Pre-soak execution:** 20:00–21:00 UTC
- **Participants:** student_pilot, provider_register, scholarship_api, scholar_auth
- **Guardrails (ALL must PASS):**
  - Uptime ≥99.9%
  - P95 ≤120ms service-side (≤200ms E2E)
  - Error rate ≤0.1%
  - Full request_id lineage
  - No PII in logs
  - PKCE + token revocation proof
  - TLS 1.3 in-transit evidence

**T+30 evidence posting:** 21:30–22:00 UTC (hard window)
- **Contents:**
  - P50/P95 histograms (service + E2E)
  - Uptime, error rate
  - 10+ request_id traces across scholar_auth → scholarship_api → student_pilot/provider_register
  - PKCE + revocation proof
  - No-PII validation
  - TLS 1.3 proof
  - Executive PASS/FAIL summary

**Deliverability certification (auto_com_center):** On T0 signal, execute T+90
- **Timeline:**
  - T+0–T+45: Propagation monitoring
  - T+45–T+75: Seed inbox tests (7 providers)
  - T+75–T+90: Evidence assembly
  - T+90–T+105: Post GREEN/RED call
- **Contents:**
  - DNS screenshots (SPF/DMARC/DKIM)
  - ESP verification (Postmark)
  - Header alignment proof
  - Placement matrix (≥90% inbox, ≤10% Promotions)
  - Bounce and blocklist checks (<0.3% bounce, zero blocklists)

---

## CEO Notes (Strategic Alignment)

**Student value drives revenue:**
- Preserve frictionless experience on go-live
- Ensure no black-box decisioning
- Transparent, explainable AI controls

**Organic growth is the engine:**
- auto_page_maker remains frozen and monitored to protect SEO flywheel
- No paid acquisition until Deliverability GREEN + Stripe PASS + CEO GREEN
- Low-CAC, SEO-led growth prioritized

**Act with urgency, ship with proof:**
- Evidence windows are non-negotiable
- Immutable, reconstructable audit trails for every milestone
- CEO GREEN is contingent on posted evidence

**Return to CEO:**
1. T+30 evidence bundle link by 22:00 UTC
2. Deliverability GREEN/RED call link within 15 minutes of T+90
3. Stripe PASS evidence by Finance deadline (Nov 10, 18:00 UTC)

---

## CEO Review Windows

**Deliverability T+90 evidence:** Reviewed within 30 minutes of receipt; CEO will issue GREEN/RED immediately after review

**Pre-soak T+30 evidence (21:30–22:00 UTC):** Reviewed upon posting; CEO will issue a consolidated GO/NO-GO call for Nov 11 soft launch

---

## Evidence Posting Discipline

**Master Evidence Index updates:** Within 15 minutes of each milestone

**Each bundle must include:**
- Links to logs/metrics/screenshots
- request_id references
- Explicit PASS/FAIL calls
- One-paragraph executive summary

**Late or missing evidence:** Triggers immediate escalation

---

**Index Maintained By:** Agent3  
**Last Updated:** 2025-11-09 22:31 UTC  
**Next Update:** Post pre-soak T+30 evidence (21:30-22:00 UTC)
