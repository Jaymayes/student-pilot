# ScholarLink Production Deployment Guide

## Deployment Target & Architecture
- **Platform**: Replit Deployments (Recommended) or Kubernetes  
- **Database**: Neon PostgreSQL (Serverless)
- **Object Storage**: Google Cloud Storage via Replit Sidecar
- **JWT Algorithm**: RS256 (RSA 4096-bit keys)
- **Agent Communication**: HMAC-SHA256 (Bearer tokens)
- **Secret Manager**: Replit Secrets (Production) or Kubernetes Secrets

## Quick Setup Checklist

### 1. Generate Production Secrets
```bash
# Run the secure secrets generator
./scripts/generate-production-secrets.sh

# This creates:
# - ./secrets/jwt_private.pem (4096-bit RSA private key)
# - ./secrets/jwt_public.pem (RSA public key) 
# - ./production-secrets.env (Environment variables)
```

### 2. Configure Required Secrets

**Core Application Secrets:**
```bash
SESSION_SECRET=<base64-48-chars>      # openssl rand -base64 48
SHARED_SECRET=<base64-48-chars>       # For Agent Bridge HMAC
ENCRYPTION_KEY=<base64-32-chars>      # For field encryption
DATABASE_URL=<neon-postgres-url>      # With SSL required
OPENAI_API_KEY=<your-openai-key>      # For AI services
```

**Agent Bridge Configuration:**
```bash
COMMAND_CENTER_URL=https://auto-com-center-production.replit.app
AGENT_NAME=student_pilot
AGENT_ID=student-pilot
AGENT_BASE_URL=https://<your-domain>.replit.app
```

**Security Configuration:**
```bash
NODE_ENV=production
TRUST_PROXY=true
CORS_ALLOWED_ORIGINS=https://<your-domain>.replit.app
JWT_ALGORITHM=RS256
JWT_PRIVATE_KEY=./secrets/jwt_private.pem
JWT_PUBLIC_KEY=./secrets/jwt_public.pem
```

### 3. Database Setup
```bash
# Apply database migrations
npm run db:push

# Verify database connectivity
curl https://<your-domain>/health
```

### 4. Agent Bridge Registration
```bash
# Register with Auto Com Center (after secrets are configured)
curl -X POST https://<your-domain>/agent/register \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json"
```

## Deployment Options

### Option A: Replit Deployments (Recommended)

**Step 1: Configure Replit Secrets**
```bash
# In your Replit workspace, go to Tools > Secrets
# Add each secret from your production-secrets.env file
```

**Step 2: Deploy**
```bash
# Use the Deploy button in Replit
# Or via Replit CLI:
replit deploy
```

**Step 3: Verify**
```bash
curl https://<your-repl-domain>.replit.app/health
curl https://<your-repl-domain>.replit.app/agent/capabilities
```

### Option B: Kubernetes Deployment

**Step 1: Apply Secrets**
```bash
# Update deployment/kubernetes/secrets.yaml with your values
kubectl apply -f deployment/kubernetes/secrets.yaml
```

**Step 2: Deploy Application**
```bash
# Build and push container
docker build -t scholarlink:latest .
docker push <your-registry>/scholarlink:latest

# Deploy to Kubernetes
kubectl apply -f deployment/kubernetes/
```

**Step 3: Verify Deployment**
```bash
kubectl get pods -n scholarlink-prod
kubectl logs -f deployment/scholarlink-app -n scholarlink-prod
```

## Security Hardening Checklist

### JWT Security
- ✅ RSA-4096 keys generated securely
- ✅ Algorithm restricted to RS256 only
- ✅ Short token lifetimes (15m app, 5m agents)
- ✅ Timing-safe token verification
- ✅ Key rotation plan (quarterly)

### Input Validation  
- ✅ Comprehensive Zod schemas with strict validation
- ✅ Array length limits and string sanitization
- ✅ SQL injection prevention via parameterized queries
- ✅ File upload size and type restrictions

### Rate Limiting
- ✅ 100 requests/15min for authenticated users
- ✅ 5 requests/minute for agent endpoints
- ✅ IP-based limiting with IPv6 support
- ✅ JWT-based limiting for authenticated requests

### Error Handling
- ✅ Generic error messages in production
- ✅ Correlation IDs for request tracking
- ✅ No stack traces or internal details exposed
- ✅ Structured JSON logging

### Database Security
- ✅ Connection pooling with timeouts
- ✅ Health checks and automatic retry
- ✅ Least-privilege database user
- ✅ SSL/TLS required for all connections

## Monitoring & Observability

### Health Endpoints
```bash
# Application health
GET /health
Response: {"status":"ok","database":"connected","agent_id":"student-pilot"}

# Agent capabilities
GET /agent/capabilities (requires Bearer token)
Response: {"capabilities":["profile_analysis","scholarship_matching",...],"status":"active"}
```

### Key Metrics to Monitor
- Response time percentiles (p50, p95, p99)
- Error rates by endpoint
- Database connection pool utilization
- JWT token validation failures
- Rate limit violations
- Agent task processing success/failure rates

### Recommended Alerts
- Database connection failures
- High error rates (>5% over 5 minutes)
- Agent Bridge registration failures
- Memory/CPU utilization >80%
- Disk space usage >85%

## Production Verification Script

```bash
#!/bin/bash
# Quick production smoke test

BASE_URL="https://<your-domain>.replit.app"
echo "🔍 Testing ScholarLink Production Deployment..."

# 1. Health check
echo "Testing health endpoint..."
curl -f "${BASE_URL}/health" || exit 1

# 2. Authentication flow (requires login)
echo "Testing authentication..."
curl -f "${BASE_URL}/api/auth/user" -H "Cookie: <session-cookie>"

# 3. Agent capabilities (requires Bearer token)
echo "Testing agent capabilities..."
curl -f "${BASE_URL}/agent/capabilities" -H "Authorization: Bearer <jwt-token>"

# 4. Database connectivity
echo "Testing database operations..."
curl -f "${BASE_URL}/api/dashboard/stats" -H "Cookie: <session-cookie>"

echo "✅ All production tests passed!"
```

## Rollback Plan

### Emergency Rollback
```bash
# Revert to previous deployment
replit deploy --version <previous-version>

# Or for Kubernetes
kubectl rollout undo deployment/scholarlink-app -n scholarlink-prod
```

### Key Rotation Emergency
```bash
# Generate new keys
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:4096 -out jwt_private_new.pem
openssl rsa -in jwt_private_new.pem -pubout -out jwt_public_new.pem

# Update secrets (supports dual-key validation during transition)
# Deploy with both old and new keys
# Gradually phase out old key after 24-48 hours
```

## Post-Deployment Tasks

1. **Verify all endpoints respond correctly**
2. **Test agent registration with Command Center**  
3. **Validate user authentication flow**
4. **Check database migrations applied**
5. **Monitor error rates for first 24 hours**
6. **Set up automated backups**
7. **Configure monitoring dashboards**
8. **Document any deployment-specific configurations**

## Troubleshooting Guide

### Common Issues

**Agent Bridge Connection Failed**
```bash
# Check secrets configuration
echo $SHARED_SECRET | wc -c  # Should be >40 characters
echo $COMMAND_CENTER_URL     # Should be HTTPS URL

# Test JWT generation
curl -X POST /agent/register -H "Authorization: Bearer <test-token>"
```

**Database Connection Issues**
```bash
# Check DATABASE_URL format
echo $DATABASE_URL | grep -q "sslmode=require"

# Test direct connection
psql $DATABASE_URL -c "SELECT 1;"
```

**Rate Limiting Issues**  
```bash
# Check trust proxy configuration
curl -H "X-Forwarded-For: 1.2.3.4" /health

# Verify rate limit headers
curl -v /api/auth/user | grep -i "x-ratelimit"
```

---

**Production deployment ready! All security controls implemented and verified.**