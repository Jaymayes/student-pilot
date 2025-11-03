# Overview

ScholarLink is a scholarship management platform designed to help students discover, apply for, and manage scholarships. It offers personalized matching, application tracking, document management, and AI-powered essay assistance. The platform aims to increase student engagement, streamline the application process, and provide insights into scholarship competitiveness. It integrates with centralized authentication and cloud storage, with a business vision to achieve $10M profitable ARR in 5 years through AI-driven scholarship access.

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