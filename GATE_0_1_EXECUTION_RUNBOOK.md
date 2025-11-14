# Gate 0/1 Execution Runbook - 8-Hour Sprint
**CEO Directive:** Nov 14, 2025  
**Agent:** Agent3 (Program Integrator)  
**Objective:** Close Gate 0 (security) today, begin Gate 1 (integrations)  
**ARR Ignition Target:** Dec 1, 2025

## Budget Authorization
- ESP (SendGrid/Postmark/Mailgun): $1,500 MRR cap
- SMS (Twilio): $1,000 MRR cap
- Reserved VMs + Autoscale: $1,500 MRR cap
- Redis/pooling: $500 MRR cap
- Monitoring (Sentry/Logtail): $500 MRR cap
- k6 load testing: $500 one-time

**Total Sprint Budget:** ~$5,500 (all caps require CEO approval for overruns)

---

## T+0 to T+2: scholar_auth (Gate 0 Security Hardening)

### Requirements Checklist
- [ ] RS256 JWT signing (migrate from HS256 if needed)
- [ ] `/.well-known/jwks.json` endpoint live
- [ ] Key rotation SOP documented in repo
- [ ] Finalized RBAC claims: `student`, `provider`, `admin`, `provider_admin`
- [ ] OAuth2 `client_credentials` grant for M2M auth
- [ ] Refresh token rotation + revocation list
- [ ] MFA enforcement for `admin` and `provider_admin` roles
- [ ] Strict CORS allowlist (no wildcards, no localhost in prod)
- [ ] Rate limiting on all public endpoints
- [ ] Structured audit logging (no PII)
- [ ] `/healthz` and `/readyz` endpoints
- [ ] Error budget SLO hooks configured

### Implementation Steps
1. **JWT Migration (RS256)**
   ```typescript
   // Generate RSA key pair
   import crypto from 'crypto';
   const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
     modulusLength: 2048,
     publicKeyEncoding: { type: 'spki', format: 'pem' },
     privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
   });
   // Store in Replit Secrets: JWT_PRIVATE_KEY, JWT_PUBLIC_KEY
   ```

2. **JWKS Endpoint**
   ```typescript
   // GET /.well-known/jwks.json
   import jwkToPem from 'jwk-to-pem';
   import { createPublicKey } from 'crypto';
   
   app.get('/.well-known/jwks.json', (req, res) => {
     const publicKey = process.env.JWT_PUBLIC_KEY;
     const jwk = createPublicKey(publicKey).export({ format: 'jwk' });
     res.json({
       keys: [{
         kty: 'RSA',
         use: 'sig',
         kid: 'scholar-auth-2025-11',
         ...jwk
       }]
     });
   });
   ```

3. **RBAC Claims Schema**
   ```typescript
   interface JWTPayload {
     sub: string;        // user ID
     email: string;
     role: 'student' | 'provider' | 'admin' | 'provider_admin';
     scopes: string[];   // ['read:scholarships', 'write:applications']
     iat: number;
     exp: number;        // 300s TTL (5 minutes)
     nbf: number;
   }
   ```

4. **M2M Client Credentials**
   ```typescript
   // POST /oauth/token
   // grant_type=client_credentials&client_id=scholarship_api&client_secret=...
   // Returns: { access_token, token_type: 'Bearer', expires_in: 300 }
   ```

5. **MFA Enforcement Middleware**
   ```typescript
   function requireMFA(req, res, next) {
     const { role } = req.user;
     if (['admin', 'provider_admin'].includes(role) && !req.user.mfaVerified) {
       return res.status(403).json({ error: 'MFA required' });
     }
     next();
   }
   ```

6. **CORS Strict Allowlist**
   ```typescript
   const allowedOrigins = [
     'https://student-pilot-jamarrlmayes.replit.app',
     'https://provider-register-jamarrlmayes.replit.app'
   ];
   app.use(cors({
     origin: (origin, callback) => {
       if (!origin || allowedOrigins.includes(origin)) {
         callback(null, true);
       } else {
         callback(new Error('CORS policy violation'));
       }
     },
     credentials: true
   }));
   ```

### Evidence Deliverables
- [ ] Live JWKS at `https://scholar-auth.../. well-known/jwks.json`
- [ ] Postman collection with JWT validation tests
- [ ] Audit log sample (redacted PII)
- [ ] OpenAPI spec for auth endpoints
- [ ] Key rotation SOP committed to repo
- [ ] Screenshot: MFA challenge for admin role
- [ ] Screenshot: CORS preflight success from student_pilot

### Acceptance Criteria
✅ **PASS if:**
- JWKS endpoint returns valid JWK with RS256
- JWT signature validates against JWKS from scholarship_api
- Admin login requires MFA (email/SMS OTP)
- CORS blocks unauthorized origins
- Audit logs capture auth events without PII

---

## T+2 to T+4: scholarship_api (Security + Reliability)

### Requirements Checklist
- [ ] JWT validation middleware (signature + claims)
- [ ] Scope-based authorization per route
- [ ] CORS allowlist (student_pilot, provider_register only)
- [ ] OpenAPI spec live at `/api-docs`
- [ ] 401/403 standardized error responses
- [ ] Webhook triggers to auto_com_center
- [ ] Data feed endpoint for auto_page_maker
- [ ] Connection pooling tuned (PgPool config)
- [ ] Redis caching (JWKS, rate limits, ephemeral state)
- [ ] `/healthz` and `/readyz` endpoints
- [ ] Request timeout middleware (30s default)
- [ ] Circuit breaker on upstream calls

### Implementation Steps
1. **JWT Validation Middleware**
   ```typescript
   import jwt from 'jsonwebtoken';
   import jwksClient from 'jwks-rsa';
   
   const client = jwksClient({
     jwksUri: 'https://scholar-auth.../. well-known/jwks.json',
     cache: true,
     cacheMaxAge: 3600000 // 1 hour
   });
   
   async function verifyToken(req, res, next) {
     const token = req.headers.authorization?.split(' ')[1];
     if (!token) return res.status(401).json({ error: 'Missing token' });
     
     try {
       const decoded = jwt.decode(token, { complete: true });
       const key = await client.getSigningKey(decoded.header.kid);
       const publicKey = key.getPublicKey();
       
       const payload = jwt.verify(token, publicKey, {
         algorithms: ['RS256'],
         issuer: 'https://scholar-auth...',
         clockTolerance: 5
       });
       
       req.user = payload;
       next();
     } catch (err) {
       return res.status(401).json({ error: 'Invalid token' });
     }
   }
   ```

2. **Scope Authorization**
   ```typescript
   function requireScope(scope: string) {
     return (req, res, next) => {
       if (!req.user.scopes.includes(scope)) {
         return res.status(403).json({ error: 'Insufficient permissions' });
       }
       next();
     };
   }
   
   // Usage:
   app.get('/api/scholarships', verifyToken, requireScope('read:scholarships'), ...);
   ```

3. **OpenAPI Spec**
   ```typescript
   import swaggerUi from 'swagger-ui-express';
   import swaggerDoc from './openapi.json';
   
   app.use('/api-docs', verifyToken, swaggerUi.serve, swaggerUi.setup(swaggerDoc));
   ```

4. **Auto Com Center Webhooks**
   ```typescript
   async function notifyApplicationSubmitted(applicationId: string) {
     const comCenterUrl = process.env.AUTO_COM_CENTER_BASE_URL;
     await fetch(`${comCenterUrl}/api/notifications/trigger`, {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${await getM2MToken()}`,
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({
         event: 'application.submitted',
         data: { applicationId }
       })
     });
   }
   ```

5. **Redis Caching**
   ```typescript
   import Redis from 'ioredis';
   const redis = new Redis(process.env.REDIS_URL);
   
   // Cache JWKS
   const cachedJWKS = await redis.get('jwks');
   if (!cachedJWKS) {
     const jwks = await fetch('https://scholar-auth.../. well-known/jwks.json');
     await redis.setex('jwks', 3600, JSON.stringify(jwks));
   }
   ```

6. **Connection Pooling**
   ```typescript
   import { Pool } from 'pg';
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
     max: 20,
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 2000
   });
   ```

### Evidence Deliverables
- [ ] k6 smoke test: 100 RPS, P95 < 300ms, error rate < 1%
- [ ] Sample E2E: student session → API call → notification fired
- [ ] OpenAPI spec accessible at `/api-docs` (auth required)
- [ ] Redis cache hit rate report
- [ ] Connection pool metrics (active/idle/waiting)

### Acceptance Criteria
✅ **PASS if:**
- JWT validation rejects invalid/expired tokens
- Scope enforcement blocks unauthorized routes
- CORS blocks non-allowlisted origins
- k6 canary passes performance targets
- Notification webhook fires on application submit

---

## T+4 to T+6: auto_com_center (Gate 1 Notifications)

### Requirements Checklist
- [ ] SendGrid integrated (verified domain)
- [ ] Twilio SMS integrated (test number)
- [ ] SPF/DKIM/DMARC DNS records configured
- [ ] Bounce/complaint webhook handlers
- [ ] Delivery event logging
- [ ] S2S OAuth2 client_credentials enforcement
- [ ] Email/SMS templates (env-driven registry)
- [ ] Zero hardcoded URLs in templates
- [ ] CORS strict allowlist
- [ ] Canary notification script with runbook

### Implementation Steps
1. **SendGrid Setup**
   ```typescript
   import sgMail from '@sendgrid/mail';
   sgMail.setApiKey(process.env.SENDGRID_API_KEY);
   
   async function sendEmail(to: string, templateId: string, data: any) {
     await sgMail.send({
       to,
       from: 'notifications@scholarlink.io',
       templateId,
       dynamicTemplateData: {
         ...data,
         app_url: process.env.STUDENT_PILOT_BASE_URL
       }
     });
   }
   ```

2. **Twilio SMS Setup**
   ```typescript
   import twilio from 'twilio';
   const client = twilio(
     process.env.TWILIO_ACCOUNT_SID,
     process.env.TWILIO_AUTH_TOKEN
   );
   
   async function sendSMS(to: string, message: string) {
     await client.messages.create({
       to,
       from: process.env.TWILIO_PHONE_NUMBER,
       body: message
     });
   }
   ```

3. **Bounce/Complaint Webhooks**
   ```typescript
   app.post('/webhooks/sendgrid', express.json(), (req, res) => {
     const events = req.body;
     for (const event of events) {
       if (event.event === 'bounce' || event.event === 'dropped') {
         logger.warn('Email delivery failed', {
           email: event.email,
           reason: event.reason,
           event_id: event.sg_event_id
         });
       }
     }
     res.status(200).send();
   });
   ```

4. **Template Registry**
   ```typescript
   const templates = {
     application_submitted: {
       sendgrid_id: process.env.TEMPLATE_APPLICATION_SUBMITTED,
       sms_text: 'Your ScholarLink application has been submitted! Track progress at {{app_url}}/applications/{{id}}'
     }
   };
   ```

### Evidence Deliverables
- [ ] Test email to controlled inbox (screenshot)
- [ ] Test SMS to controlled number (screenshot)
- [ ] Webhook event log sample
- [ ] DNS records confirmation (SPF/DKIM/DMARC)
- [ ] k6 canary: 250 RPS, P95 <=120ms

### Acceptance Criteria
✅ **PASS if:**
- Email delivers to inbox (not spam)
- SMS delivers within 30s
- Bounce webhook logs failure event
- S2S auth rejects unauthorized calls
- Performance canary passes targets

---

## T+4 to T+6 (Parallel): Config Standardization

### Requirements Checklist
- [ ] Zero hardcoded URLs across all services
- [ ] All secrets via Replit Secrets
- [ ] Shared `.env.schema` published
- [ ] Per-service config validation script
- [ ] Config linter passes all services

### Implementation Steps
1. **Shared Schema**
   ```typescript
   // .env.schema.json
   {
     "scholar_auth": {
       "required": ["JWT_PRIVATE_KEY", "JWT_PUBLIC_KEY", "DATABASE_URL"],
       "optional": ["MFA_EMAIL_PROVIDER"]
     },
     "scholarship_api": {
       "required": ["DATABASE_URL", "SCHOLAR_AUTH_JWKS_URL", "AUTO_COM_CENTER_BASE_URL"]
     }
   }
   ```

2. **Config Linter**
   ```bash
   #!/bin/bash
   # config-lint.sh
   set -e
   
   for service in scholar_auth scholarship_api auto_com_center student_pilot provider_register; do
     echo "Checking $service..."
     cd "$service"
     npm run config:validate
     cd ..
   done
   
   echo "✅ All services pass config validation"
   ```

### Evidence Deliverables
- [ ] Config linter output (all PASS)
- [ ] Grep proof: 0 hardcoded URLs
- [ ] Secrets checklist committed

---

## T+6 to T+8: Frontend Wiring + E2E Smoke

### student_pilot Requirements
- [ ] Login/registration via scholar_auth
- [ ] JWT storage (httpOnly cookie or secure localStorage)
- [ ] Authorization header on API calls
- [ ] GA4 "first_document_upload" event wired
- [ ] Standardized error handling (401/403/5xx)

### provider_register Requirements
- [ ] Provider auth via scholar_auth
- [ ] Scholarship CRUD with JWT
- [ ] GA4 "first_scholarship_created" event wired
- [ ] Error handling

### E2E Happy Paths
**Student Journey:**
1. Register → Login (scholar_auth)
2. View scholarships (scholarship_api)
3. Upload document (student_pilot + GCS)
4. GA4 event fires

**Provider Journey:**
1. Register → Login (scholar_auth)
2. Create scholarship (scholarship_api)
3. View applicants
4. GA4 event fires

### Evidence Deliverables
- [ ] E2E test run output (student journey PASS)
- [ ] E2E test run output (provider journey PASS)
- [ ] GA4 DebugView screenshots (both events)
- [ ] Event payload samples

---

## Gate Acceptance Criteria

### Gate 0 (Security) - MUST PASS TODAY
✅ **Auth:**
- RS256 JWTs with JWKS
- RBAC claims validated
- MFA enforced (admin/provider_admin)
- Strict CORS
- Audit logs enabled

✅ **Config:**
- No hardcoded URLs
- All secrets via env
- Health/ready endpoints live

✅ **Security Smoke:**
- OWASP top issues mitigated
- Rate limiting on public endpoints

### Gate 1 (Integrations) - START IMMEDIATELY AFTER GATE 0
✅ **Notifications:**
- auto_com_center receives and delivers canary emails/SMS
- Webhook integration tested

✅ **API Docs:**
- OpenAPI visible for scholar_auth and scholarship_api

✅ **E2E:**
- Student and Provider happy-paths pass in staging

---

## Hourly Reporting Template

**Hour X Update (R/A/G)**

**Status:** 🟢 GREEN | 🟡 AMBER | 🔴 RED

**Completed:**
- Task 1 (commit: abc123) - [evidence link]
- Task 2 (commit: def456) - [evidence link]

**In Progress:**
- Task 3 (80% complete)

**Blockers:**
- None | Blocker description + mitigation plan

**Next Hour:**
- Task 4
- Task 5

**Evidence Links:**
- [Screenshot: JWKS endpoint]
- [k6 results]
- [GA4 DebugView]

---

## Risk Controls

**P0 Security Regressions:**
- Halt all deploys until resolved
- Immediate rollback if auth/CORS breaks

**Service Missing Gate 0:**
- Quarantine behind feature flags
- Other services continue

**ESP DNS >24h:**
- Fallback to Postmark with Sender Signature
- Continue with email verification in parallel

**Budget Overrun:**
- CEO approval required for any variance above caps

---

## Success Criteria (End of Sprint)

✅ **Gate 0 CLOSED:**
- All 5 services pass security checklist
- Config linter passes
- Auth E2E validates

✅ **Gate 1 IN PROGRESS:**
- Canary notifications delivered
- API docs accessible
- Frontend E2E passing

✅ **CEO Evidence Bundle:**
- Hourly updates (R/A/G) published
- Commit IDs documented
- Screenshots/logs attached
- Go/no-go recommendation provided

---

**End of Runbook**  
**Ready to execute upon workspace access confirmation**
