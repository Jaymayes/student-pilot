# Overview

ScholarLink is a scholarship management platform designed to help students discover, apply for, and manage scholarships. It offers personalized matching, application tracking, document management, and AI-powered essay assistance. The platform aims to increase student engagement, streamline the application process, and provide insights into scholarship competitiveness. The business vision is to achieve $10M profitable ARR in 5 years through AI-driven scholarship access, monetized via B2C credit sales and B2B partnerships.

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

## Telemetry System (Protocol ONE_TRUTH v1.2)
- **Client**: `server/telemetry/telemetryClient.ts` - Singleton with batched event emission
- **Middleware**: `server/middleware/telemetryMiddleware.ts` - Automatic page_view tracking
- **KPI Integration**: `server/services/kpiTelemetry.ts` - Dual-emit to telemetry and Agent Bridge
- **Primary Endpoint**: `https://scholarship-api-jamarrlmayes.replit.app/api/analytics/events`
- **Fallback Endpoint**: `https://scholarship-sage-jamarrlmayes.replit.app/api/analytics/events`
- **App Registry ID**: `student_pilot` (hardcoded, never dynamic)
- **App Base URL**: `https://student-pilot-jamarrlmayes.replit.app`
- **Environment**: Always `prod` for central aggregator (per Protocol ONE_TRUTH)
- **Required Events**:
  - `app_started` (at boot with version, uptime_sec=0, service_ok, p95_ms, error_rate_pct, app_base_url)
  - `app_heartbeat` (every 60s with uptime_sec, service_ok, p95_ms, error_rate_pct, app_base_url)
- **Business Events (Finance tile drivers)**:
  - `page_view`, `application_started`, `application_submitted`
  - `checkout_started`, `payment_succeeded` (via Stripe webhook), `credit_purchased`
- **Fallback**: Local storage to `business_events` table when external endpoints unavailable
- **Backfill**: Automatically syncs locally stored events every 5 minutes
- **Privacy**: User IDs hashed with SHA-256, IPs masked to /24
- **SLO Targets**: uptime ≥99.9%, p95 latency ≤120ms, error_rate_pct ≤1%

## Legal Pages
- **Routes**: `/privacy`, `/terms`, `/accessibility` (accessible without authentication)
- **Components**: `client/src/pages/legal.tsx` - Privacy Policy, Terms of Service, Accessibility Statement
- **Footer**: `LegalFooter` component displayed on landing and dashboard pages
- **Report Branding**: `ReportBrandingFooter` component for PDF/printed documents
- **Company Info**: ScholarLink LLC, registered in Delaware, support@scholarlink.com

## Compliance and Security
- Fully compliant with AGENT3 v2.7 UNIFIED specifications, including robust security headers (HSTS, CSP, Permissions-Policy, X-Frame-Options, Referrer-Policy, X-Content-Type-Options).
- PII is not logged to ensure FERPA/COPPA compliance.
- Responsible AI controls are active, emphasizing coaching over ghostwriting essays.
- Legal pages include canonical SEO metadata and Organization JSON-LD structured data.

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