# 🏗️ ScholarLink Tech Stack Inventory & Architecture

## **System Architecture Overview**

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[React 18.3 + TypeScript]
        ROUTER[Wouter Router]
        STATE[TanStack Query]
        COMP[shadcn/ui + Radix]
        STYLE[Tailwind CSS]
    end
    
    subgraph "Backend Layer"
        API[Express.js + TypeScript]
        AUTH[Passport.js + Replit OIDC]
        CACHE[Response Cache + Compression]
        VALID[Zod Validation]
        RATE[Rate Limiting]
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL + Neon)]
        ORM[Drizzle ORM]
        SESSIONS[Session Store]
    end
    
    subgraph "External Services"
        STRIPE[Stripe Payments]
        OPENAI[OpenAI GPT-4o]
        GCS[Google Cloud Storage]
        REPLIT[Replit Auth]
    end
    
    subgraph "Build & Deploy"
        VITE[Vite Frontend]
        ESBUILD[esbuild Backend]
        ESL[ESLint + Prettier]
        TS[TypeScript 5.6.3]
    end
    
    UI --> API
    API --> DB
    API --> STRIPE
    API --> OPENAI
    API --> GCS
    AUTH --> REPLIT
    ORM --> DB
</mermaid>

## **Core Dependencies Analysis**

### **Critical Runtime Dependencies (Production)**
- **express**: `^4.21.2` - API server framework
- **drizzle-orm**: `^0.39.1` - Type-safe database ORM
- **@neondatabase/serverless**: `^0.10.4` - PostgreSQL serverless driver
- **react**: `^18.3.1` - Frontend framework
- **typescript**: `5.6.3` - Type safety across stack
- **stripe**: `^18.4.0` - Payment processing
- **openai**: `^5.12.2` - AI integration
- **@google-cloud/storage**: `^7.16.0` - File storage
- **helmet**: `^8.1.0` - Security headers
- **express-rate-limit**: `^8.0.1` - Rate limiting

### **Security-Critical Dependencies**
- **jsonwebtoken**: `^9.0.2` - JWT handling
- **passport**: `^0.7.0` - Authentication
- **express-validator**: `^7.2.1` - Input validation
- **zod**: `^3.24.2` - Runtime type validation

### **Performance-Critical Dependencies**
- **compression**: `^1.8.1` - Response compression
- **memoizee**: `^0.4.17` - Function memoization
- **@tanstack/react-query**: `^5.60.5` - Data fetching/caching

## **Vulnerability Risk Areas**
1. **Authentication Chain**: Replit OIDC → Passport → Express Sessions
2. **Payment Flow**: Stripe integration with webhook handling
3. **File Upload**: Google Cloud Storage with direct uploads
4. **AI Integration**: OpenAI API calls with user data
5. **Database**: Serverless PostgreSQL with connection pooling

## **Build & Deployment Stack**
- **Frontend Build**: Vite 5.4.19 (HMR + hot reload)
- **Backend Build**: esbuild 0.25.0 (fast bundling)
- **Type Checking**: TypeScript 5.6.3 + strict mode
- **Linting**: ESLint 9.34.0 + TypeScript plugin
- **Testing**: Vitest 3.2.4 + Supertest 7.1.4

## **Production Readiness Status**
✅ **Security**: Helmet + CSP + Rate limiting + HSTS  
✅ **Performance**: Caching + Compression + Optimized middleware  
✅ **Monitoring**: Health endpoints + Structured logging  
✅ **Database**: Connection pooling + Transaction safety  
✅ **Authentication**: OIDC + Session management  
⚠️ **Testing**: Basic setup (needs E2E expansion)  
⚠️ **CI/CD**: Not implemented  
⚠️ **SAST**: Not configured