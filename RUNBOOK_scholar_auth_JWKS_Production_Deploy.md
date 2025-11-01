# scholar_auth Production Redeploy + JWKS Propagation Runbook

**Owner**: Auth Lead  
**Deadline**: T+30 minutes from CEO directive  
**Status**: CRITICAL - Gate 1 blocker for soft launch

---

## Current State
- **JWKS Endpoint**: `{"error":"server_error","message":"JWKS endpoint failed"}`
- **Impact**: Blocks all JWT validation across platform (7 dependent services)
- **Root Cause**: JWKS generation/serving failure on production

---

## Option 1: Force Production Rebuild (Preferred - 15 min ETA)

### Step 1: Verify JWKS Keys Exist in Code
```bash
# SSH into scholar_auth workspace
cd /path/to/scholar_auth

# Check if private/public keys are generated
ls -la keys/
# Expected: private.pem, public.pem or similar RSA key pair

# If missing, generate RS256 keypair:
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem
```

### Step 2: Verify JWKS Endpoint Code
```typescript
// server/routes/jwks.ts or similar
app.get('/.well-known/jwks.json', (req, res) => {
  const publicKey = fs.readFileSync('keys/public.pem', 'utf8');
  const jwk = convertPEMtoJWK(publicKey); // Use 'pem-jwk' or 'node-jose'
  
  res.json({
    keys: [{
      kid: process.env.JWKS_KEY_ID || 'scholar-auth-key-1',
      kty: 'RSA',
      alg: 'RS256',
      use: 'sig',
      n: jwk.n,
      e: jwk.e
    }]
  });
});
```

### Step 3: Force Replit Production Rebuild
```bash
# In Replit UI:
# 1. Go to Deployments tab
# 2. Click "Redeploy" on active production deployment
# 3. Select "Clear cache and rebuild"
# 4. Wait 5-10 minutes for rebuild

# Alternative via CLI (if available):
replit deployments create --production --clear-cache
```

### Step 4: Verify JWKS Endpoint
```bash
# Wait 2 minutes for deployment, then test:
curl -s https://scholar-auth-jamarrlmayes.replit.app/.well-known/jwks.json

# Expected output:
# {
#   "keys": [{
#     "kid": "scholar-auth-key-1",
#     "kty": "RSA",
#     "alg": "RS256",
#     "use": "sig",
#     "n": "0vx7agoebG...", (long base64 string)
#     "e": "AQAB"
#   }]
# }

# MUST NOT return:
# - HTML (indicates 404/redirect)
# - {"error":"server_error"}
# - Empty response or timeout
```

---

## Option 2: Fresh Production Deployment (If cache persists >15 min)

### Step 1: Create New Production Deployment
```bash
# In Replit UI:
# 1. Deployments → "Create new production deployment"
# 2. Note the new URL: https://scholar-auth-<NEW_ID>.replit.app
# 3. Wait for GREEN status (5-10 min)
```

### Step 2: Test New JWKS URL
```bash
NEW_URL="https://scholar-auth-<NEW_ID>.replit.app"
curl -s $NEW_URL/.well-known/jwks.json | jq .

# Verify keys array exists with RS256 key
```

### Step 3: Propagate New JWKS URL (CRITICAL)
Update `ISSUER_URL` in ALL dependent services:

**Services to update** (7 total):
1. **scholarship_api** → `.env`: `AUTH_ISSUER_URL=https://scholar-auth-<NEW_ID>.replit.app`
2. **student_pilot** → `.env`: `AUTH_ISSUER_URL=https://scholar-auth-<NEW_ID>.replit.app`
3. **provider_register** → `.env`: `AUTH_ISSUER_URL=https://scholar-auth-<NEW_ID>.replit.app`
4. **scholarship_sage** → `.env`: `AUTH_ISSUER_URL=https://scholar-auth-<NEW_ID>.replit.app`
5. **scholarship_agent** → `.env`: `AUTH_ISSUER_URL=https://scholar-auth-<NEW_ID>.replit.app`
6. **auto_com_center** → `.env`: `AUTH_ISSUER_URL=https://scholar-auth-<NEW_ID>.replit.app`
7. **auto_page_maker** → `.env`: `AUTH_ISSUER_URL=https://scholar-auth-<NEW_ID>.replit.app`

**Restart workflow** in each service after updating env vars.

---

## Acceptance Criteria (Gate 1 GREEN)

### 1. JWKS Endpoint Returns Valid Keys
```bash
curl -s https://scholar-auth-jamarrlmayes.replit.app/.well-known/jwks.json | jq .
```
**Expected**:
- HTTP 200 OK
- JSON with `keys` array
- At least one key with: `kid`, `kty="RSA"`, `alg="RS256"`, `use="sig"`, `n`, `e`
- No HTML, no errors, no redirects

### 2. Security Headers Present (6/6)
```bash
curl -I https://scholar-auth-jamarrlmayes.replit.app/canary
```
**Expected headers**:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Content-Security-Policy: default-src 'self'; frame-ancestors 'none'`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`

### 3. /canary v2.7 Compliance
```bash
curl -s https://scholar-auth-jamarrlmayes.replit.app/canary | jq .
```
**Expected 8 fields**:
```json
{
  "app": "scholar_auth",
  "app_base_url": "https://scholar-auth-jamarrlmayes.replit.app",
  "version": "v2.7",
  "status": "ok",
  "p95_ms": <number ≤120>,
  "security_headers": {
    "present": ["HSTS", "CSP", "X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy"],
    "missing": []
  },
  "dependencies_ok": true,
  "timestamp": "2025-11-01T..."
}
```

### 4. Token Validation Works
```bash
# From any dependent service, test JWT validation:
# Option A: Use scholarship_api protected endpoint with valid JWT
# Option B: Use scholar_auth /validate endpoint if available

# Expected: 200 OK with valid JWT, 401 with invalid/missing JWT
```

### 5. Performance: P95 ≤120ms
```bash
# Run 30 samples:
for i in {1..30}; do
  curl -w "%{time_total}\n" -o /dev/null -s https://scholar-auth-jamarrlmayes.replit.app/canary
done | sort -n | tail -5

# P95 (28th value) MUST be ≤0.120 seconds
```

---

## Rollback Plan
If production deploy breaks existing functionality:
1. Revert to previous deployment in Replit UI
2. Or restore last-known-good commit: `git checkout <sha> && git push origin main --force`
3. Notify CEO immediately with ETA for fix

---

## Post-Deployment Checklist
- [ ] JWKS returns valid RS256 keys (no errors)
- [ ] /canary returns v2.7 8-field schema
- [ ] Security headers 6/6 present
- [ ] P95 latency ≤120ms (30 samples)
- [ ] Dependent services can validate JWTs
- [ ] If new URL: propagated to all 7 services and workflows restarted
- [ ] Submit Section 7 report with verification outputs

---

## Escalation
If blocked >30 minutes:
- **Contact**: CEO immediately
- **Fallback**: Deploy scholar_auth on separate subdomain/port as temporary fix
- **Impact**: Delays soft launch; blocks B2C revenue start
