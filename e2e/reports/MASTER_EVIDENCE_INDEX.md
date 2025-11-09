# Master Evidence Index - Nov 9, 2025 Go-Live

**Last Updated:** 2025-11-09 18:32 UTC  
**Maintained By:** Agent3  
**Prime Objective:** Protect brand trust and SEO flywheel while unblocking B2C/B2B funnels to accelerate ARR

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
| **Pre-Soak PASS** | 20:00-21:00 UTC | ⏳ Scheduled | Agent3 + All DRIs | ~2h from now |
| **Deliverability GREEN** | T+90 from T0 | ⏳ Awaiting T0 | Agent3 (executor) | T0 + 90 min |
| **Stripe PASS** | TBD | ⏳ Pending | Finance | TBD |

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

## Observe-Only Applications (For Completeness)

**auto_page_maker** - https://auto-page-maker-jamarrlmayes.replit.app
- Status: GO-LIVE READY (GREEN; frozen)
- Continue daily KPI rollups; protect SEO flywheel
- No changes through Nov 12

**scholarship_api** - https://scholarship-api-jamarrlmayes.replit.app
- Status: PRE-SOAK PARTICIPANT
- Evidence to be included in student_pilot bundle (latency, lineage, no-PII)

**scholar_auth** - https://scholar-auth-jamarrlmayes.replit.app
- Status: HEALTHY; watch item on token cleanup (non-blocking)
- Participate in lineage and PKCE/revocation proof

**provider_register** - https://provider-register-jamarrlmayes.replit.app
- Status: Waitlist mode ON; participates in pre-soak with guardrails
- Conversion frozen until gates pass

**scholarship_sage** - https://scholarship-sage-jamarrlmayes.replit.app
- Status: GREEN; frozen; observe-only

**scholarship_agent** - https://scholarship-agent-jamarrlmayes.replit.app
- Status: GREEN; frozen; fairness telemetry active; observe-only

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
