# Overview

ScholarLink is a scholarship management platform designed to help students discover, apply for, and manage scholarships. It offers personalized matching, application tracking, document management, and AI-powered essay assistance. The platform aims to increase student engagement, streamline the application process, and provide insights into scholarship competitiveness. The business vision is to achieve $10M profitable ARR in 5 years through AI-driven scholarship access, monetized via B2C credit sales and B2B partnerships.

## CEO Executive Orders - Nov 10, 2025 (FINAL APPROVED)

**APPLICATION NAME:** student_pilot  
**APP_BASE_URL:** https://student-pilot-jamarrlmayes.replit.app

**CEO Decision:** ✅ Conditional GO for Nov 13, 16:00 UTC

**CEO Acceptance:** "I accept the evidence and statuses presented." - ARR ignition trajectory on track pending Gates A, B, C.

### student_pilot Executive Orders

**1. Gate A Contingency (CRITICAL)**
- ✅ Enforce contingency to operate without email if Gate A fails
- ✅ Immediately switch to in-app notifications only
- ✅ DO NOT pause student_pilot onboarding
- Fallback implemented and documented

**2. Activation Telemetry (CEO PRIORITY)**
- ✅ "First document upload" activation telemetry LIVE
- ✅ TTV tracking operational
- ✅ Daily KPI rollups include activation metrics
- Core B2C conversion lever per Five-Year Playbook

**3. Rollback Capability (OPERATIONAL READINESS)**
- ✅ Refund and rollback runbook at hand
- ✅ Ready for T+24/T+48 evidence collection post-launch
- ✅ Full/partial/credit-only strategies documented

### Evidence Status (CEO ACCEPTED)

1. ✅ **UAT Results** - 11/12 test cases PASS
2. ✅ **Activation Funnel Telemetry** - First-document tracking operational
3. ✅ **Rollback/Refund Runbook** - Comprehensive procedures documented

**Executive Root Index:** [evidence_root/EXECUTIVE_ROOT_INDEX.md](evidence_root/EXECUTIVE_ROOT_INDEX.md)

### Gate Schedule & Dependencies

| Gate | Owner | Deadline | PASS Criteria | Evidence Due |
|------|-------|----------|---------------|--------------|
| **Gate B (Stripe)** | provider_register + Finance | Nov 11, 18:00 UTC | Live key validation, webhook receipt, 3% fee logs, refund test | 18:15 UTC |
| **Gate A (Deliverability)** | auto_com_center | Nov 11, 20:00 UTC | SPF/DKIM/DMARC aligned, inbox ≥80%, complaint ≤0.1%, bounce ≤2% | 20:15 UTC |
| **Gate C (Auth P95)** | scholar_auth | Nov 12, 20:00 UTC | P95 ≤120ms under load, ≥99.5% success, audit lineage | 20:15 UTC |
| **student_pilot GO/NO-GO** | CEO | Nov 13, 16:00 UTC | All gates PASS | Final decision |

**Gate A Contingency (CEO Order):**
- If FAIL: auto_com_center switches to in-app notifications immediately
- student_pilot continues onboarding (no pause)
- Retry window: Nov 12, 12:00 UTC

### ARR Ignition Timeline

**B2C Credit Sales (4× AI Markup):**
- Earliest: Nov 13-15
- Contingent on: Gate A + Gate C PASS
- Revenue Role: Direct (student_pilot)

**B2B Platform Fees (3%):**
- Earliest: Nov 14-15
- Contingent on: Gate A + Gate B + Gate C PASS
- Revenue Role: Enables (provider_register)

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

### Ecosystem Status

- ✅ **auto_page_maker:** GO (Frozen) - SEO flywheel protected
- ✅ **scholarship_api:** GO (Frozen) - 100% request_id coverage
- ⏳ **scholar_auth:** Conditional GO - Gate C owner, Option A MFA approved
- ⏳ **auto_com_center:** Conditional GO - Gate A owner
- ⏳ **provider_register:** Ready - pending Gates B+C
- ⏳ **scholarship_sage:** Observer/Frozen - fairness spec due Nov 12, 22:00
- ⏳ **scholarship_agent:** Observer/Frozen - parity violations remediation
- 🟡 **student_pilot:** Conditional GO - this app, final decision Nov 13, 16:00

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