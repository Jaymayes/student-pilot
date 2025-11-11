# API Catalog & Integration Guide
**APPLICATION NAME:** student_pilot  
**APP_BASE_URL:** https://student-pilot-jamarrlmayes.replit.app  
**Document Type:** API Reference & Integration Guide  
**Created:** November 11, 2025  
**CEO Deadline:** November 12, 2025 at 18:00 UTC  
**Owner:** Engineering & Platform Team

---

## Executive Summary

student_pilot exposes a comprehensive REST API for scholarship discovery, application management, document handling, and AI-powered essay assistance. The API is organized into 12 functional domains with 80+ endpoints, supporting both B2C student flows and B2B admin operations.

**Key Features:**
- ✅ RESTful design (GET, POST, PUT, PATCH, DELETE)
- ✅ Session-based authentication (Scholar Auth OIDC)
- ✅ JSON request/response payloads
- ✅ Rate limiting (adaptive per role)
- ✅ Request_id lineage (100% coverage)
- ✅ Zod-validated schemas

**API Domains:**
1. Authentication & Authorization
2. User Profile Management
3. Scholarship Discovery & Search
4. Scholarship Matching & Recommendations
5. Application Management
6. Document Management
7. Essay Assistance (AI-powered)
8. Credit & Payment Management
9. Admin & Monitoring
10. Compliance & Reporting
11. Health & Status
12. SEO & Public Pages

---

## 1. Authentication & Authorization

### 1.1 GET /api/auth/user

**Description:** Get current authenticated user

**Authentication:** Required  
**Rate Limit:** 120 req/min (authenticated)  
**Code Reference:** `server/routes.ts:891-926`

**Request:**
```http
GET /api/auth/user HTTP/1.1
Host: student-pilot-jamarrlmayes.replit.app
Cookie: connect.sid=...
```

**Response (200 OK):**
```json
{
  "id": "user-123",
  "email": "student@example.com",
  "name": "Jane Doe",
  "isStudent": true,
  "isAdmin": false,
  "createdAt": "2025-11-01T12:00:00Z",
  "studentProfile": {
    "id": "profile-456",
    "userId": "user-123",
    "gpa": 3.8,
    "major": "Computer Science",
    "demographics": { "ethnicity": "Hispanic", "gender": "Female" },
    "credits": 10,
    "profileCompletion": 85
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `500 Internal Server Error` - Server error

**OpenAPI Spec:**
```yaml
/api/auth/user:
  get:
    summary: Get current authenticated user
    security:
      - cookieAuth: []
    responses:
      200:
        description: User profile with student details
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserWithProfile'
      401:
        description: Unauthorized
```

### 1.2 GET /auth/login

**Description:** Initiate OAuth login flow via Scholar Auth

**Authentication:** Not required  
**Redirect:** Yes (to Scholar Auth)  
**Code Reference:** `server/routes.ts:851-863`

**Request:**
```http
GET /auth/login HTTP/1.1
Host: student-pilot-jamarrlmayes.replit.app
```

**Response (302 Found):**
```http
HTTP/1.1 302 Found
Location: https://scholar-auth.replit.app/authorize?client_id=student_pilot&...
```

### 1.3 GET /auth/callback

**Description:** OAuth callback handler (internal use)

**Authentication:** Not required  
**Code Reference:** `server/routes.ts:865-889`

### 1.4 POST /api/logout

**Description:** Log out current user

**Authentication:** Required  
**Code Reference:** `server/routes.ts:928-949`

**Request:**
```http
POST /api/logout HTTP/1.1
Host: student-pilot-jamarrlmayes.replit.app
Cookie: connect.sid=...
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 2. User Profile Management

### 2.1 GET /api/profile

**Description:** Get current user's student profile

**Authentication:** Required  
**Rate Limit:** 120 req/min  
**Code Reference:** `server/routes.ts:1118-1158`

**Response (200 OK):**
```json
{
  "id": "profile-456",
  "userId": "user-123",
  "name": "Jane Doe",
  "email": "student@example.com",
  "gpa": 3.8,
  "major": "Computer Science",
  "graduationYear": 2026,
  "schoolName": "Stanford University",
  "demographics": {
    "ethnicity": "Hispanic",
    "gender": "Female",
    "firstGeneration": true
  },
  "credits": 10,
  "profileCompletion": 85,
  "createdAt": "2025-11-01T12:00:00Z",
  "updatedAt": "2025-11-10T15:30:00Z"
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Profile not found

### 2.2 PATCH /api/profile

**Description:** Update user's student profile

**Authentication:** Required  
**Validation:** Zod schema (`insertStudentProfileSchema`)  
**Code Reference:** `server/routes.ts:1160-1236`

**Request:**
```http
PATCH /api/profile HTTP/1.1
Content-Type: application/json
Cookie: connect.sid=...

{
  "gpa": 3.9,
  "major": "Data Science",
  "demographics": {
    "ethnicity": "Hispanic",
    "gender": "Female",
    "firstGeneration": true
  }
}
```

**Response (200 OK):**
```json
{
  "id": "profile-456",
  "gpa": 3.9,
  "major": "Data Science",
  "profileCompletion": 90,
  "updatedAt": "2025-11-11T12:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Profile not found

**Business Event Emitted:**
- `profile_complete` (if completion ≥ 80%)

### 2.3 DELETE /api/profile

**Description:** Delete user's student profile and account

**Authentication:** Required  
**Code Reference:** `server/routes.ts:1238-1267`

**Request:**
```http
DELETE /api/profile HTTP/1.1
Cookie: connect.sid=...
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile and account deleted"
}
```

**Cascade:** Deletes applications, documents, matches, sessions

---

## 3. Scholarship Discovery & Search

### 3.1 GET /api/scholarships

**Description:** Search scholarships with filters

**Authentication:** Not required (public)  
**Rate Limit:** 60 req/min (unauthenticated)  
**Code Reference:** `server/routes.ts:1269-1293`

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `search` | string | Full-text search | `search=STEM` |
| `category` | string | Category filter | `category=merit-based` |
| `state` | string | State filter | `state=CA` |
| `minAmount` | number | Min scholarship amount | `minAmount=1000` |
| `maxAmount` | number | Max scholarship amount | `maxAmount=10000` |
| `deadline` | string | Deadline filter | `deadline=2026-06-01` |
| `limit` | number | Results per page | `limit=20` |
| `offset` | number | Pagination offset | `offset=0` |

**Request:**
```http
GET /api/scholarships?search=STEM&state=CA&limit=20 HTTP/1.1
Host: student-pilot-jamarrlmayes.replit.app
```

**Response (200 OK):**
```json
{
  "scholarships": [
    {
      "id": "sch-123",
      "title": "California STEM Excellence Scholarship",
      "amount": 5000,
      "deadline": "2026-06-01",
      "category": "merit-based",
      "state": "CA",
      "description": "For STEM students in California...",
      "requirements": "3.5 GPA, California resident, STEM major",
      "website": "https://example.com/scholarship",
      "isActive": true
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

### 3.2 GET /api/scholarships/:id

**Description:** Get scholarship details by ID

**Authentication:** Not required (public)  
**Code Reference:** `server/routes.ts:1295-1327`

**Request:**
```http
GET /api/scholarships/sch-123 HTTP/1.1
Host: student-pilot-jamarrlmayes.replit.app
```

**Response (200 OK):**
```json
{
  "id": "sch-123",
  "title": "California STEM Excellence Scholarship",
  "amount": 5000,
  "deadline": "2026-06-01",
  "category": "merit-based",
  "state": "CA",
  "description": "For STEM students in California with outstanding academic records...",
  "requirements": "3.5 GPA minimum, California resident, STEM major enrollment",
  "essayPrompts": [
    "Describe your passion for STEM (500 words)",
    "How will this scholarship help you achieve your goals? (300 words)"
  ],
  "website": "https://example.com/scholarship",
  "contactEmail": "scholarships@example.com",
  "isActive": true,
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-11-01T00:00:00Z"
}
```

**Error Responses:**
- `404 Not Found` - Scholarship not found

### 3.3 POST /api/scholarships/:id/bookmark

**Description:** Bookmark (save) a scholarship

**Authentication:** Required  
**Code Reference:** `server/routes.ts:1494-1545`

**Request:**
```http
POST /api/scholarships/sch-123/bookmark HTTP/1.1
Content-Type: application/json
Cookie: connect.sid=...

{
  "isBookmarked": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "match": {
    "id": "match-789",
    "scholarshipId": "sch-123",
    "studentId": "profile-456",
    "isBookmarked": true,
    "matchScore": 85,
    "chanceLevel": "High Chance"
  }
}
```

**Business Event Emitted:**
- `first_scholarship_saved` (if first time saving)

---

## 4. Scholarship Matching & Recommendations

### 4.1 GET /api/matches

**Description:** Get personalized scholarship matches

**Authentication:** Required  
**Code Reference:** `server/routes.ts:1353-1378`

**Response (200 OK):**
```json
{
  "matches": [
    {
      "id": "match-789",
      "scholarship": {
        "id": "sch-123",
        "title": "California STEM Excellence Scholarship",
        "amount": 5000,
        "deadline": "2026-06-01"
      },
      "matchScore": 85,
      "chanceLevel": "High Chance",
      "matchReasons": [
        "GPA exceeds minimum requirement (3.9 > 3.5)",
        "Major aligns with STEM focus",
        "California residency requirement met"
      ],
      "isBookmarked": true,
      "viewedAt": "2025-11-10T12:00:00Z"
    }
  ],
  "total": 1
}
```

### 4.2 POST /api/matches/generate

**Description:** Generate new scholarship matches using AI

**Authentication:** Required  
**Credit Cost:** 5 credits  
**Code Reference:** `server/routes.ts:1380-1492`

**Request:**
```http
POST /api/matches/generate HTTP/1.1
Content-Type: application/json
Cookie: connect.sid=...

{
  "limit": 10
}
```

**Response (200 OK):**
```json
{
  "matches": [
    {
      "scholarshipId": "sch-123",
      "matchScore": 85,
      "chanceLevel": "High Chance",
      "matchReasons": ["GPA exceeds minimum", "Major alignment"]
    }
  ],
  "creditsUsed": 5,
  "remainingCredits": 5
}
```

**Error Responses:**
- `402 Payment Required` - Insufficient credits

---

## 5. Application Management

### 5.1 GET /api/applications

**Description:** Get user's scholarship applications

**Authentication:** Required  
**Code Reference:** `server/routes.ts:1587-1641`

**Query Parameters:**
- `status` (optional): Filter by status (`draft`, `in-progress`, `submitted`, `accepted`, `rejected`)

**Response (200 OK):**
```json
{
  "applications": [
    {
      "id": "app-101",
      "scholarshipId": "sch-123",
      "studentId": "profile-456",
      "status": "in-progress",
      "essayAnswers": [
        {
          "prompt": "Describe your passion for STEM",
          "answer": "My journey into STEM began...",
          "wordCount": 487
        }
      ],
      "documentIds": ["doc-001", "doc-002"],
      "submittedAt": null,
      "createdAt": "2025-11-05T10:00:00Z",
      "updatedAt": "2025-11-10T14:30:00Z"
    }
  ],
  "total": 1
}
```

### 5.2 POST /api/applications

**Description:** Create a new scholarship application

**Authentication:** Required  
**Validation:** `insertApplicationSchema`  
**Code Reference:** `server/routes.ts:1643-1698`

**Request:**
```http
POST /api/applications HTTP/1.1
Content-Type: application/json
Cookie: connect.sid=...

{
  "scholarshipId": "sch-123",
  "essayAnswers": [
    {
      "prompt": "Describe your passion for STEM",
      "answer": "",
      "wordCount": 0
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "id": "app-101",
  "scholarshipId": "sch-123",
  "status": "draft",
  "createdAt": "2025-11-11T12:00:00Z"
}
```

**Business Event Emitted:**
- `first_application_started` (if first application)

### 5.3 PATCH /api/applications/:id

**Description:** Update an existing application

**Authentication:** Required  
**Ownership Check:** Yes  
**Code Reference:** `server/routes.ts:1750-1818`

**Request:**
```http
PATCH /api/applications/app-101 HTTP/1.1
Content-Type: application/json
Cookie: connect.sid=...

{
  "essayAnswers": [
    {
      "prompt": "Describe your passion for STEM",
      "answer": "My journey into STEM began when I was 10 years old...",
      "wordCount": 487
    }
  ],
  "status": "in-progress"
}
```

**Response (200 OK):**
```json
{
  "id": "app-101",
  "status": "in-progress",
  "updatedAt": "2025-11-11T12:05:00Z"
}
```

**Error Responses:**
- `403 Forbidden` - Not application owner
- `404 Not Found` - Application not found

### 5.4 POST /api/applications/:id/submit

**Description:** Submit application to scholarship provider

**Authentication:** Required  
**Code Reference:** `server/routes.ts:1820-1858`

**Request:**
```http
POST /api/applications/app-101/submit HTTP/1.1
Cookie: connect.sid=...
```

**Response (200 OK):**
```json
{
  "success": true,
  "application": {
    "id": "app-101",
    "status": "submitted",
    "submittedAt": "2025-11-11T12:10:00Z"
  }
}
```

**Business Event Emitted:**
- `first_application_submitted` (if first submission)

### 5.5 DELETE /api/applications/:id

**Description:** Delete an application (must be draft or in-progress)

**Authentication:** Required  
**Code Reference:** `server/routes.ts:1860-1898`

---

## 6. Document Management

### 6.1 GET /api/documents

**Description:** Get user's uploaded documents

**Authentication:** Required  
**Code Reference:** `server/routes.ts:1945-1983`

**Response (200 OK):**
```json
{
  "documents": [
    {
      "id": "doc-001",
      "userId": "user-123",
      "filename": "transcript.pdf",
      "fileType": "application/pdf",
      "fileSize": 524288,
      "category": "transcript",
      "uploadedAt": "2025-11-08T09:00:00Z"
    },
    {
      "id": "doc-002",
      "filename": "recommendation-letter.pdf",
      "category": "recommendation",
      "uploadedAt": "2025-11-09T11:00:00Z"
    }
  ],
  "total": 2
}
```

### 6.2 POST /api/documents/upload

**Description:** Upload a new document

**Authentication:** Required  
**Method:** Direct upload to GCS via presigned URL  
**Code Reference:** `server/routes.ts:1985-2046`

**Request (Step 1 - Get presigned URL):**
```http
POST /api/documents/upload HTTP/1.1
Content-Type: application/json
Cookie: connect.sid=...

{
  "filename": "transcript.pdf",
  "fileType": "application/pdf",
  "category": "transcript"
}
```

**Response (200 OK):**
```json
{
  "uploadUrl": "https://storage.googleapis.com/...",
  "documentId": "doc-003",
  "expiresIn": 3600
}
```

**Request (Step 2 - Upload to GCS):**
```http
PUT <uploadUrl> HTTP/1.1
Content-Type: application/pdf

<binary file data>
```

**Business Event Emitted:**
- `first_document_upload` (if first document)

### 6.3 GET /api/documents/:id

**Description:** Get document metadata and download URL

**Authentication:** Required  
**Ownership Check:** Yes  
**Code Reference:** `server/routes.ts:2048-2080`

**Response (200 OK):**
```json
{
  "id": "doc-001",
  "filename": "transcript.pdf",
  "fileType": "application/pdf",
  "category": "transcript",
  "downloadUrl": "https://storage.googleapis.com/...",
  "expiresIn": 3600
}
```

### 6.4 DELETE /api/documents/:id

**Description:** Delete a document

**Authentication:** Required  
**Code Reference:** `server/routes.ts:2082-2124`

---

## 7. Essay Assistance (AI-Powered)

### 7.1 POST /api/essays/analyze-safe

**Description:** AI-powered essay analysis (grammar, structure, clarity)

**Authentication:** Required  
**Credit Cost:** 3 credits  
**Rate Limit:** 10 req/hour (credit-limited)  
**Code Reference:** `server/routes.ts:3478-3515`

**Request:**
```http
POST /api/essays/analyze-safe HTTP/1.1
Content-Type: application/json
Cookie: connect.sid=...

{
  "content": "My passion for STEM began when I was 10 years old...",
  "prompt": "Describe your passion for STEM (500 words)",
  "maxWords": 500
}
```

**Response (200 OK):**
```json
{
  "analysis": {
    "grammarIssues": [
      {
        "sentence": "...",
        "issue": "Subject-verb agreement",
        "suggestion": "Change 'was' to 'were'"
      }
    ],
    "structureScore": 8.5,
    "clarityScore": 9.0,
    "wordCount": 487,
    "recommendations": [
      "Consider adding a specific example in paragraph 2",
      "Strengthen your conclusion with a clear call-to-action"
    ]
  },
  "creditsUsed": 3,
  "remainingCredits": 7
}
```

**Error Responses:**
- `402 Payment Required` - Insufficient credits
- `400 Bad Request` - Content exceeds max words

**AI Safety:**
- ✅ Coaching-only (no ghostwriting)
- ✅ Watermarked suggestions
- ✅ Plagiarism detection (planned)

### 7.2 POST /api/essays/improve-safe

**Description:** AI-powered essay improvement suggestions

**Authentication:** Required  
**Credit Cost:** 5 credits  
**Code Reference:** `server/routes.ts:3517-3556`

**Request:**
```http
POST /api/essays/improve-safe HTTP/1.1
Content-Type: application/json
Cookie: connect.sid=...

{
  "content": "My passion for STEM began...",
  "prompt": "Describe your passion for STEM",
  "focusArea": "clarity"
}
```

**Response (200 OK):**
```json
{
  "suggestions": [
    {
      "section": "Introduction",
      "original": "My passion for STEM began...",
      "suggestion": "Consider starting with a specific anecdote...",
      "reason": "Improves engagement and clarity"
    }
  ],
  "overallScore": 8.5,
  "creditsUsed": 5,
  "remainingCredits": 2
}
```

### 7.3 POST /api/essays/outline-safe

**Description:** AI-generated essay outline

**Authentication:** Required  
**Credit Cost:** 2 credits  
**Code Reference:** `server/routes.ts:3557-3596`

**Request:**
```http
POST /api/essays/outline-safe HTTP/1.1
Content-Type: application/json
Cookie: connect.sid=...

{
  "prompt": "Describe your passion for STEM (500 words)",
  "backgroundInfo": "I'm a computer science major interested in AI"
}
```

**Response (200 OK):**
```json
{
  "outline": {
    "introduction": "Hook: Personal anecdote about first coding project",
    "body": [
      "Paragraph 1: Early experiences with technology",
      "Paragraph 2: Academic journey in CS",
      "Paragraph 3: Future goals in AI"
    ],
    "conclusion": "Tie back to scholarship goals"
  },
  "creditsUsed": 2,
  "remainingCredits": 0
}
```

---

## 8. Credit & Payment Management

### 8.1 GET /api/credits

**Description:** Get user's credit balance

**Authentication:** Required  
**Code Reference:** `server/routes.ts:2126-2156`

**Response (200 OK):**
```json
{
  "balance": 10,
  "history": [
    {
      "id": "tx-001",
      "type": "purchase",
      "amount": 50,
      "timestamp": "2025-11-01T12:00:00Z",
      "description": "Starter Pack"
    },
    {
      "id": "tx-002",
      "type": "usage",
      "amount": -3,
      "timestamp": "2025-11-10T14:00:00Z",
      "description": "Essay Analysis"
    }
  ]
}
```

### 8.2 POST /api/credits/purchase

**Description:** Purchase credits via Stripe

**Authentication:** Required  
**Payment Processor:** Stripe  
**Code Reference:** `server/routes.ts:2158-2231`

**Request:**
```http
POST /api/credits/purchase HTTP/1.1
Content-Type: application/json
Cookie: connect.sid=...

{
  "package": "starter",
  "paymentMethodId": "pm_..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "paymentIntent": "pi_...",
  "creditsAdded": 50,
  "newBalance": 60,
  "amountCharged": 1000
}
```

**Credit Packages:**

| Package | Credits | Price | Cost per Credit |
|---------|---------|-------|-----------------|
| Starter | 50 | $10 | $0.20 |
| Growth | 150 | $25 | $0.17 |
| Pro | 500 | $75 | $0.15 |

**Business Event Emitted:**
- `credit_purchase` (amount, credits, stripe_id)
- `first_purchase_at` (TTV milestone)

### 8.3 POST /api/credits/refund

**Description:** Issue credit refund (admin only)

**Authentication:** Required (Admin)  
**Code Reference:** `server/routes.ts:2233-2280`

**Request:**
```http
POST /api/credits/refund HTTP/1.1
Content-Type: application/json
Cookie: connect.sid=... (admin session)

{
  "userId": "user-123",
  "credits": 10,
  "reason": "Accidental purchase"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "creditsRefunded": 10,
  "newBalance": 50
}
```

**Business Event Emitted:**
- `credit_refund`

---

## 9. Admin & Monitoring

### 9.1 GET /api/admin/metrics

**Description:** Real-time platform metrics (P50/P95/P99, error rates)

**Authentication:** Required (Admin or SHARED_SECRET)  
**Code Reference:** `server/routes/adminMetrics.ts`

**Request:**
```http
GET /api/admin/metrics HTTP/1.1
Authorization: Bearer <SHARED_SECRET>
```

**Response (200 OK):**
```json
{
  "timestamp": "2025-11-11T12:00:00Z",
  "uptime": {
    "seconds": 86400,
    "percentage": 99.99
  },
  "latency": {
    "p50": 45,
    "p95": 118,
    "p99": 215,
    "mean": 62
  },
  "errors": {
    "errorRate": 0.02,
    "totalErrors": 5,
    "totalRequests": 25000
  },
  "requestVolume": {
    "totalRequests": 25000,
    "requestsPerSecond": 0.29
  }
}
```

### 9.2 GET /api/admin/users

**Description:** List all users (admin only)

**Authentication:** Required (Admin)  
**Code Reference:** `server/routes.ts` (admin section)

**Response (200 OK):**
```json
{
  "users": [
    {
      "id": "user-123",
      "email": "student@example.com",
      "isStudent": true,
      "isAdmin": false,
      "createdAt": "2025-11-01T12:00:00Z"
    }
  ],
  "total": 1
}
```

### 9.3 GET /api/monitoring/kpi-telemetry

**Description:** KPI telemetry for daily rollups (activation funnel)

**Authentication:** Required (Admin)  
**Code Reference:** `server/routes.ts:370-390`

**Response (200 OK):**
```json
{
  "signups": 100,
  "profileCompletions": 75,
  "firstDocumentUploads": 60,
  "firstScholarshipsSaved": 50,
  "firstApplicationsStarted": 30,
  "firstApplicationsSubmitted": 15,
  "firstPurchases": 5,
  "arpu": 2.50
}
```

---

## 10. Compliance & Reporting

### 10.1 GET /api/compliance/encryption-validation

**Description:** Generate encryption compliance report (FERPA/COPPA)

**Authentication:** Required (Admin)  
**Code Reference:** `server/routes.ts:3084-3104`

**Response (200 OK):**
```json
{
  "reportId": "encryption-validation-1731331200000",
  "timestamp": "2025-11-11T12:00:00Z",
  "overallStatus": "compliant",
  "validations": [
    {
      "component": "Transit Encryption (HTTPS/TLS)",
      "status": "compliant",
      "details": "TLS 1.2+ enabled with strong cipher suites."
    }
  ],
  "summary": {
    "transitEncryption": true,
    "restEncryption": true,
    "keyManagement": true,
    "ferpaCompliant": true
  }
}
```

### 10.2 GET /api/compliance/pii/inventory

**Description:** PII data inventory (SOC 2 requirement)

**Authentication:** Required (Admin)  
**Code Reference:** `server/routes.ts:2748-2758`

**Response (200 OK):**
```json
{
  "piiFields": [
    {
      "table": "users",
      "column": "email",
      "dataType": "varchar",
      "encrypted": true,
      "retention": "account lifetime"
    },
    {
      "table": "student_profiles",
      "column": "demographics",
      "dataType": "jsonb",
      "encrypted": true,
      "retention": "account lifetime"
    }
  ],
  "total": 7
}
```

---

## 11. Health & Status

### 11.1 GET /health

**Description:** Health check endpoint (infrastructure monitoring)

**Authentication:** Not required  
**Code Reference:** `server/health.ts` + `server/routes.ts:194-207`

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-11T12:00:00Z",
  "uptime": 86400,
  "version": "1.0.0",
  "checks": {
    "database": "ok",
    "storage": "ok",
    "openai": "ok"
  }
}
```

### 11.2 GET /api/status

**Description:** Application status (detailed diagnostics)

**Authentication:** Not required  
**Code Reference:** `server/routes.ts:401-412`

**Response (200 OK):**
```json
{
  "status": "operational",
  "services": {
    "api": "up",
    "database": "up",
    "storage": "up",
    "ai": "up"
  },
  "metrics": {
    "requestsPerSecond": 0.29,
    "p95Latency": 118
  }
}
```

---

## 12. SEO & Public Pages

### 12.1 GET /scholarships/:id/:slug

**Description:** Server-side rendered scholarship detail page (SEO-optimized)

**Authentication:** Not required  
**Code Reference:** `server/ssr/scholarshipDetail.tsx` + `server/routes.ts:530`

**Response (200 OK):**
```html
<!DOCTYPE html>
<html>
<head>
  <title>California STEM Excellence Scholarship - ScholarLink</title>
  <meta name="description" content="$5,000 scholarship for STEM students...">
  <meta property="og:title" content="California STEM Excellence Scholarship">
</head>
<body>...</body>
</html>
```

### 12.2 GET /sitemap.xml

**Description:** SEO sitemap for search engines

**Authentication:** Not required  
**Code Reference:** `server/routes.ts:542`

**Response (200 OK):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://student-pilot-jamarrlmayes.replit.app/scholarships/sch-123/stem-scholarship</loc>
    <lastmod>2025-11-11</lastmod>
    <priority>0.8</priority>
  </url>
</urlset>
```

### 12.3 GET /api/robots.txt

**Description:** Robots.txt for search engine crawlers

**Authentication:** Not required  
**Code Reference:** `server/routes.ts:167-178`

---

## Appendices

### A. Shared TypeScript Schemas

**Location:** `shared/schema.ts`

**Key Schemas:**
- `insertUserSchema` - User creation
- `insertStudentProfileSchema` - Student profile
- `insertScholarshipSchema` - Scholarship data
- `insertApplicationSchema` - Application creation
- `insertDocumentSchema` - Document upload
- `insertEssaySchema` - Essay data
- `insertBusinessEventSchema` - Business events

**Example:**
```typescript
import { insertApplicationSchema } from '@shared/schema';

const validatedData = insertApplicationSchema.parse(req.body);
```

### B. Error Response Format

**Standard Error Response:**
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "requestId": "req_abc123",
  "timestamp": "2025-11-11T12:00:00Z"
}
```

**HTTP Status Codes:**
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Not authenticated
- `402 Payment Required` - Insufficient credits
- `403 Forbidden` - Not authorized
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### C. Rate Limiting Headers

**Response Headers:**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Reset timestamp
- `X-Correlation-ID`: Request correlation ID

**Example:**
```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1731331260
X-Correlation-ID: req_abc123
```

### D. API Client Example (JavaScript)

```javascript
const API_BASE = 'https://student-pilot-jamarrlmayes.replit.app';

// Authenticated request
async function getProfile() {
  const response = await fetch(`${API_BASE}/api/profile`, {
    credentials: 'include', // Send cookies
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  
  return response.json();
}

// Update profile
async function updateProfile(data) {
  const response = await fetch(`${API_BASE}/api/profile`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  
  return response.json();
}
```

### E. Webhook Events (Planned)

**Future Enhancement:** Webhook support for external integrations

**Event Types:**
- `student.signup` - New student registration
- `application.submitted` - Application submitted
- `payment.succeeded` - Credit purchase successful
- `document.uploaded` - Document uploaded

---

**Document Version:** 1.0  
**Last Updated:** November 11, 2025  
**Next Review:** After API changes or Dec 1, 2025  
**Owned By:** Engineering & Platform Team  
**CEO Deadline Compliance:** ✅ Submitted before Nov 12, 18:00 UTC
