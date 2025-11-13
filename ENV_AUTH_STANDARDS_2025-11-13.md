# Environment & Authentication Standards
**Version:** 2.0  
**Issued:** 2025-11-13 17:35 UTC  
**Authority:** Agent3, Integration Lead  
**Scope:** All 8 Scholar AI Advisor microservices  
**Compliance Deadline:** Gate 0 - Nov 14, 10:00 MST

---

## Executive Summary

This document establishes **mandatory** configuration, authentication, and authorization standards for all microservices in the Scholar AI Advisor ecosystem. **Zero exceptions** without CEO approval.

**Non-Negotiables:**
- ✅ **Zero hardcoded URLs** - All inter-service communication via environment variables
- ✅ **Boot-time validation** - Fail fast with actionable errors if required env vars missing
- ✅ **Service-to-Service Auth** - OAuth2 client credentials with RS256/JWKS
- ✅ **RBAC in tokens** - Roles and permissions in JWT claims
- ✅ **CORS allowlist** - Deny-by-default, explicit frontend origins only

---

## Part 1: Environment Configuration Standards

### 1.1 Required Environment Variables (All Services)

Every service MUST define and validate these at boot:

```bash
# Service Identity
SERVICE_NAME=<app-name>                    # e.g., "student_pilot", "scholarship_api"
NODE_ENV=<environment>                      # "development", "staging", "production"
PORT=5000                                   # Bind port (5000 for frontends, variable for backends)

# Database (if applicable)
DATABASE_URL=<postgres-connection-string>   # Neon/PostgreSQL connection

# Service Discovery (Inter-Service Communication)
AUTH_API_BASE_URL=https://scholar-auth-jamarrlmayes.replit.app
SCHOLARSHIP_API_BASE_URL=https://scholarship-api-jamarrlmayes.replit.app
SAGE_API_BASE_URL=https://scholarship-sage-jamarrlmayes.replit.app
AGENT_API_BASE_URL=https://scholarship-agent-jamarrlmayes.replit.app
AUTO_COM_CENTER_BASE_URL=https://auto-com-center-jamarrlmayes.replit.app
AUTO_PAGE_MAKER_BASE_URL=https://auto-page-maker-jamarrlmayes.replit.app
STUDENT_PILOT_BASE_URL=https://student-pilot-jamarrlmayes.replit.app
PROVIDER_REGISTER_BASE_URL=https://provider-register-jamarrlmayes.replit.app

# Frontend Origins (for CORS - backends only)
FRONTEND_ORIGINS=https://student-pilot-jamarrlmayes.replit.app,https://provider-register-jamarrlmayes.replit.app

# Authentication (OAuth2 Client Credentials for S2S)
OAUTH_CLIENT_ID=<service-specific-client-id>        # e.g., "scholarship-api"
OAUTH_CLIENT_SECRET=<secret>                        # Issued by scholar_auth
OAUTH_TOKEN_ENDPOINT=${AUTH_API_BASE_URL}/oauth/token
OAUTH_JWKS_URI=${AUTH_API_BASE_URL}/.well-known/jwks.json
OAUTH_ISSUER=${AUTH_API_BASE_URL}

# Service-Specific Secrets
INTERNAL_API_KEY=<shared-secret>           # Fallback for internal calls (temporary)
ADMIN_EMAILS=ceo@scholaraiadvisor.com,ciso@scholaraiadvisor.com,eng.oncall@scholaraiadvisor.com,ops.oncall@scholaraiadvisor.com
```

### 1.2 Boot-Time Validation (Required)

Every service MUST implement environment validation that:
1. **Checks all required variables** before starting server
2. **Fails fast** with actionable error messages
3. **Logs missing variables** to stderr
4. **Exits with code 1** if validation fails

**Example Implementation (Node.js/TypeScript):**

```typescript
// server/environment.ts
const REQUIRED_ENV_VARS = [
  'SERVICE_NAME',
  'NODE_ENV',
  'DATABASE_URL',
  'AUTH_API_BASE_URL',
  'SCHOLARSHIP_API_BASE_URL',
  'OAUTH_CLIENT_ID',
  'OAUTH_CLIENT_SECRET',
] as const;

export function validateEnvironment(): void {
  const missing: string[] = [];
  
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    console.error('❌ FATAL: Missing required environment variables:');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('\n💡 Set these in Replit Secrets or .env file');
    process.exit(1);
  }
  
  console.log('✅ Environment validation passed');
}

// Call BEFORE any server initialization
validateEnvironment();
```

### 1.3 Configuration Access Pattern

**NEVER access process.env directly in application code.** Use centralized config:

```typescript
// server/config.ts
export const config = {
  service: {
    name: process.env.SERVICE_NAME!,
    env: process.env.NODE_ENV!,
    port: parseInt(process.env.PORT || '5000', 10),
  },
  database: {
    url: process.env.DATABASE_URL!,
  },
  services: {
    auth: process.env.AUTH_API_BASE_URL!,
    api: process.env.SCHOLARSHIP_API_BASE_URL!,
    sage: process.env.SAGE_API_BASE_URL!,
    agent: process.env.AGENT_API_BASE_URL!,
    comCenter: process.env.AUTO_COM_CENTER_BASE_URL!,
    pageMaker: process.env.AUTO_PAGE_MAKER_BASE_URL!,
  },
  frontends: {
    student: process.env.STUDENT_PILOT_BASE_URL!,
    provider: process.env.PROVIDER_REGISTER_BASE_URL!,
    origins: process.env.FRONTEND_ORIGINS!.split(','),
  },
  auth: {
    clientId: process.env.OAUTH_CLIENT_ID!,
    clientSecret: process.env.OAUTH_CLIENT_SECRET!,
    tokenEndpoint: process.env.OAUTH_TOKEN_ENDPOINT!,
    jwksUri: process.env.OAUTH_JWKS_URI!,
    issuer: process.env.OAUTH_ISSUER!,
  },
} as const;
```

---

## Part 2: Authentication & Authorization Standards

### 2.1 OAuth2 Architecture

**Token Issuer:** `scholar_auth` (https://scholar-auth-jamarrlmayes.replit.app)  
**Token Algorithm:** RS256 (asymmetric key signing)  
**Token Verification:** JWKS endpoint with key rotation support

### 2.2 Service-to-Service Authentication

**Grant Type:** OAuth2 Client Credentials (`client_credentials`)

**Token Request Flow:**

```bash
# Service requests access token from scholar_auth
POST ${AUTH_API_BASE_URL}/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id=${OAUTH_CLIENT_ID}
&client_secret=${OAUTH_CLIENT_SECRET}
&audience=scholarship-api
&scope=api.read api.write
```

**Token Response:**

```json
{
  "access_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 300,
  "scope": "api.read api.write"
}
```

**Using Token in Requests:**

```bash
GET ${SCHOLARSHIP_API_BASE_URL}/scholarships
Authorization: Bearer eyJhbGc...
X-Request-ID: <correlation-id>
```

### 2.3 JWT Token Structure

**Access Token (5-minute TTL):**

```json
{
  "iss": "https://scholar-auth-jamarrlmayes.replit.app",
  "aud": "scholarship-api",
  "sub": "service:scholarship-agent",
  "exp": 1731518400,
  "iat": 1731518100,
  "nbf": 1731518100,
  "jti": "unique-token-id",
  "kid": "key-2025-11-13",
  "roles": ["service"],
  "permissions": ["api.read", "api.write", "scholarships.manage"],
  "scope": "api.read api.write"
}
```

**User Token (from frontend auth):**

```json
{
  "iss": "https://scholar-auth-jamarrlmayes.replit.app",
  "aud": ["student-pilot", "scholarship-api"],
  "sub": "user:uuid-here",
  "exp": 1731518400,
  "iat": 1731518100,
  "nbf": 1731518100,
  "jti": "unique-token-id",
  "kid": "key-2025-11-13",
  "email": "student@example.com",
  "roles": ["student"],
  "permissions": ["profile.read", "profile.write", "applications.submit"],
  "mfa_verified": true
}
```

### 2.4 JWT Validation (Required for All Protected Endpoints)

**Validation Middleware (scholarship_api, scholarship_sage, scholarship_agent, auto_com_center):**

```typescript
import { expressjwt } from 'express-jwt';
import jwksRsa from 'jwks-rsa';

// JWKS client with caching and rotation support
const jwksClient = jwksRsa({
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000, // 10 minutes
  jwksUri: config.auth.jwksUri,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

// Get signing key by kid
function getKey(header: any, callback: any) {
  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

// JWT validation middleware
export const requireAuth = expressjwt({
  secret: getKey,
  algorithms: ['RS256'],
  issuer: config.auth.issuer,
  audience: config.service.name, // e.g., "scholarship-api"
  requestProperty: 'auth', // Attach decoded token to req.auth
});

// RBAC enforcement
export function requireRole(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    const userRoles = req.auth?.roles || [];
    
    if (!userRoles.some((r: string) => roles.includes(r))) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Requires one of: ${roles.join(', ')}`,
        },
      });
    }
    
    next();
  };
}

// Permission enforcement
export function requirePermission(...permissions: string[]) {
  return (req: any, res: any, next: any) => {
    const userPerms = req.auth?.permissions || [];
    
    if (!permissions.every((p: string) => userPerms.includes(p))) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Missing required permissions: ${permissions.join(', ')}`,
        },
      });
    }
    
    next();
  };
}
```

**Usage in Routes:**

```typescript
// Require authentication + role
app.get('/api/scholarships',
  requireAuth,
  requireRole('student', 'provider', 'admin'),
  async (req, res) => {
    // req.auth contains decoded token
    const userId = req.auth.sub;
    // ... handler logic
  }
);

// Require specific permissions
app.post('/api/scholarships',
  requireAuth,
  requirePermission('scholarships.create'),
  async (req, res) => {
    // ... handler logic
  }
);

// Service-to-service endpoints
app.post('/internal/sync',
  requireAuth,
  requireRole('service'),
  async (req, res) => {
    // Only services with "service" role can call
  }
);
```

### 2.5 RBAC Roles & Permissions

**Defined Roles:**

| Role | Audience | Description |
|------|----------|-------------|
| `student` | End users | Students searching/applying for scholarships |
| `provider` | End users | Organizations offering scholarships |
| `admin` | Staff | Platform administrators with elevated access |
| `service` | Services | System services (scholarship_agent, etc.) |

**Permission Naming Convention:** `<resource>.<action>`

**Examples:**
- `profile.read`, `profile.write`
- `applications.submit`, `applications.view`
- `scholarships.create`, `scholarships.manage`
- `api.read`, `api.write` (for services)

### 2.6 Token Caching & Refresh Strategy

**Services MUST cache access tokens** to avoid overwhelming scholar_auth:

```typescript
interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

class TokenCache {
  private token: CachedToken | null = null;
  
  async getToken(): Promise<string> {
    const now = Date.now() / 1000;
    
    // Return cached token if valid (with 30s buffer)
    if (this.token && this.token.expiresAt > now + 30) {
      return this.token.accessToken;
    }
    
    // Request new token
    const response = await fetch(config.auth.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.auth.clientId,
        client_secret: config.auth.clientSecret,
        audience: 'scholarship-api',
        scope: 'api.read api.write',
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Token request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    this.token = {
      accessToken: data.access_token,
      expiresAt: now + data.expires_in,
    };
    
    return this.token.accessToken;
  }
}

export const tokenCache = new TokenCache();
```

---

## Part 3: CORS Configuration

### 3.1 CORS Policy (All Backend Services)

**Deny-by-default.** Only allow:
- **student_pilot:** https://student-pilot-jamarrlmayes.replit.app
- **provider_register:** https://provider-register-jamarrlmayes.replit.app

```typescript
import cors from 'cors';

const allowedOrigins = config.frontends.origins;

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true, // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400, // 24 hours
}));
```

### 3.2 Security Headers (All Services)

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", ...config.frontends.origins],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));
```

---

## Part 4: Health Checks & Observability

### 4.1 Required Health Endpoint

**ALL services MUST implement `/health`** with dependency checks:

```typescript
app.get('/health', async (req, res) => {
  const checks: Record<string, any> = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
  
  // Database check
  if (config.database.url) {
    try {
      await db.execute(sql`SELECT 1`);
      checks.database = { status: 'healthy' };
    } catch (error) {
      checks.database = { status: 'unhealthy', error: String(error) };
      checks.status = 'unhealthy';
    }
  }
  
  // Auth service check (for consumers)
  if (config.auth.jwksUri) {
    try {
      const response = await fetch(config.auth.jwksUri, { timeout: 2000 });
      checks.auth = {
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime: response.headers.get('x-response-time'),
      };
    } catch (error) {
      checks.auth = { status: 'unreachable', error: String(error) };
    }
  }
  
  const statusCode = checks.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(checks);
});
```

### 4.2 Structured Logging

**All logs MUST be JSON with correlation IDs:**

```typescript
interface LogEntry {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  service: string;
  requestId?: string;
  userId?: string;
  message: string;
  [key: string]: any;
}

function log(level: string, message: string, meta: Record<string, any> = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: config.service.name,
    message,
    ...meta,
  }));
}

// Middleware to add request ID
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Log all requests
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    log('INFO', 'Request completed', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start,
      userId: req.auth?.sub,
    });
  });
  
  next();
});
```

---

## Part 5: Integration Testing Requirements

### 5.1 Required Test Cases (Per Service)

**Positive Tests:**
1. ✅ Service can obtain access token from scholar_auth
2. ✅ Service can call protected endpoints with valid token
3. ✅ Service respects RBAC (correct roles grant access)
4. ✅ Service respects permissions (correct perms grant access)

**Negative Tests:**
1. ✅ Expired token → 401 Unauthorized
2. ✅ Wrong audience → 403 Forbidden
3. ✅ Missing role → 403 Forbidden
4. ✅ Missing permission → 403 Forbidden
5. ✅ Invalid signature → 401 Unauthorized
6. ✅ Unlisted CORS origin → Blocked

### 5.2 Evidence Requirements

**Each service DRI MUST provide:**
- Screenshot of successful S2S token request
- Screenshot of successful authenticated API call
- Screenshot of 403 response for missing permission
- Logs showing request ID propagation

---

## Part 6: Service-Specific Requirements

### scholar_auth (Auth DRI)

**Deliverables by Gate 1 (Nov 15, 18:00 MST):**
1. ✅ Implement OAuth2 `/oauth/token` endpoint (client_credentials grant)
2. ✅ Generate RS256 key pair, expose JWKS at `/.well-known/jwks.json`
3. ✅ Issue tokens with proper `iss`, `aud`, `sub`, `roles`, `permissions`, `kid`
4. ✅ Support key rotation (overlapping validity, 90-day cycle)
5. ✅ CORS allowlist to student_pilot + provider_register only
6. ✅ Health check with DB and MFA provider status
7. ✅ Reserved VM/Autoscale configuration

### scholarship_api (API DRI)

**Deliverables by Gate 1:**
1. ✅ JWT validation middleware with JWKS caching and kid selection
2. ✅ RBAC enforcement on all protected routes
3. ✅ Remove all hardcoded URLs, use config.services.*
4. ✅ Event hooks to trigger auto_com_center on status changes
5. ✅ Health check with auth reachability
6. ✅ Business rule validation hardening

### student_pilot & provider_register (Frontend DRIs)

**Deliverables by Gate 0:**
1. ✅ Replace ALL hardcoded URLs with env vars
2. ✅ Centralized ConfigManager with boot validation
3. ✅ Graceful error states for auth/API failures
4. ✅ User-friendly retry mechanisms

### scholarship_sage (Sage DRI)

**Blocked until S2S auth complete. Then by Gate 2:**
1. ✅ Service-to-service auth for API calls
2. ✅ Recommendation quality validation (precision@10 ≥70%)
3. ✅ Performance test (P95 <200ms at 50 rps)

### scholarship_agent (Agent DRI)

**Deliverables by Gate 1:**
1. ✅ S2S auth for scheduled tasks
2. ✅ Monitoring dashboard for task success/failure
3. ✅ Audit logging with correlation IDs
4. ✅ Integration tests with auto_com_center

### auto_com_center (Agent3 DRI)

**Deliverables by Gate 1:**
1. ✅ Replace hardcoded links in templates with env-based URLs
2. ✅ Load testing (enqueue P95 <120ms at 200 rps)
3. ✅ Monitoring for delivery failures and bounces
4. ✅ Secrets confirmed in platform vault

### auto_page_maker (SEO DRI)

**Deliverables by Gate 2:**
1. ✅ Sitemap and canonical tags verified
2. ✅ CTAs route to waitlist until Gate 2
3. ✅ Integration trigger ready from scholarship_api

---

## Part 7: Compliance & Security

### 7.1 Secrets Management

**NEVER commit secrets to code.** Use Replit Secrets exclusively.

**Secret Naming Convention:**
- `OAUTH_CLIENT_SECRET` (not `CLIENT_SECRET`)
- `DATABASE_URL` (not `DB_URL`)
- `STRIPE_SECRET_KEY` (not `STRIPE_KEY`)

### 7.2 PII Protection

**Never log PII in plain text:**
- ❌ `log('User email: student@example.com')`
- ✅ `log('User authenticated', { userId: 'uuid-redacted' })`

**Encrypt sensitive fields at rest** (database column encryption where applicable).

### 7.3 Responsible AI

**scholarship_sage recommendations MUST:**
- Be explainable (log reasoning metadata)
- Include diversity guardrails
- Avoid bias amplification
- Not ghostwrite essays (coaching only)

---

## Part 8: Go/No-Go Criteria

### Gate 0 (Nov 14, 10:00 MST)

**Exit Criteria:**
- [ ] All 8 services expose `/health` with dependency checks
- [ ] Zero hardcoded URLs (audited via code review)
- [ ] CORS allowlist enforced (tested via curl from unauthorized origin)
- [ ] This standards packet distributed to all DRIs

### Gate 1 (Nov 15, 18:00 MST)

**Exit Criteria:**
- [ ] scholar_auth issues valid S2S tokens (evidence: curl output)
- [ ] scholarship_api validates tokens correctly (evidence: positive + negative tests)
- [ ] JWT validation stability verified (load test at 3x expected QPS)
- [ ] MFA integration tests pass
- [ ] P0 security issues = 0

---

## Appendix A: Quick Reference Commands

**Test S2S Auth:**
```bash
# Get token
TOKEN=$(curl -X POST ${AUTH_API_BASE_URL}/oauth/token \
  -d "grant_type=client_credentials" \
  -d "client_id=scholarship-api" \
  -d "client_secret=${OAUTH_CLIENT_SECRET}" \
  -d "audience=scholarship-api" \
  | jq -r '.access_token')

# Use token
curl -H "Authorization: Bearer $TOKEN" \
  ${SCHOLARSHIP_API_BASE_URL}/scholarships
```

**Test CORS:**
```bash
# Should succeed
curl -H "Origin: https://student-pilot-jamarrlmayes.replit.app" \
  ${SCHOLARSHIP_API_BASE_URL}/scholarships

# Should fail
curl -H "Origin: https://evil.com" \
  ${SCHOLARSHIP_API_BASE_URL}/scholarships
```

**Test Health:**
```bash
curl ${SERVICE_BASE_URL}/health | jq
```

---

## Appendix B: Migration Checklist

**For each service, DRI must:**
1. [ ] Add all required env vars to Replit Secrets
2. [ ] Implement boot-time validation
3. [ ] Replace hardcoded URLs with config references
4. [ ] Implement JWT validation middleware (if backend)
5. [ ] Implement CORS allowlist (if backend)
6. [ ] Add health endpoint with dependency checks
7. [ ] Update structured logging with correlation IDs
8. [ ] Write integration tests (positive + negative)
9. [ ] Submit evidence package to War Room

---

## Questions & Escalation

**Contact:** Agent3 (Integration Lead)  
**War Room:** Active hourly during Gate 0  
**Escalation:** CEO for gate criteria changes only

---

**END OF STANDARDS DOCUMENT**
