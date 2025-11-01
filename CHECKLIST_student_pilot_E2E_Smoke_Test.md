# student_pilot E2E Smoke Test Verification Checklist

**Owner**: Frontend Lead (Agent3)  
**Trigger**: After Gates 1 & 2 are GREEN  
**Deadline**: T+60 minutes post-trigger  
**Status**: READY TO EXECUTE (awaiting scholar_auth + scholarship_api)

---

## Prerequisites (Gates 1 & 2 GREEN)

Before starting E2E smoke test, verify:

```bash
# Gate 1: scholar_auth JWKS
curl -s https://scholar-auth-jamarrlmayes.replit.app/.well-known/jwks.json | jq '.keys[0].kid'
# Expected: "scholar-auth-key-1" (or similar kid)

# Gate 2: scholarship_api /canary
curl -s https://scholarship-api-jamarrlmayes.replit.app/canary | jq '.version, .status, .dependencies_ok'
# Expected: "v2.7", "ok", true
```

**If either fails**: STOP and wait for Auth/API leads to resolve.

---

## E2E Smoke Test Flow

### Test 1: Landing Page Load
**URL**: `https://student-pilot-jamarrlmayes.replit.app`

**Steps**:
1. Open URL in browser (Chrome DevTools open)
2. Measure TTFB and page load time
3. Check for console errors
4. Verify security headers

**Expected Results**:
- ✅ Page loads successfully (HTTP 200)
- ✅ TTFB <500ms, full load <2.5s
- ✅ No console errors (React hydration warnings OK)
- ✅ Security headers present (check Network tab)

**Verification Commands**:
```bash
# TTFB test
curl -w "TTFB: %{time_starttransfer}s\nTotal: %{time_total}s\n" -o /dev/null -s \
  https://student-pilot-jamarrlmayes.replit.app

# Security headers
curl -I https://student-pilot-jamarrlmayes.replit.app | grep -E "(strict-transport|content-security|x-frame)"
```

**Capture**:
- [ ] Screenshot of loaded page
- [ ] DevTools Network waterfall
- [ ] Console log (no errors)

---

### Test 2: User Registration (If Needed)
**URL**: `https://student-pilot-jamarrlmayes.replit.app/register`

**Steps**:
1. Click "Sign Up" or navigate to registration
2. Fill form with test data:
   - Email: `smoke-test-{timestamp}@example.com`
   - Password: Strong password (12+ chars)
   - First Name: "Smoke"
   - Last Name: "Test"
3. Submit registration
4. Wait for redirect to Scholar Auth

**Expected Results**:
- ✅ Form validates correctly
- ✅ Redirects to `scholar-auth-*.replit.app/authorize?...`
- ✅ PKCE code_challenge present in URL params
- ✅ No console errors during redirect

**Capture**:
- [ ] Screenshot of registration form
- [ ] Network request to `/api/auth/register` (or OIDC /authorize)
- [ ] Redirect URL with PKCE params

---

### Test 3: OIDC Login Flow
**URL**: Scholar Auth authorization page

**Steps**:
1. Complete Scholar Auth login (or auto-login if test mode)
2. Wait for redirect back to student_pilot
3. Verify callback handling at `/api/auth/callback`
4. Check session establishment

**Expected Results**:
- ✅ Scholar Auth returns authorization code
- ✅ Callback URL processed successfully
- ✅ Session cookie set (HttpOnly, Secure)
- ✅ Redirect to dashboard or profile page
- ✅ No tokens in localStorage (security requirement)

**Verification Commands**:
```bash
# After login, check session endpoint (from browser with cookies)
curl -b cookies.txt https://student-pilot-jamarrlmayes.replit.app/api/auth/user

# Expected: 200 OK with user JSON
# {
#   "id": "...",
#   "email": "smoke-test-...@example.com",
#   "role": "student",
#   "profile": { ... }
# }
```

**Capture**:
- [ ] Screenshot of Scholar Auth page
- [ ] Network trace of /authorize request
- [ ] Network trace of /callback response
- [ ] Screenshot of post-login dashboard
- [ ] Cookies tab showing HttpOnly session cookie
- [ ] Application Storage tab (verify NO tokens in localStorage)

---

### Test 4: Profile Fetch
**URL**: `https://student-pilot-jamarrlmayes.replit.app/profile`

**Steps**:
1. Navigate to profile page
2. Verify profile data renders
3. Check API request to `/api/profile` or `/api/auth/user`

**Expected Results**:
- ✅ Profile page loads successfully
- ✅ User data displayed (name, email, role)
- ✅ API request returns 200 OK
- ✅ Page load <2.5s

**Verification**:
```bash
# Check API latency
curl -w "%{time_total}\n" -b cookies.txt \
  https://student-pilot-jamarrlmayes.replit.app/api/auth/user
# Expected: <0.120s (P95 SLO)
```

**Capture**:
- [ ] Screenshot of profile page
- [ ] Network request showing 200 OK
- [ ] Response JSON with user data

---

### Test 5: Scholarship Search (scholarship_api Integration)
**URL**: `https://student-pilot-jamarrlmayes.replit.app/scholarships`

**Steps**:
1. Navigate to scholarship search/browse page
2. Wait for scholarship list to load
3. Verify data fetched from scholarship_api
4. Check pagination or filters if applicable

**Expected Results**:
- ✅ Scholarship list renders successfully
- ✅ API request to scholarship_api returns 200 OK
- ✅ At least 1 scholarship displayed (or empty state if no data)
- ✅ Images/logos load correctly
- ✅ No CORS errors

**Verification**:
```bash
# Check if scholarship_api is accessible
curl -H "Authorization: Bearer <student_jwt>" \
  https://scholarship-api-jamarrlmayes.replit.app/api/scholarships

# Expected: 200 OK with scholarship array
```

**Capture**:
- [ ] Screenshot of scholarship list
- [ ] Network request to scholarship_api (check Authorization header)
- [ ] Response JSON with scholarships

---

### Test 6: Recommendations (scholarship_sage Integration)
**URL**: `https://student-pilot-jamarrlmayes.replit.app/recommendations`

**Steps**:
1. Navigate to recommendations/matches page
2. Wait for personalized recommendations to load
3. Verify data fetched from scholarship_sage
4. Check match scores or reasons displayed

**Expected Results**:
- ✅ Recommendations page loads successfully
- ✅ API request to scholarship_sage returns 200 OK
- ✅ Personalized matches displayed
- ✅ Match scores/reasons render correctly
- ✅ No AI/ML errors in console

**Verification**:
```bash
# Check scholarship_sage endpoint
curl -H "Authorization: Bearer <student_jwt>" \
  https://scholarship-sage-jamarrlmayes.replit.app/api/recommendations

# Expected: 200 OK with recommended scholarships + scores
```

**Capture**:
- [ ] Screenshot of recommendations page
- [ ] Network request to scholarship_sage
- [ ] Response JSON with match scores

---

### Test 7: Application Draft (With Document Upload)
**URL**: `https://student-pilot-jamarrlmayes.replit.app/apply/{scholarship_id}`

**Steps**:
1. Click "Apply" on a scholarship
2. Fill application form (basic fields)
3. Upload a test document (PDF or TXT)
4. Save as draft (do NOT submit)
5. Verify file uploaded to GCS

**Expected Results**:
- ✅ Application form renders with all fields
- ✅ File upload component works (Uppy)
- ✅ Presigned URL generated for GCS upload
- ✅ File uploads directly to GCS (not via server)
- ✅ Draft saved successfully
- ✅ No file size/type errors (if valid file)

**Verification**:
```bash
# Check if document uploaded to GCS
# (From server logs or GCS bucket inspection)
```

**Capture**:
- [ ] Screenshot of application form
- [ ] Screenshot of file upload UI
- [ ] Network request showing presigned URL generation
- [ ] Network request showing direct upload to GCS
- [ ] Screenshot of "Draft saved" confirmation

---

### Test 8: Application Status Check
**URL**: `https://student-pilot-jamarrlmayes.replit.app/applications`

**Steps**:
1. Navigate to "My Applications" page
2. Verify draft application appears in list
3. Check status (should be "Draft")
4. Click to view/edit draft

**Expected Results**:
- ✅ Applications list loads successfully
- ✅ Draft application visible with correct status
- ✅ Scholarship name and details displayed
- ✅ Can navigate back to edit draft

**Capture**:
- [ ] Screenshot of applications list
- [ ] Screenshot showing draft status

---

### Test 9: Essay Assistance (AI Integration)
**URL**: `https://student-pilot-jamarrlmayes.replit.app/essay-coach`

**Steps**:
1. Navigate to essay coach or essay assistance page
2. Enter a test essay prompt
3. Request AI feedback or suggestions
4. Verify OpenAI API integration works
5. **CRITICAL**: Verify AI only provides coaching, NOT ghostwriting

**Expected Results**:
- ✅ Essay input field renders
- ✅ AI feedback generates successfully
- ✅ Response is coaching/suggestions (not full essay)
- ✅ No academic dishonesty enabled
- ✅ Response time reasonable (<10s)

**Verification**:
```bash
# Check essay endpoint
curl -X POST https://student-pilot-jamarrlmayes.replit.app/api/essay/feedback \
  -H "Authorization: Bearer <student_jwt>" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Why do you deserve this scholarship?","draft":"I work hard..."}'

# Expected: 200 OK with coaching feedback (not a complete essay)
```

**Capture**:
- [ ] Screenshot of essay coach UI
- [ ] Screenshot of AI feedback (verify it's coaching only)
- [ ] Network request/response showing API call

---

### Test 10: Logout
**URL**: Any page in student_pilot

**Steps**:
1. Click "Logout" button
2. Verify session cleared
3. Verify redirect to landing page
4. Attempt to access protected page (should redirect to login)

**Expected Results**:
- ✅ Session cookie cleared
- ✅ Redirect to landing page
- ✅ Protected pages redirect to login (401 → login flow)
- ✅ No lingering tokens in storage

**Verification**:
```bash
# After logout, try accessing protected endpoint
curl -b cookies.txt https://student-pilot-jamarrlmayes.replit.app/api/auth/user

# Expected: 401 Unauthorized
```

**Capture**:
- [ ] Screenshot of logout confirmation
- [ ] Network request showing session destroy
- [ ] Screenshot of redirect to landing page
- [ ] Attempt to access /profile → redirects to login

---

## Metrics Summary

After completing all tests, calculate and report:

### 1. Auth Success Rate
```
Auth Success Rate = (Successful logins / Total login attempts) × 100
Target: ≥98%
```

### 2. Page Load Performance
```
Average Page Load Time = (Sum of all page loads) / (Number of pages)
Target: ≤2.5s

TTFB = Time to First Byte for main document
Target: <500ms
```

### 3. API P95 Latency
```bash
# Collect 30 API requests during smoke test
# Sort and get P95 (28th value)

Target: ≤120ms
```

### 4. Error Rate
```
Error Rate = (Failed requests / Total requests) × 100
Target: <1%
```

---

## Evidence Bundle (HAR File)

**Required**: Export HAR file from Chrome DevTools covering entire E2E flow

1. Open DevTools → Network tab
2. Click "Preserve log"
3. Complete all 10 test steps
4. Right-click Network tab → "Save all as HAR with content"
5. Attach to Section 7 report

**HAR File Should Include**:
- All page navigations
- All API requests (with timing data)
- All OAuth redirects
- File uploads to GCS
- AI API calls

---

## Accessibility Quick Checks

### Keyboard Navigation
- [ ] Can tab through all interactive elements
- [ ] No keyboard traps
- [ ] Focus indicators visible

### Screen Reader (Basic)
- [ ] Buttons have aria-labels or accessible text
- [ ] Form inputs have labels
- [ ] Images have alt text

### Contrast
- [ ] No critical contrast failures (use DevTools Lighthouse)

**Target**: Accessibility score ≥90 in Lighthouse

---

## Mobile Responsive Check

Test on 390px viewport (iPhone 12/13/14):

```bash
# Use Chrome DevTools → Toggle device toolbar → iPhone 12 Pro
```

- [ ] No horizontal scroll
- [ ] Touch targets ≥44px
- [ ] Text readable without zoom
- [ ] Forms usable on mobile

---

## Acceptance Criteria (All Must Pass)

- [ ] All 10 test steps completed successfully
- [ ] Auth success rate ≥98%
- [ ] Page load time ≤2.5s (average)
- [ ] API P95 ≤120ms
- [ ] Error rate <1%
- [ ] No console errors (warnings OK)
- [ ] Session security: HttpOnly cookies, no tokens in localStorage
- [ ] OIDC flow works with PKCE
- [ ] Integration with scholarship_api, scholarship_sage, GCS all functional
- [ ] AI essay coach provides coaching only (no ghostwriting)
- [ ] HAR file exported and attached
- [ ] Lighthouse accessibility ≥90
- [ ] Mobile responsive (390px viewport, no horizontal scroll)

---

## Failure Scenarios & Actions

| Failure | Action |
|---------|--------|
| Auth success rate <98% | STOP: Investigate scholar_auth; do not proceed to soft launch |
| Page load >2.5s | STOP: Investigate frontend bundle size or API latency |
| API P95 >120ms | STOP: Investigate scholarship_api or scholarship_sage performance |
| OIDC flow breaks | STOP: Verify scholar_auth JWKS and callback URL configuration |
| GCS upload fails | Investigate presigned URL generation and CORS settings |
| AI essay coach down | Non-blocking if other features work; can launch with feature flag OFF |
| Accessibility <90 | Document issues; fix critical (A/AA violations) before soft launch |

---

## Post-Test Deliverables

1. **Completed checklist** (all items checked)
2. **HAR file** (full E2E flow)
3. **Screenshots** (minimum 1 per test step)
4. **Metrics summary**:
   - Auth success rate: ____%
   - Average page load: ____s
   - API P95: ____ms
   - Error rate: ____%
5. **Lighthouse report** (Performance, Accessibility, Best Practices)
6. **Section 7 report** with all verification outputs

---

## Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Setup & prerequisites verification | 5 min | T+5 |
| Tests 1-3 (Landing, Register, Login) | 10 min | T+15 |
| Tests 4-6 (Profile, Search, Recommendations) | 10 min | T+25 |
| Tests 7-8 (Apply, Status) | 15 min | T+40 |
| Test 9 (Essay Coach) | 10 min | T+50 |
| Test 10 (Logout) | 5 min | T+55 |
| Metrics calculation & evidence bundle | 5 min | T+60 |

**Total**: 60 minutes (aligned with CEO deadline)

---

## Escalation

If any critical test fails:
1. Document failure with screenshots/logs
2. Notify CEO immediately
3. Provide ETA for fix
4. Do NOT proceed to soft launch
