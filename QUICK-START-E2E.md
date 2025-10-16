# 🚀 Quick Start: E2E Authentication Tests

## ✅ Pre-configured and Ready to Run!

The E2E test suite is **production-ready** with all selectors matching Scholar Auth's actual implementation.

---

## 📋 3-Step Setup

### Step 1: Add OAuth Secrets (Required for App)

Add these to your Replit Secrets:

```bash
FEATURE_AUTH_PROVIDER=scholar-auth
AUTH_CLIENT_ID=student-pilot
AUTH_CLIENT_SECRET=b993703087aa4de217c579594746d225dc7ebde09951afa90a65189f9e487fac
AUTH_ISSUER_URL=https://scholar-auth-jamarrlmayes.replit.app
```

**How to add**:
1. Click **Tools** → **Secrets** in Replit
2. Add each key-value pair
3. Restart your app workflow

### Step 2: Create Test User

1. Visit: **https://scholar-auth-jamarrlmayes.replit.app**
2. Register a test account (e.g., `test-student@example.com`)
3. Save the credentials

### Step 3: Run Tests

```bash
# Set test credentials
export AUTH_URL=https://scholar-auth-jamarrlmayes.replit.app
export STUDENT_URL=https://student-pilot-jamarrlmayes.replit.app
export PROVIDER_URL=https://provider-register-jamarrlmayes.replit.app
export TEST_EMAIL_STUDENT=test-student@example.com
export TEST_PASSWORD_STUDENT=your-test-password

# Install browsers (first time only)
npx playwright install chromium

# Run tests
./run-auth-e2e.sh
```

---

## ✅ Expected Results

```
Running 3 tests using 1 worker

  ✓  Student app: unauthenticated user redirects to auth and logs in (45s)
  ✓  Provider app: SSO pass-through after Student login (38s)
  ✓  Provider app: direct access redirects to auth and logs in (42s)

3 passed (2.1m)
```

Screenshots saved to: `e2e-results/*.png`

---

## 🎯 What's Being Tested

| Test | Validates |
|------|-----------|
| **Student Auth Flow** | Student app → Scholar Auth → Login → Redirect back authenticated |
| **Provider SSO** | After Student login, Provider app authenticates via SSO (no login form) |
| **Provider Direct Auth** | Provider app → Scholar Auth → Login → Redirect back authenticated |

---

## 📚 More Documentation

- **Detailed Setup**: `OAUTH-SETUP.md`
- **Full Test Documentation**: `e2e/README.md`
- **Implementation Guide**: `E2E-AUTH-TEST-IMPLEMENTATION.md`

---

## 🔧 Troubleshooting

**Tests fail with "Missing credentials"**
→ Ensure `TEST_EMAIL_STUDENT` and `TEST_PASSWORD_STUDENT` are exported

**"Could not find email input"**
→ Verify Scholar Auth is running and accessible

**OAuth errors in Student app**
→ Check all 4 secrets are added to Replit and app is restarted

**View detailed results**:
```bash
npx playwright show-report
```

---

**That's it!** Your E2E authentication tests are ready to run. 🎉
