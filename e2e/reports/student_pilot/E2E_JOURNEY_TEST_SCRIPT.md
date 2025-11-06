# End-to-End Journey Test Script (Staging IdP Ready)

**APP_NAME:** student_pilot | **APP_BASE_URL:** https://student-pilot-jamarrlmayes.replit.app  
**Status:** 📋 **READY TO EXECUTE** (pending scholar_auth OIDC client registration)  
**CEO Directive:** "Prepare scripted end-to-end journey test to run immediately when staging IdP is live; include screenshots and P95 timings."

---

## Executive Summary

Comprehensive E2E test script covering complete student scholarship journey from landing → authentication → profile completion → scholarship discovery → application tracking → document upload → essay assistance. Script is **ready to execute immediately** upon scholar_auth OIDC client registration completion.

**Trigger Condition:** scholar_auth publishes OIDC discovery URL + client config for 'student-pilot'  
**Execution Time:** ~10-15 minutes  
**Expected Deliverable:** Screenshots + P95 timings + responsiveness evidence

---

## Prerequisites

### Infrastructure Requirements (Auth DRI)
- ✅ scholar_auth OIDC discovery URL published
- ✅ Client 'student-pilot' registered with redirect_uri `/api/callback`
- ✅ PKCE S256 flow enabled
- ✅ Claims parity: `sub`, `email`, `aud`, `roles`, `offline_access`

### Application Requirements
- ✅ student_pilot deployed and accessible
- ✅ Database operational
- ✅ Feature flags configured (recommendations: false, accessibility: true)

### Test Environment
- ✅ Playwright installed and configured
- ✅ Multiple browsers available (Chromium, Firefox, WebKit)
- ✅ Network connectivity to scholar_auth

---

## Test Plan: Complete Student Journey

### Phase 1: Landing & Authentication

#### Test 1.1: Landing Page - Desktop (Chromium 1920x1080)
1. [New Context] Create browser context with viewport 1920x1080 (Chromium)
2. [Browser] Navigate to /
3. [Screenshot] Capture landing page desktop view
4. [Verify] Landing page elements:
   - ScholarLink logo visible
   - Hero heading "Your Scholarship Journey Starts Here"
   - Feature cards (6) in 3-column grid
   - "Get Started" CTA buttons
5. [Performance] Measure and record page load time (P95 baseline)

#### Test 1.2: Landing Page - Mobile (Chromium 375x667)
6. [New Context] Create browser context with viewport 375x667 (Chromium)
7. [Browser] Navigate to /
8. [Screenshot] Capture landing page mobile view
9. [Verify] Mobile responsiveness:
   - Single-column feature card stack
   - No horizontal scrolling
   - Touch-friendly buttons

#### Test 1.3: Authentication Flow
10. [New Context] Create browser context with viewport 1920x1080 (Chromium)
11. [OIDC] Configure next login to use {sub: nanoid(6), email: `testuser${nanoid(6)}@example.com`, first_name: "Test", last_name: "Student"}. Note sub and email for future use (say ${test_sub} and ${test_email})
12. [Browser] Navigate to /
13. [Browser] Click "Get Started" button (data-testid="button-get-started")
14. [Verify] Redirect to /dashboard after successful authentication
15. [Screenshot] Capture dashboard after first login
16. [Performance] Measure authentication flow timing (P95)

---

### Phase 2: Profile Completion (Activation Trigger)

#### Test 2.1: Navigate to Profile
17. [Browser] Click navigation link to /profile or navigate directly
18. [Screenshot] Capture empty profile form
19. [Verify] Profile form displays:
   - GPA input field
   - Major input field
   - Academic level dropdown
   - Graduation year input
   - School input
   - Location input
   - Interests, extracurriculars, achievements sections
   - Financial need checkbox
   - Save button

#### Test 2.2: Complete Profile - Desktop
20. [Browser] Fill profile form:
   - GPA: "3.8"
   - Major: "Computer Science"
   - Academic Level: "Undergraduate"
   - Graduation Year: 2026
   - School: "State University"
   - Location: "California, USA"
   - Add interest: "Artificial Intelligence" (data-testid="input-interest")
   - Add activity: "Coding Club President" (data-testid="input-activity")
   - Add achievement: "Dean's List" (data-testid="input-achievement")
   - Check financial need: true
21. [Browser] Click "Save Profile" button (data-testid="button-save-profile")
22. [Verify] Success toast appears
23. [Verify] Completion percentage increases
24. [Screenshot] Capture completed profile
25. [Performance] Measure profile save API timing (P95)

#### Test 2.3: Profile - Mobile Responsiveness (375x667)
26. [New Context] Create browser context with viewport 375x667 (Chromium)
27. [OIDC] Configure login with same test user credentials (${test_sub}, ${test_email})
28. [Browser] Navigate to /profile
29. [Verify] Mobile profile layout:
   - Form fields stack vertically
   - Full-width input fields
   - Labels visible above fields
   - Save button accessible
30. [Screenshot] Capture profile mobile view

---

### Phase 3: Scholarship Discovery

#### Test 3.1: Browse Scholarships - Desktop
31. [New Context] Create browser context with viewport 1920x1080 (Chromium)
32. [OIDC] Configure login with test user
33. [Browser] Navigate to /scholarships
34. [Screenshot] Capture scholarships page
35. [Verify] Scholarships page elements:
   - Search bar (data-testid="input-search")
   - Filter dropdowns (amount, deadline)
   - Scholarship cards displayed
   - At least 1 scholarship visible
36. [Performance] Measure scholarships page load time (P95)

#### Test 3.2: Search and Filter
37. [Browser] Enter "STEM" in search field
38. [Verify] Scholarship list filters based on search term
39. [Browser] Select amount filter "$5,000 - $10,000"
40. [Verify] Scholarship list updates with filter applied
41. [Screenshot] Capture filtered scholarships

#### Test 3.3: Scholarships - Tablet (768x1024)
42. [New Context] Create browser context with viewport 768x1024 (Chromium)
43. [OIDC] Configure login with test user
44. [Browser] Navigate to /scholarships
45. [Verify] Tablet layout:
   - Scholarship cards in 2-column grid
   - Search and filters accessible
   - No content overflow
46. [Screenshot] Capture scholarships tablet view

---

### Phase 4: Application Tracking

#### Test 4.1: View Applications - Desktop
47. [New Context] Create browser context with viewport 1920x1080 (Chromium)
48. [OIDC] Configure login with test user
49. [Browser] Navigate to /applications
50. [Screenshot] Capture applications page
51. [Verify] Applications page elements:
   - Stats cards (Total, In Progress, Submitted, Accepted, Draft)
   - Application list or empty state
   - Filter dropdown (data-testid="select-status-filter")
52. [Performance] Measure applications page load time (P95)

#### Test 4.2: Applications - Mobile (375x667)
53. [New Context] Create browser context with viewport 375x667 (Chromium)
54. [OIDC] Configure login with test user
55. [Browser] Navigate to /applications
56. [Verify] Mobile applications layout:
   - Stats cards stack vertically
   - Application list single-column
   - Filter accessible
57. [Screenshot] Capture applications mobile view

---

### Phase 5: Document Upload (North-Star Activation)

#### Test 5.1: Navigate to Documents
58. [New Context] Create browser context with viewport 1920x1080 (Chromium)
59. [OIDC] Configure login with test user
60. [Browser] Navigate to /documents
61. [Screenshot] Capture documents page (empty state or with documents)
62. [Verify] Documents page elements:
   - "Upload Document" button (data-testid="button-upload-document")
   - Document list or empty state message
   - Document type categories

#### Test 5.2: Upload Document (Simulated - UI Only)
63. [Browser] Click "Upload Document" button
64. [Verify] Upload dialog opens with:
   - Title input field (data-testid="input-document-title")
   - Type dropdown (data-testid="select-document-type")
   - File uploader component
65. [Screenshot] Capture upload dialog
66. [Browser] Close dialog
67. [Performance] Note: Actual file upload requires GCS integration (skip for responsiveness test)

#### Test 5.3: Documents - Mobile (375x667)
68. [New Context] Create browser context with viewport 375x667 (Chromium)
69. [OIDC] Configure login with test user
70. [Browser] Navigate to /documents
71. [Verify] Mobile documents layout:
   - Upload button accessible
   - Document cards stack vertically
   - No horizontal overflow
72. [Screenshot] Capture documents mobile view

---

### Phase 6: Essay Assistant

#### Test 6.1: Essay Assistant - Desktop
73. [New Context] Create browser context with viewport 1920x1080 (Chromium)
74. [OIDC] Configure login with test user
75. [Browser] Navigate to /essay-assistant
76. [Screenshot] Capture essay assistant page
77. [Verify] Essay assistant elements:
   - Essay list or "Create New Essay" option
   - Essay prompts or templates
   - AI assistance features visible
78. [Performance] Measure essay assistant page load time (P95)

#### Test 6.2: Essay Assistant - Mobile (375x667)
79. [New Context] Create browser context with viewport 375x667 (Chromium)
80. [OIDC] Configure login with test user
81. [Browser] Navigate to /essay-assistant
82. [Verify] Mobile essay layout:
   - Form fields stack properly
   - Buttons accessible
   - No text truncation
83. [Screenshot] Capture essay assistant mobile view

---

### Phase 7: Billing & Credits

#### Test 7.1: Billing Page - Desktop
84. [New Context] Create browser context with viewport 1920x1080 (Chromium)
85. [OIDC] Configure login with test user
86. [Browser] Navigate to /billing
87. [Screenshot] Capture billing page
88. [Verify] Billing page elements:
   - Current credit balance visible
   - Credit packages displayed (Starter, Professional, Enterprise)
   - Purchase buttons
   - Transaction history (if any)
89. [Performance] Measure billing page load time (P95)

#### Test 7.2: Billing - Mobile (375x667)
90. [New Context] Create browser context with viewport 375x667 (Chromium)
91. [OIDC] Configure login with test user
92. [Browser] Navigate to /billing
93. [Verify] Mobile billing layout:
   - Credit packages stack vertically
   - Balance card visible
   - Purchase buttons tappable
94. [Screenshot] Capture billing mobile view

---

### Phase 8: Dashboard Return Journey

#### Test 8.1: Return to Dashboard
95. [New Context] Create browser context with viewport 1920x1080 (Chromium)
96. [OIDC] Configure login with test user (with profile completed from earlier)
97. [Browser] Navigate to /dashboard
98. [Screenshot] Capture dashboard with profile completed
99. [Verify] Dashboard shows:
   - User's completed profile status
   - Stats cards with data
   - Navigation functional
   - Credit balance visible
100. [Verify] Profile completion tracking displays updated percentage

---

### Phase 9: Cross-Browser Verification

#### Test 9.1: Dashboard - Firefox (1920x1080)
101. [New Context] Create browser context with viewport 1920x1080 (Firefox)
102. [OIDC] Configure login with test user
103. [Browser] Navigate to /dashboard
104. [Screenshot] Capture dashboard Firefox view
105. [Verify] Dashboard renders correctly in Firefox:
   - All components display
   - Styling consistent
   - Navigation functional

#### Test 9.2: Dashboard - WebKit (1920x1080)
106. [New Context] Create browser context with viewport 1920x1080 (WebKit/Safari)
107. [OIDC] Configure login with test user
108. [Browser] Navigate to /dashboard
109. [Screenshot] Capture dashboard WebKit view
110. [Verify] Dashboard renders correctly in Safari/WebKit:
   - Layout matches other browsers
   - All interactive elements work

---

## Performance Metrics Collection

### P95 Timing Targets
- Landing page load: <3s
- Authentication flow: <5s
- Profile save: <500ms
- Page navigation: <2s
- API requests: <120ms

### Metrics to Capture
1. **Landing Page Load Time** (Test 1.1)
2. **Authentication Flow Duration** (Test 1.3)
3. **Profile Save API Timing** (Test 2.2)
4. **Scholarships Page Load** (Test 3.1)
5. **Applications Page Load** (Test 4.1)
6. **Documents Page Load** (Test 5.1)
7. **Essay Assistant Load** (Test 6.1)
8. **Billing Page Load** (Test 7.1)
9. **Dashboard Load (Return)** (Test 8.1)

### Timing Format
```
{
  "metric": "landing_page_load",
  "p50": "1200ms",
  "p95": "2400ms",
  "p99": "3000ms",
  "timestamp": "2025-11-06T00:00:00Z"
}
```

---

## Screenshot Manifest

**Total Screenshots:** 25+

### By Page
- Landing: 2 (desktop, mobile)
- Dashboard: 4 (desktop Chromium, desktop Firefox, desktop WebKit, mobile)
- Profile: 2 (desktop completed, mobile)
- Scholarships: 3 (desktop, filtered, tablet)
- Applications: 2 (desktop, mobile)
- Documents: 3 (desktop, upload dialog, mobile)
- Essay Assistant: 2 (desktop, mobile)
- Billing: 2 (desktop, mobile)

### By Viewport
- Desktop 1920x1080: 15+
- Tablet 768x1024: 2+
- Mobile 375x667: 8+

---

## Expected Results

### Pass Criteria
✅ All pages load without errors  
✅ Responsive layouts confirmed at 3 viewport sizes  
✅ Authentication flow completes successfully  
✅ Profile can be created and saved  
✅ Navigation between all pages functional  
✅ Cross-browser compatibility (Chromium, Firefox, WebKit)  
✅ P95 timings ≤120ms for API calls  
✅ No horizontal scrolling on any viewport  
✅ All interactive elements accessible on mobile (44x44px min)

### Known Limitations
⚠️ Actual file uploads not tested (requires GCS integration)  
⚠️ Payment flow not executed (Stripe at 0% rollout)  
⚠️ AI features not tested with actual API calls (credit consumption)  
⚠️ Recommendations UI not tested (feature flag: disabled)

---

## Execution Timeline

**When to Run:** Immediately upon Auth DRI posting scholar_auth OIDC discovery URL + client registration confirmation

**Execution Duration:** 10-15 minutes

**Deliverables Within 30 Minutes:**
1. ✅ All 110 test steps executed
2. ✅ 25+ screenshots captured
3. ✅ P95 timing metrics collected
4. ✅ Evidence report posted to `e2e/reports/student_pilot/E2E_JOURNEY_EVIDENCE.md`
5. ✅ Responsiveness verification complete
6. ✅ Cross-browser compatibility confirmed

---

## Post-Execution Actions

### Immediate (Within 30 Min)
1. Post `E2E_JOURNEY_EVIDENCE.md` with:
   - Screenshot links/attachments
   - P95 timing table
   - Pass/fail summary
   - Any issues discovered

2. Update `ui_responsiveness.md` with:
   - Authenticated page results
   - Complete viewport coverage
   - Final pass rate

### Follow-Up (Within 24 Hours)
1. Address any UI bugs discovered
2. Update replit.md with test results
3. Post CEO update if blockers found

---

## Escalation Path

**If Test Fails Due to:**
- **Auth Issues:** Escalate to Auth DRI with error details
- **Performance Degradation:** Post P95 evidence, investigate backend
- **UI Bugs:** Fix immediately and re-run affected tests
- **Browser Incompatibility:** Document and investigate specific browser issue

**SLA:** Report any critical blocker to CEO within 1 hour of discovery

---

## Compliance

**CEO Directive:** ✅ **READY**
- "Prepare scripted end-to-end journey test" → ✅ Complete (this script)
- "Run immediately when staging IdP is live" → ✅ Trigger condition clear
- "Include screenshots and P95 timings" → ✅ Built into test plan

**Evidence-First:** ✅ **READY**
- APP_NAME | APP_BASE_URL headers: Included
- Detailed test plan: 110 steps across 9 phases
- Success criteria: Clearly defined
- Performance targets: P95 ≤120ms specified

---

## Summary

Comprehensive E2E journey test script covering complete student scholarship workflow from landing through authentication, profile completion, scholarship discovery, application tracking, document upload, essay assistance, and billing. Script includes 110 detailed test steps across 25+ screenshots and 9 P95 timing measurements.

**Status:** 📋 **READY TO EXECUTE**  
**Trigger:** scholar_auth OIDC client registration completion  
**Owner:** student_pilot DRI  
**Timeline:** Execute within 20 minutes of trigger  
**Deliverable:** Complete evidence report with screenshots + P95 timings within 30 minutes

---

**Prepared By:** Agent3 (student_pilot DRI)  
**Script Version:** 1.0  
**Date:** 2025-11-05  
**Status:** STAGED & READY 🚀
