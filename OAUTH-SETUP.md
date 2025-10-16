# OAuth Configuration Setup for Student Pilot

## 🔐 OAuth Configuration from Scholar Auth

Student Pilot uses centralized OAuth authentication via Scholar Auth. The OAuth client has been pre-configured and is ready to use.

---

## ✅ Required Secrets (Add to Replit)

Add these secrets to your Replit environment:

### Student Pilot OAuth Configuration

```bash
# Feature Flag (enables Scholar Auth provider)
FEATURE_AUTH_PROVIDER=scholar-auth

# OAuth Client Credentials
AUTH_CLIENT_ID=student-pilot
AUTH_CLIENT_SECRET=<OBTAIN_FROM_SCHOLAR_AUTH_ADMIN>

# Auth Server URL
AUTH_ISSUER_URL=https://scholar-auth-jamarrlmayes.replit.app
```

### How to Add Secrets to Replit

1. Open your Replit project
2. Click **Tools** → **Secrets** (or click the lock icon in sidebar)
3. Add each secret:
   - Key: `FEATURE_AUTH_PROVIDER`
   - Value: `scholar-auth`
   - Click **Add secret**
4. Repeat for `AUTH_CLIENT_ID`, `AUTH_CLIENT_SECRET`, and `AUTH_ISSUER_URL`
5. Restart your application workflow

---

## 🌐 OAuth Endpoints

These are auto-discovered via the OpenID Connect Discovery endpoint:

```bash
# Discovery Endpoint (auto-configures all endpoints)
https://scholar-auth-jamarrlmayes.replit.app/.well-known/openid-configuration

# Individual Endpoints (for reference)
AUTHORIZATION: https://scholar-auth-jamarrlmayes.replit.app/oauth/auth
TOKEN:         https://scholar-auth-jamarrlmayes.replit.app/oauth/token
USERINFO:      https://scholar-auth-jamarrlmayes.replit.app/oauth/userinfo
```

---

## 🔒 Security Configuration

### Client Details
- **Client ID**: `student-pilot`
- **Authentication Method**: `client_secret_post` (credentials in POST body)
- **Grant Types**: `authorization_code`, `refresh_token`
- **Response Types**: `code`

### Security Features Enabled
✅ **PKCE S256** (always required)
- Every auth request must include `code_challenge` and `code_challenge_method=S256`

✅ **Refresh Token Rotation**
- New refresh token issued with each use (old token invalidated)

✅ **PostgreSQL Token Persistence**
- Tokens stored securely in database

### Registered Callback URLs
```
✅ https://student-pilot-jamarrlmayes.replit.app/oidc/callback
✅ https://student-pilot-jamarrlmayes.replit.app/api/callback
```
Plus 6 additional development/production URLs for flexibility.

### Supported Scopes
```
openid email profile roles
```

---

## 🧪 E2E Test Configuration

### Test Environment URLs
```bash
# Application URLs
AUTH_URL=https://scholar-auth-jamarrlmayes.replit.app
STUDENT_URL=https://student-pilot-jamarrlmayes.replit.app
PROVIDER_URL=https://provider-register-jamarrlmayes.replit.app
```

### Create Test User

Before running E2E tests, create a test user on Scholar Auth:

1. **Visit**: https://scholar-auth-jamarrlmayes.replit.app
2. **Register** a test account with:
   - Email: `test-student@example.com` (or your preferred test email)
   - Password: Strong password for testing
3. **Save credentials** for use in E2E tests

### Test Credentials (Environment Variables)
```bash
# Use the test account you created
TEST_EMAIL_STUDENT=test-student@example.com
TEST_PASSWORD_STUDENT=your-secure-test-password
```

### Scholar Auth Login Form Selectors

**Good news!** Scholar Auth already has all the `data-testid` attributes our E2E tests need:

```typescript
// Available Login Form Elements
'input[data-testid="input-email"]'           // ✅ Email input
'input[data-testid="input-password"]'        // ✅ Password input
'button[data-testid="button-submit-login"]'  // ✅ Submit button
'button[data-testid="button-toggle-password"]' // Show/hide password
'checkbox[data-testid="checkbox-remember-me"]' // Remember me
'button[data-testid="button-forgot-password"]' // Forgot password
'button[data-testid="button-replit-auth"]'   // Alternative auth
```

**E2E tests are already configured to use these stable selectors!** ✅

---

## 🚀 Running E2E Tests

Once OAuth secrets are configured and test user is created:

```bash
# 1. Set environment variables
export AUTH_URL=https://scholar-auth-jamarrlmayes.replit.app
export STUDENT_URL=https://student-pilot-jamarrlmayes.replit.app
export PROVIDER_URL=https://provider-register-jamarrlmayes.replit.app
export TEST_EMAIL_STUDENT=test-student@example.com
export TEST_PASSWORD_STUDENT=your-test-password

# 2. Install Playwright browsers (first time only)
npx playwright install chromium

# 3. Run E2E authentication tests
npx playwright test e2e/auth.e2e.spec.ts --project=chromium-e2e

# OR use the convenience script
./run-auth-e2e.sh
```

### Expected Test Results

```
Running 3 tests using 1 worker

  ✓  Student app: unauthenticated user redirects to auth and logs in (45s)
  ✓  Provider app: SSO pass-through after Student login (38s)  
  ✓  Provider app: direct access redirects to auth and logs in (42s)

3 passed (2.1m)
```

---

## 📋 Setup Checklist

### Step 1: Add OAuth Secrets to Replit
- [ ] `FEATURE_AUTH_PROVIDER=scholar-auth`
- [ ] `AUTH_CLIENT_ID=student-pilot`
- [ ] `AUTH_CLIENT_SECRET=<obtain-from-scholar-auth-admin>`
- [ ] `AUTH_ISSUER_URL=https://scholar-auth-jamarrlmayes.replit.app`
- [ ] Restart application workflow

### Step 2: Create Test User
- [ ] Visit https://scholar-auth-jamarrlmayes.replit.app
- [ ] Register test account
- [ ] Save credentials securely

### Step 3: Configure Test Environment
- [ ] Export `AUTH_URL`, `STUDENT_URL`, `PROVIDER_URL`
- [ ] Export `TEST_EMAIL_STUDENT` and `TEST_PASSWORD_STUDENT`
- [ ] Install Playwright browsers (`npx playwright install chromium`)

### Step 4: Run Tests
- [ ] Execute E2E tests: `./run-auth-e2e.sh`
- [ ] Verify all 3 tests pass
- [ ] Check screenshots in `e2e-results/`

### Step 5: Verify OAuth Flow
- [ ] Test manual login on Student Pilot app
- [ ] Verify redirect to Scholar Auth works
- [ ] Verify successful callback and authentication
- [ ] Check SSO works across apps (no re-login required)

---

## 🔧 Troubleshooting

### "OAuth client not configured" Error
- Ensure all 4 secrets are added to Replit
- Restart the application workflow after adding secrets
- Check secret names match exactly (case-sensitive)

### E2E Tests Fail with "Could not find email input"
- Verify Scholar Auth is running at https://scholar-auth-jamarrlmayes.replit.app
- Check test credentials are correct
- Review screenshots in `e2e-results/` to see actual UI

### "Invalid redirect_uri" Error
- Callback URL might not be registered
- Verify your app URL matches the registered callbacks
- Check if using custom domain (add to allowed callbacks)

### Session Not Persisting
- Ensure cookies are enabled
- Check `express-session` configuration
- Verify DATABASE_URL is set (sessions stored in PostgreSQL)

---

## 📚 Additional Resources

- **Scholar Auth**: https://scholar-auth-jamarrlmayes.replit.app
- **OpenID Discovery**: https://scholar-auth-jamarrlmayes.replit.app/.well-known/openid-configuration
- **E2E Test Documentation**: See `e2e/README.md`
- **Test Implementation Guide**: See `E2E-AUTH-TEST-IMPLEMENTATION.md`

---

**Setup Complete!** 🎉

Your Student Pilot app is now configured to use centralized OAuth authentication with comprehensive E2E test coverage.
