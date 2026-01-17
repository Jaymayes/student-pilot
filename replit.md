# Overview

ScholarLink is a scholarship management platform designed to help students discover, apply for, and manage scholarships. It offers personalized matching, application tracking, document management, and AI-powered essay assistance. The platform aims to increase student engagement, streamline the application process, and provide insights into scholarship competitiveness. The business vision is to achieve $10M profitable ARR in 5 years through AI-driven scholarship access, monetized via B2C credit sales and B2B partnerships.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
- **Framework**: React with TypeScript (Vite)
- **UI/Styling**: shadcn/ui components (Radix UI primitives) with Tailwind CSS
- **State Management**: TanStack React Query
- **Routing**: Wouter
- **Form Handling**: React Hook Form with Zod

## Backend
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM (Neon Database)
- **Authentication**: Centralized Scholar Auth via Passport.js, utilizing Replit's OIDC or similar.
- **Session Management**: Express sessions stored in PostgreSQL
- **File Storage**: Google Cloud Storage integration
- **AI Integration**: OpenAI GPT-4o for essay assistance and scholarship matching
- **Microservices Orchestration**: Auto Com Center for agent bridge functionality

## Database Design
Core entities include Users, Student Profiles, Scholarships, Applications, Scholarship Matches, Documents, and Essays.

## Subscription & Payment Gating
- Users table includes `subscription_status` and `stripe_customer_id`.
- Utilizes Stripe for checkout and webhooks to update subscription status.
- Implements a trial credits system (5 trial credits on first signup) to drive activation.

## Telemetry System (Protocol v3.5.1 + Command Center)
- **Client**: Singleton with batched event emission.
- **Middleware**: Automatic `page_view` tracking.
- **KPI Integration**: Dual-emits to telemetry and Agent Bridge.
- **Primary Endpoint**: `https://auto-com-center-jamarrlmayes.replit.app/events` (A8 Command Center).
- **Fallback Endpoint**: `https://scholarship-api-jamarrlmayes.replit.app/events` (A2).
- Emits required events like `app_started`, `app_heartbeat`, and business events (e.g., `page_view`, `payment_succeeded`, `ai_assist_used`).
- Events are stored locally and backfilled if external endpoints are unavailable.
- **Last Updated**: 2026-01-04 - Migrated from /ingest to /events endpoints (v3.5.1).

## AGENT3 Ecosystem Integration
- Student Pilot (A5) is part of an 8-app ecosystem, communicating via telemetry to A2 (scholarship_api) which feeds A8 (auto_com_center) Command Center UI.
- Contributes to Command Center Tiles (Finance, B2C, SLO).
- Supports UTM attribution from A3 (scholarship_agent) and A7 (auto_page_maker) for campaign tracking.

## UTM Attribution Flow (A7→A1→A5)
- **Capture**: `useUtm.ts` captures UTM params from URL on page load and stores in localStorage (30-day TTL)
- **Persistence**: localStorage survives OIDC redirects (A7→A1→A5) - this is a fundamental browser behavior
- **Checkout**: `Billing.tsx` retrieves UTMs via `getUtmForCheckout()` and includes in `/api/billing/create-checkout` request
- **Stripe Metadata**: Backend conditionally adds non-empty UTM params to Stripe checkout session metadata
- **Webhook**: `checkout.session.completed` handler reads `session.metadata.utmSource` and includes in `payment_succeeded` telemetry
- **Command Center**: A8 receives attributed revenue events with source/medium/campaign for ROI analysis
- **Evidence**: Payment telemetry includes `utmSource` field when present; Command Center Finance tile can segment by source

## Learning Loop (Phase 3 - Won Deal Automation)
- **Service**: `server/services/learningLoop.ts` - singleton service for closed-loop learning
- **Trigger**: `triggerWonDeal()` called on every successful payment (fire-and-forget with error logging)
- **Lead Elevation**: Calls A3 `/api/leads/won-deal` to elevate lead_score to 100 and move user to Customer segment
- **Revenue by Page**: Calls A7 `/api/revenue-by-page` with UTM/pageSlug data for SEO ROI analysis
- **LTV Tracking**: In-memory calculation of totalSpentCents, totalCredits, purchaseCount, ARPU
- **Telemetry Events**: `won_deal`, `ltv_updated`, `lead_score_elevated`, `revenue_by_page_updated`
- **A8 Automation**: POST to `/api/automations/won-deal` for Command Center workflow triggers
- **Graceful Degradation**: All external calls wrapped in try/catch - payment flow never blocked on learning loop failures

## Zero-Staleness / Real-Time Truth (5-Second SLA)
- **QueryClient Config**: staleTime=5s, refetchInterval=5s for real-time data freshness
- **Cache-Busting Headers**: All API requests include Cache-Control: no-cache, no-store and Pragma: no-cache
- **Server Headers**: Scholarship APIs return no-store, no-cache headers
- **No Mock Data in Production**: useExperiment.ts fetches variant configs from API; mocks only in DEV
- **Fail Loudly**: Missing variant configs trigger errors with logging, not silent fallbacks
- **Last Updated**: 2026-01-17 - SRE audit completed; 5-second freshness SLA enforced

## Graceful Degradation
The application is designed to continue operating when external services are unavailable, with fallbacks for Scholar Auth, Agent Bridge, Telemetry, Neon Database, and M2M Tokens.

## Compliance and Security
- Fully compliant with AGENT3 v3.0 UNIFIED specifications.
- Robust security headers, PII not logged, FERPA/COPPA compliant.
- Responsible AI controls emphasizing coaching over ghostwriting.

# External Dependencies

## Cloud Services
- **Replit Authentication**: OIDC provider
- **Neon Database**: Serverless PostgreSQL
- **Google Cloud Storage**: Object storage, accessed via Replit Sidecar
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