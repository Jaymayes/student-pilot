# Overview

ScholarLink is a comprehensive scholarship management platform designed to help students discover, apply for, and manage scholarships. It offers personalized scholarship matching, application tracking, document management, and AI-powered essay assistance. The platform aims to increase student engagement with scholarships, streamline the application process, and provide valuable insights into scholarship competitiveness. It integrates with centralized authentication and cloud storage, targeting a significant lift in match click-through rates and organic signups.

## Recent Updates

**✅ Business Events & Prompt Pack Framework - Production Ready (October 27, 2025)**: Complete executive dashboard instrumentation deployed with architect approval. **Business Events Table**: Created business_events schema with requestId, app, env, eventName, ts, actorType, actorId, orgId, sessionId, properties for KPI tracking and revenue visibility. **Four Student Pilot Events**: (1) student_signup emitted on first-time user creation (not every login); (2) profile_completed emitted when completion >= 70% (D0-D3 Beta KPI target); (3) match_viewed emitted on authenticated match click-through; (4) application_submitted emitted when status transitions to "submitted". **System Prompt Framework**: Loaded shared_directives.prompt + student_pilot.prompt at boot, logs prompt hash (16316c971227190a) for verification. **Fire-and-Forget Emission**: All events use non-blocking .catch() pattern to avoid request path delays, errors logged for monitoring. **CEO Directive Compliance**: Ready for first non-zero revenue report within 72 hours of event go-live, feeds Executive Command Center daily KPI brief.

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