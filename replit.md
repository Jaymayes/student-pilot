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
- **DUAL-FIELD APPROACH (Master Prompt v1.2 Legacy Compatibility)**:
  - Sends BOTH v1.2 canonical fields AND legacy duplicates per Master Prompt specification
  - v1.2 canonical: `app`, `event_name`, `ts_iso`, `data`, `id`, `schema_version`, `_meta.version: "v1.2"`
  - Legacy duplicates: `app_id`, `event_type`, `ts`, `properties`, `event_id`, `_meta.version: "1.2"`
  - Both are included in every event payload for forward/backward compatibility
  - Deployed endpoints currently validate legacy fields; canonical fields future-proof for migration
- **Required Events**:
  - `app_started` (at boot with version, uptime_sec=0, service_ok, p95_ms, error_rate_pct, app_base_url)
  - `app_heartbeat` (every 60s with uptime_sec, service_ok, p95_ms, error_rate_pct, app_base_url)
- **Business Events (A5 spec compliant - Finance tile drivers)**:
  - `page_view`, `application_started`, `application_submitted`
  - `checkout_started`, `payment_succeeded` {amount_cents, product, credits, intent_id, user_id_hash} (via Stripe webhook)
  - `credit_purchased` {credits, amount_cents, source, user_id_hash} (via Stripe webhook)
  - `payment_failed` {reason, amount_cents, intent_id} (via Stripe webhook for checkout.session.expired and payment_intent.payment_failed)
  - `document_uploaded` {document_type, document_id, is_first, user_id_hash} (with isFirst flag for activation tracking)
  - `ai_assist_used` {tool, op, tokens_in, tokens_out, user_id_hash} (via kpiTelemetry.trackEssayAssistance)
- **Fallback**: Local storage to `business_events` table when external endpoints unavailable
- **Backfill**: Automatically syncs locally stored events every 5 minutes
- **Privacy**: User IDs hashed with SHA-256, IPs masked to /24
- **SLO Targets**: uptime ≥99.9%, p95 latency ≤120ms, error_rate_pct <2%

## AGENT3 Ecosystem Integration (8-App Architecture)
student_pilot is A5 in the 8-app ecosystem. All apps communicate via telemetry to A2 (scholarship_api) which feeds A8 (auto_com_center) Command Center UI.

### App Registry
- **A1 scholar_auth**: Auth gateway (signups/logins) → `https://scholar-auth-jamarrlmayes.replit.app`
- **A2 scholarship_api**: Central Aggregator "The Heart" → `https://scholarship-api-jamarrlmayes.replit.app`
- **A3 scholarship_agent**: Acquisition + Campaign Orchestrator → `https://scholarship-agent-jamarrlmayes.replit.app`
- **A4 scholarship_sage**: AI Recommendations + Trust → `https://scholarship-sage-jamarrlmayes.replit.app`
- **A5 student_pilot (THIS APP)**: Student App + Credits/Payments → `https://student-pilot-jamarrlmayes.replit.app`
- **A6 provider_register**: Provider Onboarding/Publishing → `https://provider-register-jamarrlmayes.replit.app`
- **A7 auto_page_maker**: SEO Page Builder → `https://auto-page-maker-jamarrlmayes.replit.app`
- **A8 auto_com_center**: Command Center UI "The Eyes" → `https://auto-com-center-jamarrlmayes.replit.app`

### Command Center Tiles (A5 Contributions)
- **Finance tile**: `payment_succeeded`, `credit_purchased` (primary monetization path)
- **B2C tile**: Attributed via UTM from A3 campaigns
- **SLO tile**: `app_started`, `app_heartbeat` with p95_ms, error_rate_pct

### UTM Attribution from A3 (scholarship_agent)
A3 routes traffic to A5 with exact UTM parameters:
- `utm_source=scholarship_agent`
- `utm_medium=organic-seo` (must be exactly "organic-seo")
- `utm_campaign={campaign_slug}` (e.g., sotd_2025_12_02)
- `utm_content={template_slug}` (e.g., sotd_basic)
- `utm_term={keyword_slug}`

### CTA Routing (A3 → A5)
Primary CTA: `purchase_credits` routes to:
```
https://student-pilot-jamarrlmayes.replit.app/start?utm_source=scholarship_agent&utm_medium=organic-seo&utm_campaign={campaign}&utm_content={template}&utm_term={keyword}
```

## Legal Pages
- **Routes**: `/privacy`, `/terms`, `/accessibility` (accessible without authentication)
- **Components**: `client/src/pages/legal.tsx` - Privacy Policy, Terms of Service, Accessibility Statement
- **Footer**: `LegalFooter` component displayed on landing and dashboard pages
- **Report Branding**: `ReportBrandingFooter` component for PDF/printed documents
- **Company Info**: ScholarLink LLC, registered in Delaware, support@scholarlink.com

## Graceful Degradation
The application continues operating when external services are unavailable:
- **Scholar Auth**: Falls back to Replit OIDC when discovery fails
- **Agent Bridge**: Runs in local-only mode when Command Center registration returns 404
- **Telemetry**: Uses fallback endpoint (scholarship_sage) when primary (scholarship_api) returns 403/5xx
- **Telemetry Local Storage**: Events stored to business_events table when both endpoints fail; backfilled every 5 minutes
- **Neon Database**: Pool error handler catches 57P01 (admin termination) without crashing; connections auto-recover
- **M2M Token**: Falls back to SHARED_SECRET in per-app format (`<app_id>:<secret>`) when token refresh endpoints unavailable

## External Service Configuration Requirements
The following external services need configuration to enable full ecosystem integration:

### A2 scholarship_api (Primary Telemetry Endpoint)
- **Current Status**: Returns 403 on S2S requests
- **Required Action**: Whitelist S2S Bearer tokens for `student_pilot` app
- **Auth Format**: `Bearer student_pilot:<SHARED_SECRET>` or M2M JWT

### A4 scholarship_sage (Fallback Telemetry Endpoint)
- **Current Status**: Returns 401 "Telemetry not configured for app 'student_pilot'"
- **Required Action**: Configure `student_pilot` as allowed app in telemetry config

### A8 auto_com_center (Command Center)
- **Current Status**: Returns 404 on registration
- **Required Action**: Register `student_pilot` endpoint in Command Center app registry

## Compliance and Security
- Fully compliant with AGENT3 v3.0 UNIFIED specifications, including robust security headers (HSTS, CSP, Permissions-Policy, X-Frame-Options, Referrer-Policy, X-Content-Type-Options).
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