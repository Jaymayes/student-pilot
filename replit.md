# Overview

ScholarLink is a scholarship management platform designed to help students discover, apply for, and manage scholarships. It offers personalized matching, application tracking, document management, and AI-powered essay assistance. The platform aims to increase student engagement, streamline the application process, and provide insights into scholarship competitiveness. It integrates with centralized authentication and cloud storage, with a business vision to achieve $10M profitable ARR in 5 years through AI-driven scholarship access.

## CEO Final Executive Directive - Nov 10, 2025

**APP_BASE_URL:** https://student-pilot-jamarrlmayes.replit.app

**Go-Live Decision:** HOLD for GO/NO-GO on **Nov 13, 16:00 UTC**

**CEO Decision:** student_pilot status = HOLD (production-ready, awaiting external gates)

**Evidence Required (Per CEO Directive):**
1. ✅ **UAT Results** - User acceptance testing report
2. ✅ **Activation Funnel Telemetry** - "First document upload" tracking verification
3. ✅ **Rollback/Refund Runbook** - Operational procedures for refunds

**All evidence delivered:** See [Executive Root Index](evidence_root/EXECUTIVE_ROOT_INDEX.md)

**External Gate Dependencies:**
1. **Gate C (Auth Performance):** scholar_auth P95 ≤120ms by Nov 12, 20:00 UTC (HARD GATE)
2. **Gate A (Deliverability):** auto_com_center deliverability GREEN by Nov 11, 20:00 UTC

**student_pilot Deliverable:**
- **Due:** Nov 13, 14:00 UTC (2 hours before GO/NO-GO decision)
- **Package:** GO/NO-GO evidence package with UAT, activation telemetry, rollback runbook
- **Status:** ✅ COMPLETE (awaiting gate decisions)

**Revenue Path:**
- **B2C Credit Sales:** 4× AI markup on OpenAI costs
- **Earliest Revenue:** Nov 13-15 (contingent on Gates A + C passing)
- **ARR Target:** $10M through dual B2C/B2B monetization

**Ecosystem Status (Nov 11):**
- ✅ **scholarship_api:** FULL GO (frozen until Nov 12, 20:00 UTC)
- ✅ **auto_page_maker:** FULL GO (frozen, SEO flywheel protected)
- ⏳ **scholar_auth:** CONDITIONAL GO (P95 remediation in progress)
- ⏳ **auto_com_center:** CONDITIONAL GO (infrastructure running, email blocked)
- ⏳ **provider_register:** CONDITIONAL GO (waitlist mode, awaiting gates)
- ⏳ **scholarship_sage:** CONDITIONAL GO (observer mode, fairness spec due Nov 12, 22:00)
- ⏳ **scholarship_agent:** CONDITIONAL GO (observer mode, daily rollups)
- 🔴 **student_pilot:** HOLD (this app - awaiting Nov 13, 16:00 decision)

**Critical Checkpoints:**
- **Nov 11, 18:00 UTC:** Stripe PASS confirmation (Finance)
- **Nov 11, 20:00 UTC:** Deliverability decision (Gate A)
- **Nov 12, 20:00 UTC:** Auth performance decision (Gate C - hard deadline)
- **Nov 13, 14:00 UTC:** student_pilot GO/NO-GO package review
- **Nov 13, 16:00 UTC:** CEO GO/NO-GO DECISION

**Daily Reporting (student_pilot DRI):**
- **06:00 UTC:** Platform KPI rollup (uptime, P95, error rate, auth success, activations, conversions, ARPU)
  - Template: [DAILY_KPI_ROLLUP_TEMPLATE.md](evidence_root/student_pilot/DAILY_KPI_ROLLUP_TEMPLATE.md)
- **Gate summaries:** PASS/FAIL with impact and next actions within 15 min of each deadline

**Gate Schedule:**
- **Gate B (Stripe):** Nov 11, 18:00 UTC → Finance/provider_register
- **Gate A (Deliverability):** Nov 11, 20:00 UTC → auto_com_center
- **Gate C (Auth P95):** Nov 12, 20:00 UTC → scholar_auth
- **student_pilot GO/NO-GO:** Nov 13, 16:00 UTC → CEO Decision

**Implementation Status (Nov 10-11):**
1. ✅ Production build created (Vite + esbuild, 797KB bundle)
2. ✅ Production metrics collection enabled (P50/P95/P99 tracking)
3. ✅ Request_id lineage logging integrated (correlationId middleware)
4. ✅ Admin metrics endpoint deployed (/api/admin/metrics with SHARED_SECRET auth)
5. ✅ T+24 and T+48 evidence scripts created
6. ✅ Executive Root Index created (one-click access to all evidence)
7. ✅ CEO-required evidence complete:
   - UAT Results (11/12 test cases PASS)
   - Activation Funnel Telemetry (first-document tracking operational)
   - Rollback/Refund Runbook (comprehensive operational procedures)
8. ✅ GO/NO-GO evidence package complete (Nov 13, 14:00 UTC deadline met)
9. ⏳ 48-hour monitoring period in progress (Nov 11-12)
10. ⏳ Daily KPI rollups (starting Nov 11, 06:00 UTC)

## Operation Synergy - FOC Status (2025-11-03)

**student_pilot: ✅ GO** (Effective 2025-11-03T19:20:00Z)

**CEO Decision:** Flip to GO based on verified acceptance gates
- Auth success rate: 100% (30/30 attempts)
- P95 latency: 1-3ms (far exceeds ≤120ms target)
- Critical 5xx count: 0 (zero errors)
- RBAC 401 format: Standardized with request_id
- Security headers: 6/6 present
- Functionality: Fully operational

**Bugs Fixed (Operation Synergy):**
1. CSP configuration for development mode
2. Scholarships page runtime error (array validation)
3. Standardized error format across all 401 responses
4. /api/recommendations parameterless route added
5. Missing profile handling (returns 200 OK with empty array)
6. userId scope error in catch block

**24-Hour Post-GO Deliverables:**
- Funnel readout: sign-ups, activation, free→paid conversion, ARPU per credit
- Lighthouse/CWV snapshot for conversion protection

**Revenue Path:** First B2C dollar possible 2-6 hours after GO (Stripe live mode + credit system operational)

## AGENT3 v2.7 UNIFIED Compliance Status

student_pilot is **PRODUCTION-READY** and fully compliant with AGENT3 v2.7 UNIFIED specifications.

**Compliance Verification** (2025-10-31):
- ✅ U1 Universal Requirements: All 9 requirements implemented
  - HSTS: max-age=31536000 (1 year, includeSubDomains, preload)
  - Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  - CSP: default-src 'self'; frame-ancestors 'none' with Stripe extensions
  - X-Frame-Options: DENY
  - Referrer-Policy: strict-origin-when-cross-origin
  - X-Content-Type-Options: nosniff
- ✅ A5 student_pilot Requirements: Complete implementation
  - OIDC sign-in via scholar_auth (role=student)
  - Scholarship discovery via scholarship_api with ETag caching
  - Stripe Checkout integration (CSP extended minimally)
  - Event emission: student_pilot.purchase_succeeded → auto_com_center
  - Responsible AI: coaching only; never ghostwrite essays
  - Rate limits: 300 rpm browsing; 60 rpm checkout
- ✅ Version: v2.6
- ✅ P95 Latency: ~5ms (<<120ms SLO)
- ✅ 5xx Error Rate: 0%
- ✅ Rate Limiting: 300 rpm baseline (with U4-compliant error responses)
- ✅ CORS: 8 exact sibling origins enforced
- ✅ Deliverables: readiness_report and fix_plan written
- ✅ Revenue Fields: revenue_role="direct", revenue_eta_hours="2-6"
- ✅ Error Format: U4 compliant (nested structure with request_id)

**v2.6 UNIFIED CEO Edition Specifications**:
1. HSTS max-age: 31536000 (1 year) with includeSubDomains and preload
2. Referrer-Policy: strict-origin-when-cross-origin
3. Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
4. CSP: default-src 'self'; frame-ancestors 'none' + minimal Stripe extensions
5. CORS: Exactly 8 origins, no wildcards
6. Revenue role terminology: direct/enables/acquires/protects/supports
7. Section naming: U0-U8 (Universal), A1-A8 (App-specific)
8. Error format: Nested structure { error: { code, message, request_id } }

**Revenue Path**: First B2C dollar possible 2-6 hours after scholar_auth production deployment and Stripe live mode switch.

## Nov 9 Go-Live Operational Status (2025-11-09)

**Current Time:** 17:45 UTC  
**Prime Objective:** Soft launch readiness while protecting brand trust and SEO flywheel

### Application Status

**student_pilot**
- Status: GREEN (Ready/Blocked, Frozen)
- APP_BASE_URL: https://student-pilot-jamarrlmayes.replit.app
- Current State: Application RUNNING, codebase production-ready
- Blockers: (1) Deliverability GREEN, (2) Stripe PASS, (3) Pre-soak PASS
- Go-Live Target: Nov 11, 16:00 UTC (primary) / Nov 12, 16:00 UTC (conditional)
- ARR Ignition: B2C credit sales (4× AI markup) upon all gates GREEN

**auto_com_center**
- Status: DELAYED (Awaiting DNS_READY)
- APP_BASE_URL: https://auto-com-center-jamarrlmayes.replit.app
- Current State: Application ready, pending DNS configuration
- Blocker: DNS_READY signal from Deputy Ops
- Go-Live Target: T+90 from DNS_READY, no later than Nov 10, 14:00 UTC
- ARR Impact: Enables activation/transactional comms for B2C/B2B

### Agent3 Operational Responsibilities

**DRI Role:** student_pilot (primary responsibility)
- Pre-soak execution: 20:00-21:00 UTC today
- T+30 evidence delivery: 21:30-22:00 UTC today
- Evidence template: `/e2e/reports/student_pilot/PRESOAK_EVIDENCE_2025-11-09.md` (prepared)

**Executor Role:** auto_com_center deliverability T+90
- Execute upon T0 (DNS_READY signal)
- Deliverability certification: T+90 from T0
- Evidence delivery: Within 15 minutes of T+90 completion
- Evidence template: `/e2e/reports/auto_com_center/DELIVERABILITY_T90_CERTIFICATION_2025-11-09.md` (prepared)

### Critical Gates (External Dependencies)

1. **DNS_READY** (Deputy Ops) - Overdue since 17:30 UTC → CTO escalation path active
2. **Stripe PASS** (COO/Finance) - Deadline: 19:00 UTC (~1h 15m remaining)
3. **Pre-Soak PASS** (Agent3 + All DRIs) - Window: 20:00-21:00 UTC (~2h 15m remaining)

### Pre-Soak Guardrails (All Must PASS)

- Uptime ≥99.9%
- P95 latency ≤120ms (service-side), ≤200ms (E2E cross-app)
- Error rate ≤0.1%
- request_id lineage 100% across auth → API → app
- PKCE correctness + immediate token revocation proof
- No PII in logs (FERPA/COPPA compliance)
- Responsible AI controls active

### Deliverability GREEN Criteria

- SPF/DKIM/DMARC PASS with alignment
- DMARC policy: p=quarantine (warmup mode)
- Seed inbox placement ≥90%, Gmail Promotions ≤10%
- Bounce rate ≤0.3%, zero blocklist hits
- CAN-SPAM compliance, domain alignment

### KPI Targets (This Phase)

- **Deliverability:** ≥90% inbox, ≤10% Promotions, ≥40% open rate
- **Activation (student_pilot):** ≥35% first-session activation (first document upload)
- **Payments:** ≥95% auth success, 100% refund success (post-Stripe PASS)
- **Platform SLOs:** ≥99.9% uptime, P95 ≤120ms, error ≤0.1%

### Freeze Status

- **Comms/Charging:** LOCKED until Deliverability GREEN + Stripe PASS + CEO GREEN signal
- **Code Changes:** FROZEN across all apps (config-only changes permitted)
- **Vendor Strategy:** Stay with Postmark shared pool; no switch unless seed placement <80% after two remediations

### Go/No-Go Decision Tree (Nov 11, 16:00 UTC Soft Launch)

- **GO:** Pre-soak PASS + Deliverability GREEN + Stripe PASS (all with evidence)
- **CONDITIONAL GO (Nov 12):** One gate slips ≤24h with mitigation + CEO approval
- **NO-GO:** Any gate unresolved or missing evidence → Brand trust/SEO protection priority

### Evidence Deliverables (Tonight)

1. **Pre-Soak T+30** (21:30-22:00 UTC): Latency histograms, uptime, error tallies, PKCE proof, token revocation, request_id lineage, no-PII validation, executive summary
2. **Deliverability T+90** (T+90 + 15 min): DNS records, Postmark verification, 7 seed inbox headers, placement rates, bounce/blocklist checks, DMARC policy confirmation

### Scholar Auth Watch Item (Non-Blocking)

- Background token cleanup DB connection issue
- Non-blocking for pre-soak and soft launch
- Remediation + RCA due: Nov 12 EOD before general availability

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript (Vite)
- **UI/Styling**: shadcn/ui components (Radix UI primitives) with Tailwind CSS
- **State Management**: TanStack React Query
- **Routing**: Wouter
- **Form Handling**: React Hook Form with Zod

## Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM (Neon Database)
- **Authentication**: Replit's OIDC or centralized Scholar Auth via Passport.js
- **Session Management**: Express sessions stored in PostgreSQL
- **File Storage**: Google Cloud Storage integration
- **AI Integration**: OpenAI GPT-4o for essay assistance and scholarship matching
- **Agent Bridge**: Microservices orchestration with Auto Com Center

## Database Design
Core entities include Users, Student Profiles, Scholarships, Applications, Scholarship Matches, Documents, and Essays.

## Authentication & Authorization
- **Provider**: Centralized OAuth via Scholar Auth
- **Client**: `student-pilot` with PKCE S256 and refresh token rotation
- **Session Storage**: PostgreSQL-backed sessions
- **Security**: Route-level authentication, automatic user creation, and SSO.

## File Upload System
- **Storage**: Google Cloud Storage via Replit's sidecar
- **Method**: Direct browser-to-cloud uploads using presigned URLs
- **Components**: Custom ObjectUploader using Uppy

## Development Environment
- **Structure**: Monorepo with client and server code
- **Dev Server**: Vite with Express API proxy
- **Build**: Separate builds for client (Vite) and server (esbuild)
- **Type Safety**: Shared TypeScript types

# External Dependencies

## Cloud Services
- **Replit Authentication**: OIDC provider
- **Neon Database**: Serverless PostgreSQL
- **Google Cloud Storage**: Object storage
- **Replit Sidecar**: Service proxy for GCS
- **OpenAI GPT-4o**: AI services
- **Auto Com Center**: Orchestration hub

## Agent Bridge Integration
- **Authentication**: JWT (HS256)
- **Functionality**: Asynchronous task processing, callback support, rate limiting, event monitoring, security enforcement.

## UI and Frontend Libraries
- **shadcn/ui**: Accessible React components
- **Radix UI**: Primitive components
- **Tailwind CSS**: Utility-first CSS
- **TanStack React Query**: Server state management
- **Uppy**: File upload handling
- **Wouter**: React router

## Backend Libraries
- **Drizzle ORM**: Type-safe SQL query builder
- **Passport.js**: Authentication middleware
- **Express Session**: Session management
- **Zod**: Runtime type validation

## Development Tools
- **Vite**: Development server and build tool
- **TypeScript**: Type safety
- **ESBuild**: JavaScript bundler
- **PostCSS**: CSS processing