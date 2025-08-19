# Overview

ScholarLink is a comprehensive scholarship management platform that helps students discover, apply for, and manage scholarships. The application provides personalized scholarship matching, application tracking, document management, and essay writing assistance. Built as a full-stack web application with a React frontend and Express backend, it integrates with Replit's authentication system and uses Google Cloud Storage for file management.

**Latest Update (August 19, 2025)**: ScholarLink has achieved enterprise-grade production readiness with comprehensive security hardening and deployment infrastructure. All 12 critical security vulnerabilities have been resolved including data validation bypass, race conditions, and JWT timing attacks. The platform now features production-ready security controls with timing-safe authentication, comprehensive input validation, enhanced error handling, and complete rate limiting. Agent Bridge integration provides secure, JWT-authenticated task dispatch with 9 intelligent capabilities for AI-powered scholarship assistance. 

**Production Deployment Infrastructure**: Complete Kubernetes deployment with progressive canary rollouts (1%→5%→20%→50%→100%), automated health monitoring, SLO-based alerting, WAF protection, CSP hardening, admission controllers, vulnerability scanning, and secrets rotation. Platform ready for immediate production deployment with enterprise security guardrails.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation

## Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Database Provider**: Neon Database using serverless connections
- **Authentication**: Replit's OpenID Connect (OIDC) authentication system with Passport.js
- **Session Management**: Express sessions stored in PostgreSQL
- **File Storage**: Google Cloud Storage integration for document uploads
- **AI Integration**: OpenAI GPT-4o for intelligent essay assistance and scholarship matching
- **Agent Bridge**: Microservices orchestration integration with Auto Com Center

## Database Design
The schema includes core entities for:
- **Users**: Authentication and profile information
- **Student Profiles**: Academic information, demographics, and interests
- **Scholarships**: Scholarship details and requirements
- **Applications**: Application tracking and status management
- **Scholarship Matches**: AI-powered matching between students and scholarships
- **Documents**: File metadata and storage references
- **Essays**: Essay drafts, prompts, and feedback storage

## Authentication & Authorization
- **Provider**: Replit's OIDC authentication system
- **Session Storage**: PostgreSQL-backed sessions with configurable TTL
- **Access Control**: Route-level authentication middleware protecting API endpoints
- **User Management**: Automatic user creation and profile management

## File Upload System
- **Storage**: Google Cloud Storage with Replit's sidecar integration
- **Upload Method**: Direct browser-to-cloud uploads using presigned URLs
- **UI Component**: Custom ObjectUploader component using Uppy for file management
- **Access Control**: Object ACL system for fine-grained file permissions

## Development Environment
- **Monorepo Structure**: Client and server code in single repository
- **Development Server**: Vite dev server with Express API proxy
- **Build Process**: Separate builds for client (Vite) and server (esbuild)
- **Type Safety**: Shared TypeScript types between client and server

# External Dependencies

## Cloud Services
- **Replit Authentication**: OIDC provider for user authentication
- **Neon Database**: Serverless PostgreSQL database hosting
- **Google Cloud Storage**: Object storage for document uploads
- **Replit Sidecar**: Service proxy for Google Cloud API access
- **OpenAI GPT-4o**: AI services for essay analysis and scholarship matching
- **Auto Com Center**: Orchestration hub for distributed task execution

## Agent Bridge Integration (Production Ready)
- **JWT Authentication**: HS256 token validation with shared secrets
- **Task Orchestration**: Asynchronous task processing with callback support
- **Rate Limiting**: 5 tasks/minute protection for AI services
- **Event Monitoring**: Comprehensive audit trail and monitoring
- **Security Enforcement**: Request validation and unauthorized access rejection

## UI and Frontend Libraries
- **shadcn/ui**: Pre-built accessible React components
- **Radix UI**: Primitive components for complex UI patterns
- **Tailwind CSS**: Utility-first CSS framework
- **TanStack React Query**: Server state management and caching
- **Uppy**: File upload handling with progress tracking
- **Wouter**: Lightweight React router

## Backend Libraries
- **Drizzle ORM**: Type-safe SQL query builder and ORM
- **Passport.js**: Authentication middleware for Express
- **Express Session**: Session management middleware
- **Zod**: Runtime type validation and schema parsing

## Development Tools
- **Vite**: Fast development server and build tool
- **TypeScript**: Type safety across the entire stack
- **ESBuild**: Fast JavaScript bundler for server code
- **PostCSS**: CSS processing with Tailwind CSS