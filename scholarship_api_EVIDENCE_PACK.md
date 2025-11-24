App: scholarship_api | APP_BASE_URL: https://scholarship-api-jamarrlmayes.replit.app

# ⚠️ WRONG WORKSPACE ALERT

**Status:** PLANNING ONLY - Evidence collection BLOCKED  
**Current Workspace:** student-pilot (https://student-pilot-jamarrlmayes.replit.app)  
**Expected Workspace:** scholarship-api (https://scholarship-api-jamarrlmayes.replit.app)  
**Report Date:** 2025-11-24  
**Agent:** Agent3

---

## Executive Summary

**This document provides PLANNED TEST SUITE and EVIDENCE COLLECTION PROCEDURES** for scholarship_api. Actual evidence cannot be collected until Agent3 is placed in the correct workspace.

All commands below are **RUNNABLE** and should produce the specified outputs once scholarship_api is deployed.

---

## 1. Health and Version Endpoints

### Test 1.1: Health Check

**Command:**
```bash
curl -sS -w "\nHTTP:%{http_code} Time:%{time_total}s\n" \
  https://scholarship-api-jamarrlmayes.replit.app/healthz
```

**Expected Output:**
```json
{
  "status": "ok",
  "db": "ok",
  "uptime_s": 3600,
  "version": "1.0.0",
  "request_id": "req_abc123"
}
HTTP:200 Time:0.045s
```

**Success Criteria:**
- ✅ HTTP 200
- ✅ Response time < 100ms
- ✅ `status: "ok"`
- ✅ `db: "ok"` (database connectivity verified)
- ✅ `request_id` present

**Actual Output:** CANNOT COLLECT (wrong workspace)

---

### Test 1.2: Version Information

**Command:**
```bash
curl -sS -w "\nHTTP:%{http_code} Time:%{time_total}s\n" \
  https://scholarship-api-jamarrlmayes.replit.app/version
```

**Expected Output:**
```json
{
  "version": "1.0.0",
  "git_sha": "a1b2c3d",
  "build_time": "2025-11-24T12:00:00Z",
  "request_id": "req_def456"
}
HTTP:200 Time:0.032s
```

**Success Criteria:**
- ✅ HTTP 200
- ✅ Git SHA present
- ✅ Build timestamp in ISO8601 format
- ✅ `request_id` present

**Actual Output:** CANNOT COLLECT (wrong workspace)

---

### Test 1.3: Metrics Endpoint

**Command:**
```bash
curl -sS -w "\nHTTP:%{http_code}\n" \
  https://scholarship-api-jamarrlmayes.replit.app/metrics | head -30
```

**Expected Output (Prometheus format):**
```
# HELP api_requests_total Total number of API requests
# TYPE api_requests_total counter
api_requests_total{route="/api/v1/scholarships",method="GET",status="200"} 1523
api_requests_total{route="/api/v1/credits/balance",method="GET",status="200"} 892
api_requests_total{route="/api/v1/credits/debit",method="POST",status="201"} 234
api_requests_total{route="/api/v1/credits/debit",method="POST",status="402"} 12

# HELP api_request_duration_seconds API request duration in seconds
# TYPE api_request_duration_seconds histogram
api_request_duration_seconds_bucket{route="/api/v1/scholarships",method="GET",le="0.05"} 1204
api_request_duration_seconds_bucket{route="/api/v1/scholarships",method="GET",le="0.1"} 1487
api_request_duration_seconds_bucket{route="/api/v1/scholarships",method="GET",le="0.15"} 1520
api_request_duration_seconds_sum{route="/api/v1/scholarships",method="GET"} 87.34
api_request_duration_seconds_count{route="/api/v1/scholarships",method="GET"} 1523

HTTP:200
```

**Success Criteria:**
- ✅ HTTP 200
- ✅ Prometheus exposition format
- ✅ Request counters by route
- ✅ Latency histograms present

**Actual Output:** CANNOT COLLECT (wrong workspace)

---

## 2. Public Scholarships API (Unauthenticated)

### Test 2.1: Scholarships List

**Command:**
```bash
curl -sS -w "\nHTTP:%{http_code} Time:%{time_total}s\n" \
  "https://scholarship-api-jamarrlmayes.replit.app/api/v1/scholarships?search=STEM&state=CA&page=1&per_page=10"
```

**Expected Output:**
```json
{
  "items": [
    {
      "id": "sch_001",
      "title": "STEM Excellence Scholarship",
      "amount_min": 5000,
      "amount_max": 10000,
      "deadline": "2026-03-15",
      "provider_id": "prov_123",
      "category": "STEM",
      "state": "CA",
      "description": "For outstanding STEM students..."
    }
    // ... 9 more items
  ],
  "page": 1,
  "per_page": 10,
  "total": 247,
  "facets": {
    "categories": {"STEM": 247, "Arts": 89, "Business": 123},
    "states": {"CA": 247, "NY": 156, "TX": 198}
  },
  "request_id": "req_ghi789"
}
HTTP:200 Time:0.089s
```

**Success Criteria:**
- ✅ HTTP 200 (no authentication required)
- ✅ Response time < 120ms (P95 target)
- ✅ Items array with 10 scholarships
- ✅ Pagination metadata (page, per_page, total)
- ✅ Facets for filtering
- ✅ `request_id` present

**Actual Output:** CANNOT COLLECT (wrong workspace)

---

### Test 2.2: Scholarship Detail

**Command:**
```bash
curl -sS -w "\nHTTP:%{http_code} Time:%{time_total}s\n" \
  https://scholarship-api-jamarrlmayes.replit.app/api/v1/scholarships/sch_001
```

**Expected Output:**
```json
{
  "id": "sch_001",
  "title": "STEM Excellence Scholarship",
  "amount_min": 5000,
  "amount_max": 10000,
  "deadline": "2026-03-15",
  "provider_id": "prov_123",
  "category": "STEM",
  "state": "CA",
  "description": "Full description...",
  "eligibility": ["Must be enrolled in STEM program", "GPA >= 3.5"],
  "application_url": "https://example.com/apply",
  "created_at": "2025-11-01T10:00:00Z",
  "updated_at": "2025-11-20T15:30:00Z",
  "request_id": "req_jkl012"
}
HTTP:200 Time:0.042s
```

**Success Criteria:**
- ✅ HTTP 200 (no authentication required)
- ✅ Response time < 120ms (P95 target)
- ✅ Complete scholarship object with all fields
- ✅ `request_id` present

**Actual Output:** CANNOT COLLECT (wrong workspace)

---

### Test 2.3: P95 Latency Sampling (Scholarships)

**Command:**
```bash
# Run 20 requests and calculate P95
for i in {1..20}; do
  curl -sS -w "%{time_total}\n" -o /dev/null \
    "https://scholarship-api-jamarrlmayes.replit.app/api/v1/scholarships?page=1&per_page=10"
done | sort -n | awk 'NR==19 {print "P95: " $1 "s"}'
```

**Expected Output:**
```
P95: 0.108s
```

**Success Criteria:**
- ✅ P95 ≤ 0.120s (120ms target)

**Actual Output:** CANNOT COLLECT (wrong workspace)

---

## 3. JWT Authentication Tests

### Test 3.1: Missing Token (401 Unauthorized)

**Command:**
```bash
curl -sS -w "\nHTTP:%{http_code} Time:%{time_total}s\n" \
  "https://scholarship-api-jamarrlmayes.replit.app/api/v1/credits/balance?user_id=user_123"
```

**Expected Output:**
```json
{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Authorization header required",
    "request_id": "req_mno345"
  }
}
HTTP:401 Time:0.018s
```

**Success Criteria:**
- ✅ HTTP 401
- ✅ Error code: `UNAUTHENTICATED`
- ✅ Clear error message
- ✅ `request_id` present
- ✅ Fast rejection (no expensive validation)

**Actual Output:** CANNOT COLLECT (wrong workspace)

---

### Test 3.2: Invalid Token (401 Unauthorized)

**Command:**
```bash
curl -sS -w "\nHTTP:%{http_code} Time:%{time_total}s\n" \
  -H "Authorization: Bearer INVALID_TOKEN_STRING" \
  "https://scholarship-api-jamarrlmayes.replit.app/api/v1/credits/balance?user_id=user_123"
```

**Expected Output:**
```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "JWT signature verification failed",
    "request_id": "req_pqr678"
  }
}
HTTP:401 Time:0.035s
```

**Success Criteria:**
- ✅ HTTP 401
- ✅ Error code: `INVALID_TOKEN`
- ✅ JWT verification attempted
- ✅ `request_id` present

**Actual Output:** CANNOT COLLECT (wrong workspace)

---

### Test 3.3: Valid Token (200 OK)

**Setup:**
```bash
# Obtain valid JWT from scholar_auth
TOKEN=$(curl -sS -X POST https://scholar-auth-jamarrlmayes.replit.app/api/token \
  -H "Content-Type: application/json" \
  -d '{"client_id":"scholarship_api","client_secret":"***","grant_type":"client_credentials","scope":"credits:read"}' \
  | jq -r '.access_token')

echo "Token prefix: ${TOKEN:0:20}..."
# Expected: "eyJhbGciOiJSUzI1NiIs..."
```

**Command:**
```bash
curl -sS -w "\nHTTP:%{http_code} Time:%{time_total}s\n" \
  -H "Authorization: Bearer $TOKEN" \
  "https://scholarship-api-jamarrlmayes.replit.app/api/v1/credits/balance?user_id=user_123"
```

**Expected Output:**
```json
{
  "user_id": "user_123",
  "balance": 5000,
  "last_updated": "2025-11-24T10:30:00Z",
  "request_id": "req_stu901"
}
HTTP:200 Time:0.067s
```

**Success Criteria:**
- ✅ HTTP 200
- ✅ JWT signature verified against scholar_auth JWKS
- ✅ Audience (`aud`) validated: `scholarship_api`
- ✅ Issuer (`iss`) validated: `https://scholar-auth-jamarrlmayes.replit.app`
- ✅ Balance returned for requested user
- ✅ `request_id` present

**Actual Output:** CANNOT COLLECT (wrong workspace)

---

## 4. Credits Ledger Tests

### Test 4.1: Credit Grant (Admin/System Role)

**Command:**
```bash
# Obtain M2M token with admin/system role
M2M_TOKEN=$(curl -sS -X POST https://scholar-auth-jamarrlmayes.replit.app/api/token \
  -H "Content-Type: application/json" \
  -d '{"client_id":"provider_register","client_secret":"***","grant_type":"client_credentials","scope":"credits:grant"}' \
  | jq -r '.access_token')

curl -sS -w "\nHTTP:%{http_code} Time:%{time_total}s\n" \
  -X POST https://scholarship-api-jamarrlmayes.replit.app/api/v1/credits/credit \
  -H "Authorization: Bearer $M2M_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "amount": 5000,
    "reason": "promotional_grant",
    "source": "provider_register",
    "reference_id": "promo_abc123"
  }'
```

**Expected Output:**
```json
{
  "user_id": "user_123",
  "amount_credited": 5000,
  "new_balance": 5000,
  "ledger_entry_id": "txn_001",
  "request_id": "req_vwx234"
}
HTTP:201 Time:0.145s
```

**Success Criteria:**
- ✅ HTTP 201 Created
- ✅ Credits added to balance
- ✅ Ledger entry created with reference_id
- ✅ `request_id` present
- ✅ Response time < 200ms (P95 target)

**Actual Output:** CANNOT COLLECT (wrong workspace)

---

### Test 4.2: Credit Debit (Student Role)

**Command:**
```bash
# Obtain user token with student role
USER_TOKEN=$(curl -sS -X POST https://scholar-auth-jamarrlmayes.replit.app/api/token \
  -H "Content-Type: application/json" \
  -d '{"client_id":"student_pilot","client_secret":"***","grant_type":"client_credentials","scope":"credits:debit","user_id":"user_123"}' \
  | jq -r '.access_token')

IDEMPOTENCY_KEY=$(uuidgen)

curl -sS -w "\nHTTP:%{http_code} Time:%{time_total}s\n" \
  -X POST https://scholarship-api-jamarrlmayes.replit.app/api/v1/credits/debit \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{
    "user_id": "user_123",
    "amount": 100,
    "feature": "scholarship_match",
    "reference_id": "match_xyz789"
  }'
```

**Expected Output:**
```json
{
  "user_id": "user_123",
  "amount_debited": 100,
  "new_balance": 4900,
  "ledger_entry_id": "txn_002",
  "request_id": "req_yza567"
}
HTTP:201 Time:0.156s
```

**Success Criteria:**
- ✅ HTTP 201 Created
- ✅ Credits deducted from balance (5000 - 100 = 4900)
- ✅ Ledger entry created with idempotency key
- ✅ `request_id` present
- ✅ Response time < 200ms (P95 target)

**Actual Output:** CANNOT COLLECT (wrong workspace)

---

### Test 4.3: Idempotency Enforcement

**Command:**
```bash
# Repeat the same debit request (same Idempotency-Key)
curl -sS -w "\nHTTP:%{http_code} Time:%{time_total}s\n" \
  -X POST https://scholarship-api-jamarrlmayes.replit.app/api/v1/credits/debit \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{
    "user_id": "user_123",
    "amount": 100,
    "feature": "scholarship_match",
    "reference_id": "match_xyz789"
  }'
```

**Expected Output:**
```json
{
  "user_id": "user_123",
  "amount_debited": 100,
  "new_balance": 4900,
  "ledger_entry_id": "txn_002",
  "request_id": "req_bcd890",
  "idempotent": true
}
HTTP:201 Time:0.043s
```

**Success Criteria:**
- ✅ HTTP 201 Created (NOT 409 Conflict)
- ✅ Same `ledger_entry_id` returned (txn_002)
- ✅ Balance unchanged (4900, not 4800)
- ✅ `idempotent: true` flag (optional but recommended)
- ✅ Fast response (cached result, < 50ms)

**Actual Output:** CANNOT COLLECT (wrong workspace)

---

### Test 4.4: Insufficient Funds (402/409 Error)

**Command:**
```bash
IDEMPOTENCY_KEY_2=$(uuidgen)

curl -sS -w "\nHTTP:%{http_code} Time:%{time_total}s\n" \
  -X POST https://scholarship-api-jamarrlmayes.replit.app/api/v1/credits/debit \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY_2" \
  -d '{
    "user_id": "user_123",
    "amount": 10000,
    "feature": "premium_feature",
    "reference_id": "prem_001"
  }'
```

**Expected Output:**
```json
{
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Balance insufficient for this operation",
    "current_balance": 4900,
    "requested_amount": 10000,
    "shortfall": 5100,
    "request_id": "req_efg123"
  }
}
HTTP:402 Time:0.089s
```

**Success Criteria:**
- ✅ HTTP 402 Payment Required (or 409 Conflict)
- ✅ Error code: `INSUFFICIENT_FUNDS`
- ✅ Current balance disclosed
- ✅ Shortfall calculated
- ✅ NO ledger entry created
- ✅ Balance unchanged
- ✅ `request_id` present

**Actual Output:** CANNOT COLLECT (wrong workspace)

---

### Test 4.5: Balance Query

**Command:**
```bash
curl -sS -w "\nHTTP:%{http_code} Time:%{time_total}s\n" \
  -H "Authorization: Bearer $USER_TOKEN" \
  "https://scholarship-api-jamarrlmayes.replit.app/api/v1/credits/balance?user_id=user_123"
```

**Expected Output:**
```json
{
  "user_id": "user_123",
  "balance": 4900,
  "currency": "credits",
  "last_updated": "2025-11-24T11:15:00Z",
  "request_id": "req_hij456"
}
HTTP:200 Time:0.052s
```

**Success Criteria:**
- ✅ HTTP 200
- ✅ Balance reflects all credit/debit operations
- ✅ Response time < 120ms (P95 target)
- ✅ `request_id` present

**Actual Output:** CANNOT COLLECT (wrong workspace)

---

## 5. CORS Preflight Tests

### Test 5.1: Allowed Origin (PASS)

**Command:**
```bash
curl -sS -X OPTIONS \
  -H "Origin: https://student-pilot-jamarrlmayes.replit.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization,Content-Type" \
  -i \
  https://scholarship-api-jamarrlmayes.replit.app/api/v1/credits/balance
```

**Expected Output:**
```
HTTP/2 200
access-control-allow-origin: https://student-pilot-jamarrlmayes.replit.app
access-control-allow-methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
access-control-allow-headers: Authorization, Content-Type, Idempotency-Key
access-control-max-age: 600
```

**Success Criteria:**
- ✅ HTTP 200
- ✅ `access-control-allow-origin` matches request origin exactly
- ✅ Methods include GET, POST
- ✅ Headers include Authorization, Idempotency-Key

**Actual Output:** CANNOT COLLECT (wrong workspace)

---

### Test 5.2: Denied Origin (FAIL)

**Command:**
```bash
curl -sS -X OPTIONS \
  -H "Origin: https://malicious-site.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization,Content-Type" \
  -i \
  https://scholarship-api-jamarrlmayes.replit.app/api/v1/credits/balance
```

**Expected Output:**
```
HTTP/2 403
(No Access-Control-Allow-Origin header)
```

**Success Criteria:**
- ✅ HTTP 403 Forbidden (or 200 with no CORS headers)
- ✅ NO `access-control-allow-origin` header
- ✅ Origin rejected

**Actual Output:** CANNOT COLLECT (wrong workspace)

---

### Test 5.3: CORS Allowlist Configuration

**Config Snippet (from scholarship_api environment):**
```bash
# Expected in .env or environment variables
CORS_ALLOWED_ORIGINS=https://scholar-auth-jamarrlmayes.replit.app,https://scholarship-api-jamarrlmayes.replit.app,https://scholarship-agent-jamarrlmayes.replit.app,https://scholarship-sage-jamarrlmayes.replit.app,https://student-pilot-jamarrlmayes.replit.app,https://provider-register-jamarrlmayes.replit.app,https://auto-page-maker-jamarrlmayes.replit.app,https://auto-com-center-jamarrlmayes.replit.app
```

**Verification:**
- ✅ Exactly 8 origins
- ✅ No wildcards (`*`)
- ✅ All HTTPS
- ✅ Exact domain matching

**Actual Config:** CANNOT VERIFY (wrong workspace)

---

## 6. Rate Limiting Tests

### Test 6.1: Normal Request (Under Limit)

**Command:**
```bash
curl -sS -w "\nHTTP:%{http_code}\n" \
  "https://scholarship-api-jamarrlmayes.replit.app/api/v1/scholarships?page=1&per_page=10"
```

**Expected Output:**
```
HTTP:200
```

**Success Criteria:**
- ✅ HTTP 200
- ✅ No rate limit headers yet

**Actual Output:** CANNOT COLLECT (wrong workspace)

---

### Test 6.2: Burst Requests (Trigger Rate Limit)

**Command:**
```bash
# Send 100 requests in rapid succession
for i in {1..100}; do
  curl -sS -w "HTTP:%{http_code}\n" -o /dev/null \
    "https://scholarship-api-jamarrlmayes.replit.app/api/v1/scholarships?page=1&per_page=10"
done | grep -c "HTTP:429"
```

**Expected Output:**
```
38
```
(At least some requests should return 429 after exceeding rate limit)

**Success Criteria:**
- ✅ Some requests return HTTP 429 Too Many Requests
- ✅ `Retry-After` header present in 429 responses

**Actual Output:** CANNOT COLLECT (wrong workspace)

---

### Test 6.3: Rate Limit Response Format

**Command:**
```bash
# Trigger rate limit, capture full response
for i in {1..100}; do
  curl -sS "https://scholarship-api-jamarrlmayes.replit.app/api/v1/scholarships?page=1&per_page=10"
done | grep -A5 "RATE_LIMIT_EXCEEDED" | head -10
```

**Expected Output:**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please retry after 60 seconds.",
    "retry_after": 60,
    "request_id": "req_klm789"
  }
}
```

**Success Criteria:**
- ✅ HTTP 429
- ✅ Error code: `RATE_LIMIT_EXCEEDED`
- ✅ `retry_after` in seconds
- ✅ `request_id` present

**Actual Output:** CANNOT COLLECT (wrong workspace)

---

## 7. Database and Migration Evidence

### Test 7.1: Database Tables Exist

**Command:**
```bash
# Connect to PostgreSQL and list tables
psql $DATABASE_URL -c "\dt"
```

**Expected Output:**
```
             List of relations
 Schema |       Name        | Type  |  Owner
--------+-------------------+-------+----------
 public | users             | table | postgres
 public | scholarships      | table | postgres
 public | credit_ledger     | table | postgres
 public | credit_balances   | table | postgres
(4 rows)
```

**Success Criteria:**
- ✅ `users` table exists
- ✅ `scholarships` table exists
- ✅ `credit_ledger` table exists
- ✅ `credit_balances` table exists

**Actual Output:** CANNOT COLLECT (wrong workspace)

---

### Test 7.2: Database Indices

**Command:**
```bash
psql $DATABASE_URL -c "\di credit_*"
```

**Expected Output:**
```
                     List of relations
 Schema |             Name              | Type  |  Owner
--------+-------------------------------+-------+----------
 public | credit_ledger_user_id_idx     | index | postgres
 public | credit_ledger_idempotency_idx | index | postgres
 public | credit_balances_pkey          | index | postgres
(3 rows)
```

**Success Criteria:**
- ✅ Index on `credit_ledger(user_id)`
- ✅ Unique index on `credit_ledger(idempotency_key)`
- ✅ Primary key on `credit_balances(user_id)`

**Actual Output:** CANNOT COLLECT (wrong workspace)

---

## 8. Integration Contract Tests

### Test 8.1: auto_page_maker → scholarship_api

**Scenario:** auto_page_maker fetches scholarships for SEO pages

**Command:**
```bash
curl -sS -w "\nHTTP:%{http_code} Time:%{time_total}s\n" \
  -H "Origin: https://auto-page-maker-jamarrlmayes.replit.app" \
  "https://scholarship-api-jamarrlmayes.replit.app/api/v1/scholarships?search=engineering&page=1&per_page=20"
```

**Expected Behavior:**
- ✅ HTTP 200 (no authentication required)
- ✅ CORS header allows auto_page_maker origin
- ✅ Response time < 120ms (P95)
- ✅ Returns valid scholarship data

**Actual Output:** CANNOT COLLECT (wrong workspace)

---

### Test 8.2: student_pilot → scholarship_api (Debit)

**Scenario:** student_pilot debits credits for scholarship matching

**Command:**
```bash
# User initiates scholarship match in student_pilot
# student_pilot backend calls scholarship_api to debit credits

curl -sS -w "\nHTTP:%{http_code}\n" \
  -X POST https://scholarship-api-jamarrlmayes.replit.app/api/v1/credits/debit \
  -H "Authorization: Bearer $STUDENT_PILOT_M2M_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "user_id": "user_456",
    "amount": 50,
    "feature": "scholarship_match",
    "reference_id": "match_sp_001"
  }'
```

**Expected Behavior:**
- ✅ HTTP 201 Created
- ✅ Credits debited successfully
- ✅ Balance updated
- ✅ Idempotency enforced

**Actual Output:** CANNOT COLLECT (wrong workspace)

---

### Test 8.3: scholarship_sage → scholarship_api (Debit)

**Scenario:** scholarship_sage debits credits for AI essay assistance

**Command:**
```bash
curl -sS -w "\nHTTP:%{http_code}\n" \
  -X POST https://scholarship-api-jamarrlmayes.replit.app/api/v1/credits/debit \
  -H "Authorization: Bearer $SCHOLARSHIP_SAGE_M2M_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "user_id": "user_789",
    "amount": 200,
    "feature": "essay_draft_assist",
    "reference_id": "essay_sage_002"
  }'
```

**Expected Behavior:**
- ✅ HTTP 201 Created
- ✅ Credits debited successfully
- ✅ 4x markup reflected in pricing (scholarship_sage charges 800 credits, pays scholarship_api 200)

**Actual Output:** CANNOT COLLECT (wrong workspace)

---

### Test 8.4: provider_register → scholarship_api (Credit Grant)

**Scenario:** provider_register grants promotional credits after payment

**Command:**
```bash
curl -sS -w "\nHTTP:%{http_code}\n" \
  -X POST https://scholarship-api-jamarrlmayes.replit.app/api/v1/credits/credit \
  -H "Authorization: Bearer $PROVIDER_REGISTER_M2M_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_101",
    "amount": 10000,
    "reason": "purchase_starter_pack",
    "source": "stripe",
    "reference_id": "pi_abc123xyz"
  }'
```

**Expected Behavior:**
- ✅ HTTP 201 Created
- ✅ Credits granted successfully
- ✅ Balance increased by 10000
- ✅ Stripe payment_intent ID stored as reference

**Actual Output:** CANNOT COLLECT (wrong workspace)

---

## 9. Security Compliance Evidence

### Test 9.1: No PII in Logs

**Command:**
```bash
# Check recent logs for PII patterns (email, tokens)
grep -i "email\|token\|password\|authorization" /var/log/scholarship_api/app.log | head -20
```

**Expected Output:**
```
[INFO] 2025-11-24T11:30:00Z req_abc123 POST /api/v1/credits/debit user_id=user_123 amount=100 - 201 (145ms)
[INFO] 2025-11-24T11:30:15Z req_def456 GET /api/v1/credits/balance user_id=user_123 - 200 (67ms)
[WARN] 2025-11-24T11:30:30Z req_ghi789 POST /api/v1/credits/debit user_id=user_456 - 402 INSUFFICIENT_FUNDS (89ms)
```

**Success Criteria:**
- ✅ NO email addresses in logs
- ✅ NO JWT tokens in logs
- ✅ NO Authorization headers in logs
- ✅ `user_id` present (opaque identifier, not PII)
- ✅ `request_id` present for correlation

**Actual Output:** CANNOT COLLECT (wrong workspace)

---

### Test 9.2: JWT JWKS Integration

**Command:**
```bash
# Verify scholarship_api fetches JWKS from scholar_auth
curl -sS https://scholar-auth-jamarrlmayes.replit.app/.well-known/jwks.json | jq
```

**Expected Output:**
```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "key_001",
      "alg": "RS256",
      "n": "base64_encoded_modulus...",
      "e": "AQAB"
    }
  ]
}
```

**Verification:**
- ✅ scholar_auth JWKS endpoint reachable
- ✅ RSA public keys available
- ✅ scholarship_api caches keys with TTL
- ✅ JWT signature verification uses cached keys

**Actual Output:** CANNOT COLLECT (wrong workspace)

---

## 10. Configuration Evidence

### Config Snippet (scholarship_api .env)

```bash
# App Identity
APP_NAME=scholarship_api
APP_BASE_URL=https://scholarship-api-jamarrlmayes.replit.app
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:***@host:5432/scholarlink_api

# Auth (scholar_auth)
AUTH_ISSUER=https://scholar-auth-jamarrlmayes.replit.app
AUTH_JWKS_URL=https://scholar-auth-jamarrlmayes.replit.app/.well-known/jwks.json
AUTH_AUDIENCE=scholarship_api

# CORS Allowlist (exactly 8 origins, no wildcards)
CORS_ALLOWED_ORIGINS=https://scholar-auth-jamarrlmayes.replit.app,https://scholarship-api-jamarrlmayes.replit.app,https://scholarship-agent-jamarrlmayes.replit.app,https://scholarship-sage-jamarrlmayes.replit.app,https://student-pilot-jamarrlmayes.replit.app,https://provider-register-jamarrlmayes.replit.app,https://auto-page-maker-jamarrlmayes.replit.app,https://auto-com-center-jamarrlmayes.replit.app

# Rate Limiting
RATE_LIMIT_PUBLIC_RPM=60
RATE_LIMIT_AUTHED_RPM=300
RATE_LIMIT_CREDITS_RPM=30

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Monitoring
SENTRY_DSN=https://***@sentry.io/***
LOG_LEVEL=info
```

**Actual Config:** CANNOT VERIFY (wrong workspace)

---

## Summary

**Total Tests Planned:** 33  
**Tests Executed:** 0 (wrong workspace)  
**Evidence Collected:** NONE (wrong workspace)

**Next Steps:**
1. Switch Agent3 to scholarship_api workspace
2. Execute all 33 tests above
3. Collect actual outputs and screenshots
4. Calculate P95 latencies from 20+ samples per endpoint
5. Verify all integration contracts
6. Update this document with actual evidence

**This Evidence Pack will be complete once Agent3 is in the correct workspace.**

---

**Prepared By:** Agent3 (currently in student_pilot workspace)  
**Workspace Mismatch Alert:** ⚠️ ACTIVE  
**Evidence Collection:** ❌ BLOCKED  
**Test Suite:** ✅ READY TO EXECUTE (once in correct workspace)
