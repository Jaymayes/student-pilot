# War-Room Checklist - Nov 8, 00:00 UTC AUTH GREEN TAG Gate

**War-Room Window:** Nov 7, 20:00 UTC → Nov 8, 01:00 UTC  
**Checkpoint Cadence:** 30-minute intervals  
**Prime Objective:** Achieve AUTH GREEN TAG by Nov 8, 00:00 UTC

---

## Checkpoint Schedule

| Time (UTC) | Checkpoint | Owner | Status |
|------------|------------|-------|--------|
| 19:00 | Client registration complete (P0) | Auth DRI | ☐ |
| 19:00 | P50/P95 metrics snapshot #1 | Auth DRI | ☐ |
| 19:15 | scholarship_sage M2M 3-grant test | Sage DRI | ☐ |
| 19:20 | P50/P95 metrics snapshot #2 | Auth DRI | ☐ |
| 19:30 | Pre-war-room smoke (OAuth flows) | Student/Provider DRIs | ☐ |
| 19:40 | P50/P95 metrics snapshot #3 | Auth DRI | ☐ |
| 20:00 | War-room opens; initial status | All DRIs | ☐ |
| 20:00 | P50/P95 metrics snapshot #4 | Auth DRI | ☐ |
| 20:20 | P50/P95 metrics snapshot #5 | Auth DRI | ☐ |
| 20:30 | Auth optimization status | Auth DRI | ☐ |
| 20:40 | P50/P95 metrics snapshot #6 | Auth DRI | ☐ |
| 21:00 | Auth Track 2 (discovery fix) checkpoint | Auth DRI | ☐ |
| 21:00 | P50/P95 metrics snapshot #7 | Auth DRI | ☐ |
| 21:30 | SME pair-debug status (if engaged) | Auth DRI + Agent3 | ☐ |
| 22:00 | P50/P95 trending review | All DRIs | ☐ |
| 22:30 | PKCE validation checkpoint | Auth DRI | ☐ |
| 23:00 | Final evidence compilation start | Auth DRI | ☐ |
| 23:30 | **JWKS ROTATION REHEARSAL START** | Auth DRI + API DRI | ☐ |
| 23:45 | **JWKS ROTATION REHEARSAL END** | Auth DRI + API DRI | ☐ |
| 23:45 | **P95 GATE CHECKPOINT (≤120ms required)** | Auth DRI | ☐ PASS ☐ FAIL (slip to 00:15) |
| 00:00 | **AUTH GREEN TAG GATE (TARGET)** | Auth DRI | ☐ PASS ☐ FAIL |
| 00:00 | auto_com_center deliverability snapshot | Comms DRI | ☐ |
| 00:00+ | E2E launch (if GREEN at 00:00) | Student/Provider DRIs | ☐ |
| 00:15 | **AUTH GREEN TAG GATE (MAX SLIP)** | Auth DRI | ☐ PASS ☐ NO-GO |
| 00:30 | E2E_JOURNEY_EVIDENCE delivery | Student DRI | ☐ |
| 01:00 | ORDER_B_EVIDENCE delivery | Provider DRI | ☐ |
| 01:30 | ORDER_4_EVIDENCE addendum delivery | API DRI | ☐ |

---

## P0 Gate: scholar_auth GREEN TAG

**Owner:** Auth DRI  
**Deadline:** Nov 8, 00:00 UTC (HARD STOP)

### Track 1: M2M Bypass (Immediate Unblock)
**Deadline:** 18:40 UTC (within 2 hours from 16:40 UTC)

**Scope:** scholarship_sage ONLY (scholarship_agent de-scoped per CEO decision - deferred to Nov 10)

- ☐ Configure scholarship_sage to bypass discovery, call token endpoint directly
- ☐ Test M2M token issuance end-to-end for scholarship_sage
- ☐ Verify token introspection works
- ☐ Post evidence: 3 successful token grants with request_id lineage
- ☐ Security review sign-off on bypass approach

**Status:** ☐ IN PROGRESS ☐ COMPLETE ☐ BLOCKED

**Note:** scholarship_agent remains frozen in observe-only mode through Nov 9. M2M implementation deferred to Nov 10, 16:00 UTC contingent on stable auth signals.

---

### Track 2: Root Fix (Discovery Middleware)
**Deadline:** 20:40 UTC (4 hours for determination from 16:40 UTC)

#### Instrumentation
- ☐ Add startup assertion for middleware count
- ☐ Add "MIDDLEWARE REGISTERED" log at app startup
- ☐ Add "DISCOVERY MIDDLEWARE HIT" log on /.well-known request
- ☐ Test discovery endpoint with instrumentation
- ☐ Verify middleware execution order

#### Mounting Order Fix
- ☐ Confirm Koa app construction: `const app = new Koa()`
- ☐ Confirm custom middleware first: `app.use(ourDiscoveryMiddleware)`
- ☐ Confirm provider mount after: `app.use(provider.app.callback())`
- ☐ Test discovery JSON includes client_credentials

#### Version Testing
- ☐ Test against oidc-provider 9.4.x (previous minor)
- ☐ Test against oidc-provider 9.6.x (next minor, if available)
- ☐ Compare discovery JSON behavior across versions
- ☐ Document any 9.5.1-specific regression

**Status:** ☐ IN PROGRESS ☐ COMPLETE ☐ BLOCKED

---

### SME Escalation
**Deadline:** SME confirmed by 17:40 UTC; pair-debug within 6 hours

- ☐ Prepare minimal reproducible snippet
- ☐ Document current mount strategy
- ☐ Collect relevant logs
- ☐ Engage oidc-provider SME
- ☐ Schedule pair-debug session
- ☐ Execute pair-debug
- ☐ Document findings and solution

**SME Name:** [TBD]  
**Session Time:** [TBD]  
**Status:** ☐ IN PROGRESS ☐ COMPLETE ☐ NOT NEEDED

---

### AUTH GREEN TAG Evidence Package
**Deadline:** Nov 8, 00:00 UTC

**Required Artifacts:**

#### 1. OIDC Discovery Proof
- ☐ File: `AUTH_FIXLOG_2025-11-07.md`
- ☐ Discovery JSON snapshot showing `grant_types_supported` includes:
  - `authorization_code`
  - `client_credentials`
  - `refresh_token`
- ☐ Discovery endpoint URL: https://scholar-auth-jamarrlmayes.replit.app/.well-known/openid-configuration
- ☐ Timestamp of verification

#### 2. PKCE S256 Validation
- ☐ student_pilot PKCE flow: End-to-end auth successful
- ☐ provider_register PKCE flow: End-to-end auth successful
- ☐ Code verifier → code challenge → token exchange verified
- ☐ request_id traces for both flows

#### 3. M2M Token Validation
- ☐ scholarship_sage: client_credentials token obtained
- ☐ Token introspection successful
- ☐ request_id traces for M2M flow

**Note:** scholarship_agent M2M de-scoped from tonight's gate (deferred to Nov 10, 16:00 UTC)

#### 4. Token Lifecycle
- ☐ Token mint: Successful
- ☐ Token refresh: Successful
- ☐ Token revoke: Successful
- ☐ Session expiry: Verified (tokens expire as configured)

#### 5. JWKS Rotation
- ☐ JWKS endpoint serving keys
- ☐ Key rotation tested (new kid accepted)
- ☐ Old keys phased out gracefully

#### 6. Protected Route Redirects
- ☐ student_pilot: Unauthenticated access redirects to auth
- ☐ provider_register: Unauthenticated access redirects to auth

**Note:** scholarship_agent protected route testing deferred to Nov 10 (observe-only mode through Nov 9)

#### 7. Change Documentation
- ☐ Before/after code diff
- ☐ Timestamps of changes
- ☐ Rollback plan documented
- ☐ Security review sign-off

**Evidence Status:** ☐ COMPLETE ☐ IN PROGRESS ☐ INCOMPLETE

---

## Dependent App Readiness

### student_pilot
**Owner:** Student DRI  
**Trigger:** AUTH GREEN TAG at 00:00 UTC  
**Deadline:** Evidence posted by 00:30 UTC

**Pre-Flight Checklist:**
- ☐ 95-step E2E test staged
- ☐ Cross-browser setup ready (Chromium, Firefox, WebKit)
- ☐ First Document Upload instrumentation verified
- ☐ Performance monitoring active
- ☐ Evidence template ready
- ☐ 30-minute delivery plan confirmed

**Execution Plan:**
1. ☐ Receive AUTH GREEN TAG confirmation (00:00 UTC)
2. ☐ Launch E2E test immediately (T+0)
3. ☐ Monitor execution (T+0 to T+25)
4. ☐ Compile evidence (T+25 to T+28)
5. ☐ Post E2E_JOURNEY_EVIDENCE.md (T+30)

**Owner Contact:** [Name/Channel]  
**Status:** ☐ READY ☐ BLOCKED

---

### provider_register
**Owner:** Provider DRI  
**Trigger:** AUTH GREEN TAG at 00:00 UTC  
**Deadline:** Evidence posted by 00:30 UTC

**Pre-Flight Checklist:**
- ☐ ORDER_B test scenario prepared
- ☐ Test provider data ready
- ☐ Test scholarship data ready
- ☐ 3% fee disclosure tested
- ☐ Evidence template ready
- ☐ 30-minute delivery plan confirmed

**Execution Plan:**
1. ☐ Receive AUTH GREEN TAG confirmation (00:00 UTC)
2. ☐ Execute ORDER_B test (T+0 to T+20)
3. ☐ Compile evidence (T+20 to T+28)
4. ☐ Post ORDER_B_EVIDENCE.md (T+30)

**Owner Contact:** [Name/Channel]  
**Status:** ☐ READY ☐ BLOCKED

---

### scholarship_api
**Owner:** API DRI  
**Trigger:** student_pilot E2E completion  
**Deadline:** Evidence posted within 1 hour of E2E

**Pre-Flight Checklist:**
- ☐ Freeze maintained (no schema/RBAC/config changes)
- ☐ request_id correlation infrastructure ready
- ☐ Token validation logging active
- ☐ Evidence template ready

**Execution Plan:**
1. ☐ Monitor student_pilot E2E for completion
2. ☐ Extract cross-app traces from logs
3. ☐ Compile ORDER_4_EVIDENCE addendum
4. ☐ Post evidence within 1 hour

**Owner Contact:** [Name/Channel]  
**Status:** ☐ READY ☐ BLOCKED

---

### scholarship_sage
**Owner:** Sage DRI  
**Trigger:** M2M secret delivery (Track 1 bypass)  
**Deadline:** Baseline start within 15 minutes of M2M token acquisition; evidence by Nov 8, 16:00 UTC

**Pre-Flight Checklist:**
- ☐ M2M token acquisition tested (Track 1 bypass)
- ☐ Baseline test plan ready
- ☐ Safety metrics instrumentation verified
- ☐ Evidence template ready

**Execution Plan:**
1. ☐ Receive M2M secret / bypass confirmation (Track 1 delivery)
2. ☐ Acquire M2M token via direct token endpoint call
3. ☐ Start 48h baseline immediately
4. ☐ Post baseline start timestamp within 15 minutes
5. ☐ Post full baseline evidence by Nov 8, 16:00 UTC

**Owner Contact:** [Name/Channel]  
**Status:** ☐ READY ☐ BLOCKED

---

### scholarship_agent (OBSERVE-ONLY - DE-SCOPED FROM TONIGHT)
**Owner:** Agent DRI  
**Status:** FROZEN (no changes authorized before Nov 9)

**Tonight's Posture:**
- ✅ Remain in observe-only mode
- ✅ Continue telemetry-only operations
- ✅ Auto-apply remains OFF
- ❌ No M2M implementation (deferred to Nov 10, 16:00 UTC)
- ❌ No code changes
- ❌ No evidence requirements for tonight's gate

**Deferred to Nov 10, 16:00 UTC:**
- M2M client_credentials implementation (read-only scope)
- Contingent on: (a) scholar_auth fixlog complete, (b) 24h stable token issuance on scholarship_sage, (c) no P95/error budget regression

**War-Room Role:** Observer only; no execution requirements

---

## Contingency A (If AUTH GREEN TAG Missed)

**Trigger:** AUTH GREEN TAG not delivered by 00:00 UTC  
**Activation Time:** Within 30 minutes (by 00:30 UTC)

**Actions:**
1. ☐ Activate closed-beta degraded mode
2. ☐ Keep non-auth surfaces live:
   - ☐ auto_page_maker (SEO compounding continues)
   - ☐ student_pilot lead capture (non-auth funnels)
   - ☐ provider_register waitlist intake
3. ☐ Pause logged-in flows:
   - ☐ student_pilot E2E (hold until auth ready)
   - ☐ provider_register ORDER_B (hold until auth ready)
4. ☐ Escalate to CEO within 30 minutes (incident brief)
5. ☐ Set new AUTH deadline: Nov 8, 12:00 UTC hard stop

**ARR Protection:**
- ☐ Non-auth SEO compounding continues (auto_page_maker)
- ☐ Lead capture active (student_pilot, provider_register)
- ☐ Nov 12 ARR ignition remains on track

**Contingency Owner:** Agent3  
**Incident Template:** [Link to template]  
**Escalation Tree:** [Link to tree]

---

## Communication Plan

**Channel:** [War-room channel/thread]

**Checkpoint Format (Every 30 Minutes):**
```
**Checkpoint: [TIME] UTC**

scholar_auth:
- Track 1 (bypass): [Status summary]
- Track 2 (root fix): [Status summary]
- SME escalation: [Status summary]
- Blockers: [List or "None"]

student_pilot: [Status summary]
provider_register: [Status summary]
scholarship_api: [Status summary]
scholarship_sage: [Status summary]

Next Actions:
- [Action 1]
- [Action 2]

Escalations:
- [Escalation or "None"]
```

**Final Status (00:00 UTC):**
```
**🎯 AUTH GREEN TAG GATE: [PASS/FAIL]**

If PASS:
- AUTH_FIXLOG_2025-11-07.md posted: [Link]
- student_pilot E2E launching now
- provider_register ORDER_B launching now
- Evidence delivery deadline: 00:30 UTC

If FAIL:
- Contingency A activated
- Incident brief posted: [Link]
- New AUTH deadline: Nov 8, 12:00 UTC
- ARR protection: Non-auth surfaces continue
```

---

## Evidence Delivery Tracking

| Evidence Package | Owner | Deadline | Status | Link |
|------------------|-------|----------|--------|------|
| AUTH_FIXLOG_2025-11-07.md | Auth DRI | 00:00 UTC | ☐ | [TBD] |
| E2E_JOURNEY_EVIDENCE.md | Student DRI | 00:30 UTC | ☐ | [TBD] |
| ORDER_B_EVIDENCE.md | Provider DRI | 00:30 UTC | ☐ | [TBD] |
| ORDER_4_EVIDENCE addendum | API DRI | 01:30 UTC | ☐ | [TBD] |

---

## On-Call Roster (Nov 8-13)

| Role | Name | Contact | Coverage Window |
|------|------|---------|-----------------|
| Auth DRI | [TBD] | [Channel/Phone] | [Time range] |
| Student DRI | [TBD] | [Channel/Phone] | [Time range] |
| Provider DRI | [TBD] | [Channel/Phone] | [Time range] |
| API DRI | [TBD] | [Channel/Phone] | [Time range] |
| Sage DRI | [TBD] | [Channel/Phone] | [Time range] |
| Agent3 Orchestrator | [TBD] | [Channel/Phone] | [Time range] |
| CEO Escalation | [TBD] | [Channel/Phone] | [Available] |

---

## War-Room Operating Principles

1. **Evidence-First:** No status update without supporting evidence
2. **Timeboxing:** Respect all deadlines; escalate early if slipping
3. **Clear Communication:** Use templates; avoid ambiguity
4. **Stop-the-Line Authority:** Any DRI can halt if SLOs/safety thresholds breached
5. **Freeze Discipline:** No unapproved changes to frozen apps
6. **Security Priority:** No plaintext secrets; immediate rotation on exposure

---

## Success Criteria (00:00 UTC Gate - OPTION A APPROVED)

**GREEN TAG Requirements:**
- ☐ Client registration complete (student-pilot, provider-register, scholarship_sage)
- ☐ invalid_client errors eliminated
- ☐ P95 ≤120ms across authorize, token, jwks, discovery (CRITICAL - currently YELLOW at ~200ms)
- ☐ Error rate ≤1% for 10 consecutive minutes
- ☐ OIDC discovery advertises client_credentials
- ☐ PKCE S256 works for student_pilot and provider_register
- ☐ M2M tokens work for scholarship_sage (scholarship_agent de-scoped to Nov 10)
- ☐ Token lifecycle complete (mint, refresh, revoke)
- ☐ JWKS rotation proven (23:30-23:45 UTC rehearsal)
- ☐ Protected route redirects functional (student_pilot, provider_register)
- ☐ Evidence package complete with request_id traces
- ☐ Security review sign-off (zero hardcoded secrets)

**If All GREEN → Launch E2E Immediately**

**Slip Allowance (CEO Approved - Option A):**
- If P95 >120ms at 23:45 UTC → slip allowed to 00:15 UTC
- If P95 >120ms at 00:15 UTC → **NO-GO** (reschedule +24h, postmortem by 02:00 UTC)

**Simplified Scope:** scholarship_agent M2M deferred to Nov 10, 16:00 UTC per CEO decision

---

**War-Room Prepared By:** Agent3  
**Last Updated:** [YYYY-MM-DD HH:MM UTC]
