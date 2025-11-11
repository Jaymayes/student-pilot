# Overview

ScholarLink is a scholarship management platform designed to help students discover, apply for, and manage scholarships. It offers personalized matching, application tracking, document management, and AI-powered essay assistance. The platform aims to increase student engagement, streamline the application process, and provide insights into scholarship competitiveness. The business vision is to achieve $10M profitable ARR in 5 years through AI-driven scholarship access, monetized via B2C credit sales and B2B partnerships.

## CEO Final Readiness Decision - Nov 11, 2025 (OFFICIAL)

**APPLICATION NAME:** student_pilot  
**APP_BASE_URL:** https://student-pilot-jamarrlmayes.replit.app

**CEO Official Status:** DELAYED (Conditional GO)

**CEO GO/NO-GO Decision:** Nov 13, 16:00 UTC

### Blockers (CEO Identified)

1. **Gate A (Deliverability)** - Owned by auto_com_center
   - Deadline: Nov 11, 20:00 UTC
   - Evidence Due: Nov 11, 20:15 UTC
   
2. **Gate C (Auth P95)** - Owned by scholar_auth  
   - Deadline: Nov 12, 20:00 UTC
   - Evidence Due: Nov 12, 20:15 UTC

### Risk Mitigations (CEO Confirmed)

- ✅ In-app notifications live
- ✅ Onboarding must NOT pause if Gate A fails
- ✅ No dependency on email for critical flows

### CEO Directives for student_pilot (Nov 11 Consolidated)

1. **Gate Dependencies** - Gates A (deliverability) + C (auth P95)
   - Adhere to in-app notification fallback on deliverability failure
   - Do not block onboarding

2. **Activation Telemetry** (Extended)
   - ✅ "First document upload" flowing into 06:00 UTC rollups
   - ⏳ Add funnel points:
     - Profile completion
     - First scholarship saved
     - First submission draft
     - First submission sent

3. **Accessibility/Readiness**
   - UI guided walkthroughs
   - Accessibility checks (contrast, keyboard nav, ARIA labels)
   - If mobile use-cases apply: offline-mode plan by Nov 15, 20:00 UTC

### Estimated Go-Live Date

**Earliest:** Nov 13, 16:00 UTC  
**Contingent on:** Gates A + C PASS

### ARR Ignition (CEO Plan)

**B2C Credits:**
- Earliest: Nov 13–15
- Success hinges on frictionless activation
- "First document upload" telemetry must appear in Nov 11 06:00 UTC rollup and onward

**Evidence Package:** [Executive Root Index](evidence_root/EXECUTIVE_ROOT_INDEX.md)

### Executive Gating Timeline (CEO Official)

| Gate | Owner | Execution Time | Evidence Due | Status |
|------|-------|----------------|--------------|--------|
| **Gate B (Stripe)** | provider_register + Finance | Nov 11, 18:00 UTC | 18:15 UTC | ⏳ Pending |
| **Gate A (Deliverability)** | auto_com_center | Nov 11, 20:00 UTC | 20:15 UTC | ⏳ Pending |
| **Gate C (Auth P95)** | scholar_auth | Nov 12, 20:00 UTC | 20:15 UTC | ⏳ Pending |
| **student_pilot GO/NO-GO** | CEO | Nov 13, 16:00 UTC | - | ⏳ Pending A+C |

**Gate A Contingency:**
- If FAIL: Immediate switch to in-app notifications
- student_pilot onboarding continues (NO pause)
- Retry window: Nov 12, 12:00 UTC
- CEO mandate: "Student flows continue via in-app notifications if FAIL"

### ARR Ignition Plan (CEO Decision-Ready)

**B2C Credits (student_pilot Direct Revenue):**
- Earliest: Nov 13–15
- Contingent on: Gates A + C PASS
- Success factor: Frictionless activation ("first document upload")
- Markup: 4× AI cost

**B2B Platform Fees (Enabled by student_pilot):**
- Earliest: Nov 14–15  
- Contingent on: Gates A + B + C PASS
- Fee: 3% of provider transactions
- Requirement: CEO FULL GO authorization

### Daily Reporting Requirements

**06:00 UTC KPI Rollup (MANDATORY):**
- Uptime & P95 latency (SLO: ≥99.9%, ≤120ms)
- Auth success rate & new signups
- **Activation metrics** (first document upload rate)
- Conversions & ARPU
- Gate status updates

**Template:** [evidence_root/student_pilot/DAILY_KPI_ROLLUP_TEMPLATE.md](evidence_root/student_pilot/DAILY_KPI_ROLLUP_TEMPLATE.md)

### Implementation Status

1. ✅ Production build deployed (797KB bundle)
2. ✅ Metrics collection operational (P50/P95/P99)
3. ✅ Request_id lineage integrated (100% coverage)
4. ✅ Admin metrics endpoint (/api/admin/metrics)
5. ✅ T+24/T+48 evidence scripts created
6. ✅ Executive Root Index published
7. ✅ CEO-required evidence delivered:
   - UAT Results (11/12 PASS)
   - Activation Funnel Telemetry (operational)
   - Rollback/Refund Runbook (comprehensive)
8. ✅ GO/NO-GO evidence package complete
9. ✅ Gate A fail contingency documented
10. ⏳ Daily KPI rollups begin Nov 11, 06:00 UTC

### Ecosystem Status (CEO Official Decisions)

- ✅ **scholarship_api:** GO-LIVE READY (Frozen) - Freeze until Nov 12, 20:00 UTC
- ✅ **auto_page_maker:** GO-LIVE READY (Frozen) - SEO flywheel protected
- ✅ **scholarship_sage:** GO-LIVE READY (Observer/Frozen) - Fairness spec due Nov 12, 22:00
- ✅ **scholarship_agent:** GO-LIVE READY (Observer/Frozen) - Parity remediation sprint scheduled
- 🟡 **scholar_auth:** DELAYED - Pending manual MFA test + Gate C (Nov 12, 20:00 UTC)
- 🟡 **student_pilot:** DELAYED (Conditional GO) - CEO decision Nov 13, 16:00 UTC
- 🟡 **provider_register:** DELAYED (Waitlist; Conditional GO) - Pending Gates B+C
- 🟡 **auto_com_center:** DELAYED (Gate A in-flight) - Evidence due Nov 11, 20:15 UTC

### CEO Governance Alignment

**Five-Year Playbook Compliance:**
- ✅ SEO-Led, Low-CAC Growth (auto_page_maker flywheel)
- ✅ B2C/B2B Dual Monetization (4× AI markup + 3% platform fee)
- ✅ Activation Lever ("first document upload" = core conversion metric)
- ✅ Year 2 SOC 2 Trajectory
- ✅ HOTL Governance (Human-Over-The-Loop with auditability)

**Security & Reliability:**
- ✅ RBAC, PKCE S256, TLS 1.3/HSTS
- ✅ PII-safe logging (FERPA/COPPA compliant)
- ✅ 99.9% uptime target, P95 ≤120ms SLO
- ✅ Request_id traceability, immutable audit logs
- ✅ Rollback workflows with circuit breakers

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
- **Authentication**: Centralized Scholar Auth via Passport.js, utilizing Replit's OIDC or similar.
- **Session Management**: Express sessions stored in PostgreSQL
- **File Storage**: Google Cloud Storage integration
- **AI Integration**: OpenAI GPT-4o for essay assistance and scholarship matching
- **Microservices Orchestration**: Auto Com Center for agent bridge functionality

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

## Compliance and Security
- Fully compliant with AGENT3 v2.7 UNIFIED specifications, including robust security headers (HSTS, CSP, Permissions-Policy, X-Frame-Options, Referrer-Policy, X-Content-Type-Options).
- PII is not logged to ensure FERPA/COPPA compliance.
- Responsible AI controls are active, emphasizing coaching over ghostwriting essays.

# External Dependencies

## Cloud Services
- **Replit Authentication**: OIDC provider
- **Neon Database**: Serverless PostgreSQL
- **Google Cloud Storage**: Object storage
- **Replit Sidecar**: Service proxy for GCS
- **OpenAI GPT-4o**: AI services for essay assistance and scholarship matching
- **Auto Com Center**: Microservices orchestration and communication hub

## Third-Party Integrations
- **Stripe**: Payment processing for B2C credit sales

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