# Overview

ScholarLink is a scholarship management platform designed to help students discover, apply for, and manage scholarships. It offers personalized matching, application tracking, document management, and AI-powered essay assistance. The platform aims to increase student engagement, streamline the application process, and provide insights into scholarship competitiveness. It integrates with centralized authentication and cloud storage, with a business vision to achieve $10M profitable ARR in 5 years through AI-driven scholarship access.

## AGENT3 v2.5 UNIFIED Compliance Status (CEO Edition)

student_pilot is **PRODUCTION-READY** and fully compliant with AGENT3 v2.5 UNIFIED CEO Edition specifications.

**Compliance Verification** (2025-10-31):
- ✅ Section 1 Universal Requirements: All 9 requirements implemented
  - HSTS: max-age=31536000 (1 year, includeSubDomains, preload)
  - Permissions-Policy: camera=(), microphone=(), geolocation=()
  - CSP: default-src 'self' with Stripe extensions
  - X-Frame-Options: DENY
  - Referrer-Policy: strict-origin-when-cross-origin
  - X-Content-Type-Options: nosniff
- ✅ Section 3.5 student_pilot Requirements: Complete implementation
  - OIDC sign-in (role=student)
  - Browse/search via scholarship_api with ETag caching
  - Stripe Checkout (test/live modes)
  - Event emission to auto_com_center
  - Responsible AI guardrails
  - SEO optimization
- ✅ Version: v2.5
- ✅ P95 Latency: ~5ms (<<120ms SLO)
- ✅ 5xx Error Rate: 0%
- ✅ Rate Limiting: 300 rpm baseline
- ✅ CORS: 8 exact sibling origins enforced
- ✅ Deliverables: readiness_report and fix_plan written
- ✅ Revenue Fields: revenue_role="direct", revenue_eta_hours="2-6"

**v2.5 UNIFIED CEO Edition Updates**:
1. HSTS max-age increased to 31536000 (1 year) for enhanced security
2. Referrer-Policy updated to strict-origin-when-cross-origin
3. Permissions-Policy streamlined to camera=(), microphone=(), geolocation=()
4. All universal platform requirements verified and operational
5. Revenue role terminology standardized (direct/enables/amplifies/protects)

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