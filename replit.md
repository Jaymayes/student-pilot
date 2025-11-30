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

## Telemetry System (Contract v1.1)
- **Client**: `server/telemetry/telemetryClient.ts` - Singleton with batched event emission
- **Middleware**: `server/middleware/telemetryMiddleware.ts` - Automatic page_view tracking
- **KPI Integration**: `server/services/kpiTelemetry.ts` - Dual-emit to telemetry and Agent Bridge
- **Events**: app_started, app_heartbeat (60s), page_view, profile_completion, match_click_through, application_start, credit_spend
- **Fallback**: Local storage to `business_events` table when external endpoints unavailable
- **Privacy**: User IDs hashed with SHA-256, IPs masked to /24

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