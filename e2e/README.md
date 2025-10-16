# E2E Authentication Test Suite

## Overview

This test suite validates the centralized authentication and Single Sign-On (SSO) functionality across the ScholarLink ecosystem:

- **Centralized Auth**: https://scholar-auth-jamarrlmayes.replit.app
- **Student App**: https://student-pilot-jamarrlmayes.replit.app  
- **Provider App**: https://provider-register-jamarrlmayes.replit.app

## Test Scenarios

### 1. Student App Authentication
- Unauthenticated user visits Student app
- Gets redirected to Centralized Auth
- Logs in with credentials
- Redirects back to Student app in authenticated state

### 2. SSO Pass-Through
- User authenticated on Student app
- Visits Provider app in same browser context
- Automatically authenticated via SSO (no credential prompt)
- Provider app shows authenticated UI

### 3. Provider Direct Authentication
- Unauthenticated user visits Provider app directly
- Gets redirected to Centralized Auth
- Logs in with credentials
- Redirects back to Provider app in authenticated state

### 4. Logout Propagation (Optional)
- User logs out from one app
- Access to other app requires re-authentication

## Environment Setup

### Required Environment Variables

Create a `.env.test` file or export these variables:

```bash
# Application URLs
AUTH_URL=https://scholar-auth-jamarrlmayes.replit.app
STUDENT_URL=https://student-pilot-jamarrlmayes.replit.app
PROVIDER_URL=https://provider-register-jamarrlmayes.replit.app

# Test Credentials (Student App)
TEST_EMAIL_STUDENT=youremail@example.com
TEST_PASSWORD_STUDENT=yourpassword

# Test Credentials (Provider App) - optional, defaults to student creds
TEST_EMAIL_PROVIDER=youremail@example.com
TEST_PASSWORD_PROVIDER=yourpassword
```

### Prerequisites

1. **Test Users**: Ensure test accounts exist and can log into the Centralized Auth
2. **Playwright**: Already installed (`@playwright/test@1.55.1`)
3. **Browsers**: Install Playwright browsers

## Installation & Setup

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Install Chromium only (faster)
npx playwright install chromium
```

## Running Tests

### Run All Auth Tests
```bash
# With environment variables
AUTH_URL=https://scholar-auth-jamarrlmayes.replit.app \
STUDENT_URL=https://student-pilot-jamarrlmayes.replit.app \
PROVIDER_URL=https://provider-register-jamarrlmayes.replit.app \
TEST_EMAIL_STUDENT=youremail@example.com \
TEST_PASSWORD_STUDENT=yourpassword \
npx playwright test e2e/auth.e2e.spec.ts

# Or with .env.test file
npx playwright test e2e/auth.e2e.spec.ts
```

### Run Specific Test
```bash
# Student app authentication only
npx playwright test e2e/auth.e2e.spec.ts -g "Student app"

# SSO flow only
npx playwright test e2e/auth.e2e.spec.ts -g "SSO pass-through"
```

### Run with UI (Debug Mode)
```bash
npx playwright test e2e/auth.e2e.spec.ts --ui
```

### Run in Headed Mode (See Browser)
```bash
npx playwright test e2e/auth.e2e.spec.ts --headed
```

## Test Results

Test artifacts are saved to:
- **Screenshots**: `e2e-results/*.png` (on failure or for verification)
- **Videos**: `test-results/` (on failure)
- **Traces**: `test-results/` (on retry)
- **Reports**: `playwright-report/` (HTML report)

### View Test Report
```bash
npx playwright show-report
```

## CI/CD Integration

The test suite is designed for CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run E2E Auth Tests
  env:
    AUTH_URL: ${{ secrets.AUTH_URL }}
    STUDENT_URL: ${{ secrets.STUDENT_URL }}
    PROVIDER_URL: ${{ secrets.PROVIDER_URL }}
    TEST_EMAIL_STUDENT: ${{ secrets.TEST_EMAIL }}
    TEST_PASSWORD_STUDENT: ${{ secrets.TEST_PASSWORD }}
  run: npx playwright test e2e/auth.e2e.spec.ts --reporter=github
```

**Exit Codes**:
- `0` = All tests passed
- `1` = One or more tests failed (blocks deployment)

## Stable Selectors

Tests use resilient selectors with this priority:

1. **data-testid** (most stable) - e.g., `data-testid="input-email"`
2. **Semantic selectors** - e.g., `input[type="email"]`
3. **Role-based** - e.g., `getByRole('button', { name: /log in/i })`

### Recommended data-testid Attributes

#### Centralized Auth App
```html
<input type="email" data-testid="input-email" />
<input type="password" data-testid="input-password" />
<button type="submit" data-testid="button-login">Log in</button>
```

#### Student/Provider Apps
```html
<!-- Authenticated indicators -->
<button data-testid="button-logout">Log out</button>
<div data-testid="user-menu">...</div>
<span data-testid="text-username">John Doe</span>
```

## Troubleshooting

### Tests Skip with "Missing credentials"
- Ensure `TEST_EMAIL_STUDENT` and `TEST_PASSWORD_STUDENT` are set
- Check credentials are valid on Centralized Auth

### Tests Timeout
- Increase timeout in test (default 90s for Replit latencies)
- Check if apps are running and accessible
- Verify URLs are correct

### SSO Test Fails
- Ensure both tests run in same browser context
- Check cookies are not blocked
- Verify session sharing works across domains

### "Could not find email input"
- Check Centralized Auth UI structure
- Add `data-testid` attributes for stability
- Update selectors in `loginOnAuth()` helper

## Adding New Tests

```typescript
test('Your test name', async ({ page }) => {
  // Use helper functions
  await ensureAuthenticatedViaAuth(page, STUDENT_URL, TEST_EMAIL_STUDENT, TEST_PASSWORD_STUDENT);
  
  // Verify authenticated UI
  const authed = await checkAuthenticatedUI(page, 'App Name');
  expect(authed).toBeTruthy();
});
```

## Next Steps

1. ✅ Run tests to discover exact selectors
2. Add `data-testid` attributes to key elements for stability
3. Enable logout test once UX is consistent
4. Wire into CI to block deployments on auth regressions
