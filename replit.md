# Overview

ScholarLink is a comprehensive scholarship management platform designed to help students discover, apply for, and manage scholarships. It offers personalized scholarship matching, application tracking, document management, and AI-powered essay assistance. The platform aims to increase student engagement with scholarships, streamline the application process, and provide valuable insights into scholarship competitiveness. It integrates with centralized authentication and cloud storage, targeting a significant lift in match click-through rates and organic signups.

## Recent Updates

**✅ Universal Prompt v1.1 Final (Must Not Constraints) - Production Ready (October 28, 2025)**: Complete compact universal prompt architecture with numbered overlay format and explicit constraints deployed. **Compact Format**: Production-ready docs/system-prompts/universal.prompt (2,241 bytes merged) using letter sections (A-H) with numbered overlays (1-8): (A) Routing & Isolation with 5-tier detection (fallback=scholarship_api) and mandatory overlay_selected telemetry; (B) Company Core emphasizing dual-engine growth (B2C student_pilot, B2B provider_register); (C) Global Guardrails (no ghostwriting, no PII in events, FERPA/COPPA, server-side trust boundary); (D) KPI & Telemetry with revenue-critical events; (E) SLOs & Escalation (99.9% uptime, P95 ≤120ms); (F) App Overlays with Purpose, Allowed actions, Required events, **Must not** constraints; (G) Operating Procedure with Escalate step; (H) Definition of Done with revenue proof requirement. **Enhanced Overlays with Must Not**: All 8 apps have explicit hard constraints: (1) executive_command_center (no mutation, no guessing), (2) auto_page_maker (no PII, no promises), (3) student_pilot (no essay writing), (4) provider_register (no client-side fee calc, no sensitive PII), (5) scholarship_api (no secret exposure), (6) scholarship_agent (no direct sends, no PII storage), (7) scholar_auth (no password requests), (8) scholarship_sage (no destructive actions, no stack secrets). **Parser Triple-Format Support**: Handles v1.0 `[APP:]`, v1.1 `Overlay:`, and v1.1 numbered `1. app_name` formats; verified all 8 overlays extract with Must not sections. **Telemetry Verified**: overlay_selected flowing with app_key=student_pilot, detection_method=AUTH_CLIENT_ID, prompt_version=v1.1. **Production Status**: All 5 endpoints operational; backward compatible (hash 16316c971227190a); default fallback changed to scholarship_api; usage guide at docs/system-prompts/USAGE.md. **Rollout**: T+0 ✅ v1.1 with Must not constraints deployed; T+24h: scholarship_api, scholarship_agent; T+48h: student_pilot, provider_register with revenue validation; T+72h: first kpi_brief_generated.

**✅ Universal Prompt System (Option C Hybrid) - Production Ready (October 28, 2025)**: Complete hybrid prompt architecture deployed with architect approval. **Universal Prompt File**: Created docs/system-prompts/universal.prompt as single source of truth containing [META], [SHARED], 8 app overlays ([APP: scholar_auth], [APP: student_pilot], [APP: provider_register], [APP: scholarship_api], [APP: executive_command_center], [APP: auto_page_maker], [APP: scholarship_agent], [APP: scholarship_sage]), and [FAILSAFE] section. **Runtime Overlay Selection**: Prompt loader supports PROMPT_MODE environment variable (separate|universal, defaults to "separate"); extracts [SHARED] + [APP: {app_key}] based on APP_NAME; backward compatible with existing separate prompts. **Five Prompt API Endpoints**: (1) GET /api/prompts lists loaded prompts; (2) GET /api/prompts/:app returns single app metadata; (3) GET /api/prompts/verify runs 4 verification checks and exposes promptMode field; (4) GET /api/prompts/universal returns merged [SHARED]+[APP] (requires PROMPT_MODE=universal); (5) GET /api/prompts/overlay/:app returns individual overlay for debugging (works in both modes). **Backward Compatibility**: Default PROMPT_MODE="separate" preserves existing Student Pilot behavior with hash 16316c971227190a; all endpoints tested and verified. **Migration Timeline**: T+0-T+24h: universal.prompt landed, separate mode default; T+24h-T+48h: enable universal mode for Scholarship API and Scholarship Agent; T+48h-T+72h: expand to Student Pilot and Provider Register. **Business Events & Prompt Pack Framework - Production Ready (October 27, 2025)**: Complete executive dashboard instrumentation deployed with architect approval. **Business Events Table**: Created business_events schema with requestId, app, env, eventName, ts, actorType, actorId, orgId, sessionId, properties for KPI tracking and revenue visibility. **Six Student Pilot Events (Week 1 Complete)**: (1) student_signup emitted on first-time user creation (not every login); (2) profile_completed emitted when completion >= 70% (D0-D3 Beta KPI target); (3) match_viewed emitted on authenticated match click-through; (4) **credit_purchased** emitted after Stripe payment success with payment_id, credits, revenue_usd; (5) **credit_spent** emitted after AI usage with credits, revenue_usd, reason; (6) application_submitted emitted when status transitions to "submitted". **Fire-and-Forget Emission**: All events use non-blocking .catch() pattern to avoid request path delays, errors logged for monitoring. **Revenue Tracking**: B2C cash-in (credit_purchased) and consumption (credit_spent) both captured with normalized revenue_usd for first non-zero revenue report. **CEO Directive Compliance**: All 6 Week 1 events instrumented, ready for 72-hour revenue report, feeds Executive Command Center daily KPI brief.

**✅ Student Pilot Operational Endpoints - Production Ready (October 27, 2025)**: Complete operational toolkit for predictive match scoring system deployed with architect approval. **Four Admin Endpoints**: (1) POST /api/admin/scoring/cohort-analysis runs daily ops on N-student cohorts, generates CTR projections (High 55%/Competitive 35%/Long Shot 15%), distribution analysis, and top 5 improvement levers with cost telemetry; (2) POST /api/admin/scoring/validate tests division-by-zero guards with threshold-only scholarships and tracks per-run costs; (3) GET /api/admin/reports/match-performance calculates D0-D3 actual match CTR vs 35% target, AI cost per student, ARPU uplift from credit spend; (4) GET /api/admin/scoring/diagnostics scans for anomalies (invalid scores, empty match sets), provides sample explanationMetadata and actionable recommendations. **Scoring Analytics Service**: Filters viable matches (score >=50), deduplicates student counts in improvement tracking, guards zero-match edge cases preventing NaN/Infinity. **Production Safety**: All metrics return stable numerics under zero-match conditions, CTR lift calculated per cohort size (not match count), cost tracking accurate for all evaluations. Platform ready for Daily Ops, Release/Validation, KPI Reporting, and Incident Response workflows.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript (Vite build tool)
- **UI/Styling**: shadcn/ui components (Radix UI primitives) styled with Tailwind CSS
- **State Management**: TanStack React Query for server state
- **Routing**: Wouter
- **Form Handling**: React Hook Form with Zod validation

## Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM (Neon Database)
- **Authentication**: Replit's OpenID Connect (OIDC) or centralized Scholar Auth via Passport.js
- **Session Management**: Express sessions stored in PostgreSQL
- **File Storage**: Google Cloud Storage integration
- **AI Integration**: OpenAI GPT-4o for essay assistance and scholarship matching
- **Agent Bridge**: Microservices orchestration with Auto Com Center

## Database Design
Core entities include Users, Student Profiles, Scholarships, Applications, Scholarship Matches, Documents, and Essays.

## Authentication & Authorization
- **Provider**: Centralized OAuth via Scholar Auth (`scholar-auth-jamarrlmayes.replit.app`)
- **Client**: `student-pilot` with PKCE S256 and refresh token rotation
- **Session Storage**: PostgreSQL-backed sessions
- **Security**: Route-level authentication, automatic user creation, and SSO.
- **Required Secrets**: `FEATURE_AUTH_PROVIDER`, `AUTH_CLIENT_ID`, `AUTH_CLIENT_SECRET`, `AUTH_ISSUER_URL`.

## File Upload System
- **Storage**: Google Cloud Storage via Replit's sidecar
- **Method**: Direct browser-to-cloud uploads using presigned URLs
- **Components**: Custom ObjectUploader using Uppy
- **Access Control**: Object ACL system

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
- **Functionality**: Asynchronous task processing, callback support, rate limiting (5 tasks/minute), event monitoring, security enforcement.

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