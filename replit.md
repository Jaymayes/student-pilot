# Overview

ScholarLink is a comprehensive scholarship management platform designed to help students discover, apply for, and manage scholarships. It offers personalized scholarship matching, application tracking, document management, and AI-powered essay assistance. The platform aims to increase student engagement with scholarships, streamline the application process, and provide valuable insights into scholarship competitiveness. It integrates with centralized authentication and cloud storage, targeting a significant lift in match click-through rates and organic signups.

## Recent Updates

**✅ Universal Prompt v1.1 Final (Agent3 Router - CEO Approved) - Production Ready (October 28, 2025)**: Ultra-compact universal prompt (4,590 bytes raw, ~2,300 bytes merged) with CEO directive deployed. **Mission**: Reach $10M profitable ARR in 5 years through AI-driven scholarship access. **CEO Mandate**: Agent3 must detect active overlay, operate within boundaries, emit required events, meet SLOs, uphold finance rules (4x AI markup + 3% provider fee drive profit). **Agent3 Router**: Production-ready docs/system-prompts/universal.prompt with CEO_DIRECTIVE.md validation guide using sections (A-H): (Purpose) One system prompt for 8 apps - detect overlay, lock to it, use only that overlay's rules; (A) Routing & Isolation - first-match-wins via env(APP_OVERLAY), strict isolation ("use one overlay only, do not read/call/quote other overlays"), never compute fee_usd; (B) Company Core - $10M profitable ARR in 5 years, dual-engine growth (B2C+B2B), SEO-first via Auto Page Maker, 4x AI markup + 3% provider fee = positive unit economics; (C) Global Guardrails - no essays/ghostwriting, no PII, server-side trust boundary, FERPA/COPPA compliance; (D) KPI & Telemetry - enhanced event schemas: overlay_selected {app_key, detection_method, mode, prompt_version}, credit_purchase_succeeded {revenue_usd, credits_purchased, sku, user_id_hash?}, fee_accrued {scholarship_id, award_amount, fee_usd server-side only}, slo_at_risk {metric, value, threshold, duration_s}, error {where, code, message_safe, overlay}, kpi_brief_generated {arr_usd, fee_revenue_usd, b2c_mrr, b2b_mrr, date_utc}; (E) SLOs - uptime ≥99.9%, P95 ≤120ms, escalate if P95>150ms for 5+ min or event drop >10%, graceful degradation; (F) 8 Numbered Overlays (1-8) with Allowed/Must not/Required; (G) Operating Procedure - Plan→Execute→Validate→Report→Escalate; (H) Definition of Done - overlay detected and locked, required events emitted with no PII, SLOs met or escalated, finance constraints respected (4x markup; 3% fee server-side only), deliverables aligned to student value. **All 8 Overlays Verified**: (1) executive_command_center (summarize KPI telemetry, kpi_brief_generated), (2) auto_page_maker (SEO pages/snippets, overlay_selected), (3) student_pilot B2C (credit packs, pricing ≥4x AI cost, credit_purchase_succeeded), (4) provider_register B2B (onboard providers, fee_accrued server-side only), (5) scholarship_api (API docs, overlay_selected), (6) scholarship_agent (outreach planning, overlay_selected), (7) scholar_auth (auth flows, overlay_selected), (8) scholarship_sage (guidance/coaching, overlay_selected). **Rollout**: T+0 ✅ CEO-approved compact version; T+24h scholarship_api/agent; T+48h student_pilot/provider_register revenue validation; T+72h first kpi_brief_generated with non-zero ARR.

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