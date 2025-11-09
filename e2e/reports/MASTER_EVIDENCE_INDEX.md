# Master Evidence Index - Nov 9, 2025 Go-Live

**Last Updated:** 2025-11-09 22:31 UTC  
**Maintained By:** Agent3  
**Prime Objective:** Soft launch readiness while protecting brand trust and SEO flywheel

---

## Section V Status Reports (Posted 2025-11-09 22:31 UTC)

### APPLICATION NAME: student_pilot
**APP_BASE_URL:** https://student-pilot-jamarrlmayes.replit.app  
**Status:** DELAYED

**What's missing:** Three gates outstanding — Deliverability GREEN (auto_com_center), Stripe PASS (Finance), Pre-soak PASS (tonight).

**Blockers:**
- Deliverability GREEN depends on T0 DNS/Postmark verification and T+90 certification.
- Stripe PASS pending Finance confirmation of keys, webhooks, KYC/verification.

**Estimated Go-Live Date/Time:**
- Primary: Nov 11, 16:00 UTC
- Conditional: Nov 12, 16:00 UTC if a single gate slips ≤24h with mitigation

**ARR Ignition:**
- B2C ignition: Begins within 24–48 hours post go-live, contingent on Deliverability GREEN and Stripe PASS (target: Nov 12–13).

**Third-party dependencies and status:**
- scholar_auth: Healthy; watch token cleanup; non-blocking.
- scholarship_api: Pre-soak participant; must meet P95 ≤120 ms, no-PII logs, request_id lineage.
- Postmark (via auto_com_center): Pending T0/T+90.
- Stripe: Pending PASS; no charging until CEO GREEN.

**Evidence commitments (tonight, 21:30–22:00 UTC):**
- P50/P95 histograms (service/E2E), uptime, error tallies, PKCE + revocation proof, request_id lineage samples (10+), no-PII log validation, executive PASS/FAIL.

---

### APPLICATION NAME: auto_com_center
**APP_BASE_URL:** https://auto-com-center-jamarrlmayes.replit.app  
**Status:** DELAYED

**What's missing:** DNS fallback domain setup and Postmark domain verification (T0), then T+90 deliverability certification.

**Blockers:**
- Requires Postmark account access to add domain and retrieve DKIM.
- Requires DNS admin to publish SPF/DMARC/DKIM for mail2.scholaraiadvisor.com.
- Seed inbox accounts access for live testing (Gmail x2, Outlook x2, Yahoo, Proton, iCloud).

**Estimated Go-Live Date/Time:**
- If T0 by 19:30 UTC: GREEN/RED by ~21:15–21:30 UTC.
- If T0 after 20:30 UTC: GREEN/RED due within 105 minutes of T0; absolute latest acceptable tonight is 23:59 UTC unless CEO waives.

**ARR Ignition:**
- Enables compliant transactional and onboarding communications required for B2C conversion. ARR contribution starts when student_pilot goes live and charging is unfrozen (post-CEO GREEN).

**Third-party dependencies and status:**
- Postmark: Pending domain add and verification.
- DNS provider: Pending SPF/DMARC/DKIM.
- Blocklist monitoring: Required during T+90.

**Evidence commitments:**
- DNS record proofs, ESP verification screenshots, seed inbox headers, placement/bounce/blocklist analysis, DMARC policy confirmation, executive GREEN/RED call, posted within 15 minutes of T+90 completion.

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
