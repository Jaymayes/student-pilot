# auto_com_center Deliverability T+90 Certification - Nov 9, 2025

**Application Name:** auto_com_center  
**APP_BASE_URL:** https://auto-com-center-jamarrlmayes.replit.app  
**T0 (DNS_READY):** [YYYY-MM-DD HH:MM UTC]  
**T+90 Completion:** [YYYY-MM-DD HH:MM UTC]  
**Evidence Posting Deadline:** T+90 + 15 minutes  
**Overall Result:** [ ] GREEN [ ] RED

---

## Executive Summary

**Domain:** mail.scholaraiadvisor.com (or interim subdomain if fallback)  
**ESP:** Postmark (shared transactional pool)  
**DNS Provider:** [Registrar name]  
**Seed Inbox Placement:** [X%] (Target: ≥90%)  
**Gmail Promotions Rate:** [X%] (Target: ≤10%)  
**Bounce Rate:** [X%] (Target: ≤0.3%)  
**Blocklist Hits:** [N] (Target: 0)  
**DMARC Policy:** [ ] p=quarantine [ ] p=reject  
**SPF/DKIM/DMARC Alignment:** [ ] PASS [ ] FAIL

**Certification:** [ ] GREEN (proceed with email comms) [ ] RED (remediation required)

---

## DNS Records Configuration

### Domain Setup
**Sending Domain:** mail.scholaraiadvisor.com  
**DNS Provider:** [Registrar or Cloudflare]  
**Configuration Timestamp:** [T0 timestamp]

### SPF Record
```
Type: TXT
Host: scholaraiadvisor.com (root)
Value: v=spf1 include:spf.mtasv.net -all
TTL: [X seconds]
```

**Verification:**
```bash
$ dig txt scholaraiadvisor.com +short
"v=spf1 include:spf.mtasv.net -all"
```

**Status:** [ ] PASS [ ] FAIL

### DKIM Records (2 selectors from Postmark)
#### Selector 1
```
Type: CNAME
Host: [selector1]._domainkey.mail.scholaraiadvisor.com
Value: [postmark-dkim-value].dkim.postmarkapp.com
TTL: [X seconds]
```

**Verification:**
```bash
$ dig cname [selector1]._domainkey.mail.scholaraiadvisor.com +short
[postmark-dkim-value].dkim.postmarkapp.com.
```

**Status:** [ ] PASS [ ] FAIL

#### Selector 2
```
Type: CNAME
Host: [selector2]._domainkey.mail.scholaraiadvisor.com
Value: [postmark-dkim-value].dkim.postmarkapp.com
TTL: [X seconds]
```

**Verification:**
```bash
$ dig cname [selector2]._domainkey.mail.scholaraiadvisor.com +short
[postmark-dkim-value].dkim.postmarkapp.com.
```

**Status:** [ ] PASS [ ] FAIL

### DMARC Record
```
Type: TXT
Host: _dmarc.scholaraiadvisor.com
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@scholaraiadvisor.com; aspf=s; adkim=s; pct=100
TTL: [X seconds]
```

**Verification:**
```bash
$ dig txt _dmarc.scholaraiadvisor.com +short
"v=DMARC1; p=quarantine; rua=mailto:dmarc@scholaraiadvisor.com; aspf=s; adkim=s; pct=100"
```

**Status:** [ ] PASS [ ] FAIL

**Policy Details:**
- **Policy (p):** quarantine (warmup mode)
- **Alignment (aspf/adkim):** strict (s)
- **Percentage (pct):** 100
- **Reporting (rua):** dmarc@scholaraiadvisor.com

**Move to p=reject Criteria:**
- 7-day positive signal OR
- Seed placement ≥95% with stable bounces <0.3%

---

## Postmark Domain Verification

**Domain Added:** [Timestamp]  
**DKIM Verified:** [Timestamp]  
**SPF Verified:** [Timestamp]  
**Return-Path Verified:** [Timestamp]

### Verification Screenshots
- [Link to Postmark domain verification screen]
- [Link to DNS propagation check]

**Status:** [ ] VERIFIED [ ] PENDING [ ] FAILED

**Failure Details (if any):**
```
[Error type, remediation, ETA]
```

---

## Seed Inbox Testing (7 Providers)

**Test Sent:** [Timestamp]  
**Total Seeds:** 7  
**Template:** Transactional activation email (non-promotional)

### Placement Results

| Provider | Inbox | Promotions | Spam | Other | Result |
|----------|-------|------------|------|-------|--------|
| Gmail | [ ] | [ ] | [ ] | [ ] | [ ] PASS [ ] FAIL |
| Outlook | [ ] | [ ] | [ ] | [ ] | [ ] PASS [ ] FAIL |
| Yahoo | [ ] | [ ] | [ ] | [ ] | [ ] PASS [ ] FAIL |
| Proton | [ ] | [ ] | [ ] | [ ] | [ ] PASS [ ] FAIL |
| iCloud | [ ] | [ ] | [ ] | [ ] | [ ] PASS [ ] FAIL |
| Zoho | [ ] | [ ] | [ ] | [ ] | [ ] PASS [ ] FAIL |
| AOL | [ ] | [ ] | [ ] | [ ] | [ ] PASS [ ] FAIL |

**Summary:**
- **Inbox:** [N/7] ([X%])
- **Promotions (Gmail):** [N/7] ([X%])
- **Spam:** [N/7] ([X%])
- **Other (Update, Social):** [N/7] ([X%])

**Target:** ≥90% inbox placement (≥6/7 seeds in inbox)  
**Gmail Promotions Target:** ≤10% (≤1/7 in Promotions for transactional)

**Result:** [ ] PASS (≥90% inbox) [ ] FAIL (<90% inbox)

---

## Header Analysis (7 Seed Inboxes)

### Gmail Sample Headers
```
Authentication-Results: mx.google.com;
  spf=pass (google.com: domain of bounce@mail.scholaraiadvisor.com designates [IP] as permitted sender) smtp.mailfrom=mail.scholaraiadvisor.com;
  dkim=pass header.i=@mail.scholaraiadvisor.com header.s=[selector1] header.b=[signature];
  dmarc=pass (p=QUARANTINE sp=QUARANTINE dis=NONE) header.from=scholaraiadvisor.com

From: ScholarLink <noreply@mail.scholaraiadvisor.com>
Return-Path: <bounce@mail.scholaraiadvisor.com>
```

**SPF:** [ ] PASS [ ] FAIL  
**DKIM:** [ ] PASS [ ] FAIL  
**DMARC:** [ ] PASS [ ] FAIL  
**Alignment (From/Return-Path):** [ ] PASS [ ] FAIL

### Outlook Sample Headers
```
Authentication-Results: spf=pass (sender IP is [IP])
  smtp.mailfrom=mail.scholaraiadvisor.com; dkim=pass (signature was verified)
  header.d=mail.scholaraiadvisor.com; dmarc=pass action=none
  header.from=scholaraiadvisor.com;

From: ScholarLink <noreply@mail.scholaraiadvisor.com>
Return-Path: <bounce@mail.scholaraiadvisor.com>
```

**SPF:** [ ] PASS [ ] FAIL  
**DKIM:** [ ] PASS [ ] FAIL  
**DMARC:** [ ] PASS [ ] FAIL  
**Alignment:** [ ] PASS [ ] FAIL

### Yahoo Sample Headers
```
Authentication-Results: mta[...].mail.yahoo.com;
  spf=pass smtp.mailfrom=mail.scholaraiadvisor.com;
  dkim=pass header.i=@mail.scholaraiadvisor.com;
  dmarc=pass header.from=scholaraiadvisor.com

From: ScholarLink <noreply@mail.scholaraiadvisor.com>
Return-Path: <bounce@mail.scholaraiadvisor.com>
```

**SPF:** [ ] PASS [ ] FAIL  
**DKIM:** [ ] PASS [ ] FAIL  
**DMARC:** [ ] PASS [ ] FAIL  
**Alignment:** [ ] PASS [ ] FAIL

### Proton Sample Headers
```
[Proton authentication results]
```

**SPF:** [ ] PASS [ ] FAIL  
**DKIM:** [ ] PASS [ ] FAIL  
**DMARC:** [ ] PASS [ ] FAIL

### iCloud Sample Headers
```
[iCloud authentication results]
```

**SPF:** [ ] PASS [ ] FAIL  
**DKIM:** [ ] PASS [ ] FAIL  
**DMARC:** [ ] PASS [ ] FAIL

### Zoho Sample Headers
```
[Zoho authentication results]
```

**SPF:** [ ] PASS [ ] FAIL  
**DKIM:** [ ] PASS [ ] FAIL  
**DMARC:** [ ] PASS [ ] FAIL

### AOL Sample Headers
```
[AOL authentication results]
```

**SPF:** [ ] PASS [ ] FAIL  
**DKIM:** [ ] PASS [ ] FAIL  
**DMARC:** [ ] PASS [ ] FAIL

**Overall Header Validation:** [ ] PASS (all 7 seeds auth PASS) [ ] FAIL

---

## Bounce Rate Analysis

**Test Sends:** [N]  
**Hard Bounces:** [N]  
**Soft Bounces:** [N]  
**Delivered:** [N]

**Bounce Rate:** ([Hard Bounces] / [Test Sends]) × 100% = [X%]

**Target:** <0.5% hard bounces (≤0.3% ideal)

**Result:** [ ] PASS (<0.5%) [ ] FAIL (≥0.5%)

**Bounce Details (if any):**
```
[Email] [Bounce Type] [Reason] [Remediation]
```

---

## Blocklist Checks

**Sending IP:** [Postmark IP]  
**Timestamp:** [Timestamp]

### Blocklist Results

| Blocklist | Status | Details |
|-----------|--------|---------|
| Spamhaus ZEN | [ ] CLEAR [ ] LISTED | [Details] |
| SpamCop | [ ] CLEAR [ ] LISTED | [Details] |
| SORBS | [ ] CLEAR [ ] LISTED | [Details] |
| PSBL | [ ] CLEAR [ ] LISTED | [Details] |
| UCEPROTECT | [ ] CLEAR [ ] LISTED | [Details] |
| Barracuda | [ ] CLEAR [ ] LISTED | [Details] |
| SURBL | [ ] CLEAR [ ] LISTED | [Details] |

**Total Listings:** [N] (Target: 0)

**Result:** [ ] PASS (zero listings) [ ] FAIL (1+ listings)

**Delisting Actions (if any):**
```
[Blocklist] [Reason for listing] [Delisting request submitted] [ETA]
```

---

## CAN-SPAM Compliance Validation

**Template Checked:** Activation email (transactional)

### Required Elements
- [ ] Valid "From" name and email address
- [ ] Accurate subject line (no deception)
- [ ] Clear "This is an email from ScholarLink" disclosure
- [ ] Physical postal address in footer
- [ ] List-Unsubscribe header present
- [ ] One-click unsubscribe functional
- [ ] Unsubscribe processed within 10 business days (SOP documented)

**List-Unsubscribe Header:**
```
List-Unsubscribe: <mailto:unsubscribe@scholaraiadvisor.com>, <https://scholaraiadvisor.com/unsubscribe?token=[token]>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

**Result:** [ ] PASS (all elements present) [ ] FAIL (missing elements)

---

## Domain Alignment Verification

**Objective:** Ensure From, Return-Path, and SPF domains align for DMARC

### Alignment Check
```
From: ScholarLink <noreply@mail.scholaraiadvisor.com>
Return-Path: <bounce@mail.scholaraiadvisor.com>
SPF: v=spf1 include:spf.mtasv.net -all (mail.scholaraiadvisor.com)
DKIM: header.d=mail.scholaraiadvisor.com
DMARC: header.from=scholaraiadvisor.com (p=quarantine, alignment=strict)
```

**Organizational Domain:** scholaraiadvisor.com  
**From Domain:** mail.scholaraiadvisor.com ✅  
**Return-Path Domain:** mail.scholaraiadvisor.com ✅  
**SPF Domain:** mail.scholaraiadvisor.com ✅  
**DKIM Domain:** mail.scholaraiadvisor.com ✅

**Alignment:** [ ] PASS (strict alignment met) [ ] FAIL (alignment broken)

---

## Postmark Metrics Snapshot

**Domain:** mail.scholaraiadvisor.com  
**Time Range:** T+0 to T+90

**Sent:** [N]  
**Delivered:** [N] ([X%])  
**Opened:** [N] ([X%])  
**Clicked:** [N] ([X%])  
**Bounced:** [N] ([X%])  
**Spam Complaints:** [N] ([X%])

**Delivery Rate:** [X%] (Target: ≥99%)  
**Bounce Rate:** [X%] (Target: <0.5%)  
**Complaint Rate:** [X%] (Target: <0.1%)

**Screenshot:** [Link to Postmark dashboard]

---

## Remediation Path (If Placement <80%)

**CEO Directive:** Only switch vendors if seed placement <80% after two remediations

**Current Placement:** [X%]

### Remediation Attempt 1 (if <90%)
- [ ] Adjust email content (reduce promotional language)
- [ ] Verify sender reputation
- [ ] Check authentication alignment
- [ ] Retest with seed inboxes
- [ ] Document results

**Result:** [X% placement after remediation 1]

### Remediation Attempt 2 (if still <90%)
- [ ] [Specific action]
- [ ] [Specific action]
- [ ] Retest with seed inboxes
- [ ] Document results

**Result:** [X% placement after remediation 2]

### Vendor Switch Decision
**Trigger:** Placement <80% after two remediation attempts

**Decision:** [ ] Stay with Postmark (placement ≥80%) [ ] Escalate vendor switch (placement <80%)

---

## Dedicated IP Assessment

**CEO Directive:** No dedicated IP until steady-state volumes justify warm-up

**Current Status:**
- Postmark shared transactional pool: [ ] ACTIVE
- Sending volume: [N emails/day]
- Reputation: [Shared pool status]

**Dedicated IP Criteria (NOT MET):**
- Steady-state volume ≥100k emails/month
- 30-day IP warmup plan required
- Sender reputation established

**Recommendation:** [ ] Stay on shared pool [ ] Escalate dedicated IP discussion

---

## Known Issues & Observations

| Issue ID | Severity | Description | Impact | Remediation | Status |
|----------|----------|-------------|---------|-------------|--------|
| [ID-001] | [P0/P1/P2] | [Description] | [Impact] | [Plan] | [Open/Fixed] |

---

## Deliverability GREEN Certification

**Success Criteria (ALL must PASS):**
- [ ] SPF/DKIM/DMARC PASS with alignment
- [ ] DMARC policy p=quarantine confirmed
- [ ] Seed inbox placement ≥90%
- [ ] Gmail Promotions ≤10% (for transactional)
- [ ] Bounce rate ≤0.3%
- [ ] Zero blocklist hits
- [ ] CAN-SPAM compliance PASS
- [ ] Domain alignment PASS

**Overall Certification:** [ ] GREEN (all criteria met) [ ] RED (remediation required)

**Justification:**
- [Point 1]
- [Point 2]
- [Point 3]

**Conditions (if GREEN):**
- DMARC p=quarantine (warmup mode)
- Move to p=reject after: 7-day positive signal OR seed placement ≥95% + bounces <0.3%
- Monitor daily for first 7 days post-launch

**Remediation Plan (if RED):**
- [Action 1] [Owner] [ETA]
- [Action 2] [Owner] [ETA]

---

## Appendix

**DNS Screenshots:** [Link]  
**Postmark Verification:** [Link]  
**Seed Inbox Screenshots:** [Link]  
**Header Analysis Files:** [Link]  
**Blocklist Check Results:** [Link]

**Evidence Compiled By:** Agent3 (auto_com_center Deliverability Executor)  
**Evidence Reviewed By:** [CEO]  
**Timestamp:** [YYYY-MM-DD HH:MM:SS UTC]

---

## Next Actions (Post-Certification)

**If GREEN:**
1. [ ] CEO GREEN signal issued
2. [ ] Comms/charging freeze lifted (with Stripe PASS)
3. [ ] Enable activation email flows (student_pilot)
4. [ ] Enable conversion messaging (provider_register)
5. [ ] Monitor deliverability metrics daily (7-day warmup)

**If RED:**
1. [ ] Execute remediation plan
2. [ ] Maintain comms freeze
3. [ ] Retest within [X hours]
4. [ ] Update ETA for GREEN certification
