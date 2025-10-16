// E2E Test Suite: Centralized Authentication & SSO
// Tests authentication flow across Student and Provider apps via centralized auth
import { test, expect, type Page } from '@playwright/test';

const AUTH_URL = process.env.AUTH_URL || 'https://scholar-auth-jamarrlmayes.replit.app';
const STUDENT_URL = process.env.STUDENT_URL || 'https://student-pilot-jamarrlmayes.replit.app';
const PROVIDER_URL = process.env.PROVIDER_URL || 'https://provider-register-jamarrlmayes.replit.app';

const TEST_EMAIL_STUDENT = process.env.TEST_EMAIL_STUDENT || process.env.TEST_EMAIL || '';
const TEST_PASSWORD_STUDENT = process.env.TEST_PASSWORD_STUDENT || process.env.TEST_PASSWORD || '';
const TEST_EMAIL_PROVIDER = process.env.TEST_EMAIL_PROVIDER || TEST_EMAIL_STUDENT;
const TEST_PASSWORD_PROVIDER = process.env.TEST_PASSWORD_PROVIDER || TEST_PASSWORD_STUDENT;

/**
 * Helper: Perform login on Centralized Auth page
 * Uses resilient selectors with fallbacks for various auth UI patterns
 */
async function loginOnAuth(page: Page, email: string, password: string) {
  // Wait for auth page to load
  await page.waitForLoadState('domcontentloaded');
  
  // Try data-testid first (most stable), then fall back to semantic selectors
  const emailSelectors = [
    'input[data-testid="input-email"]',
    'input[type="email"]',
    'input[name="email"]',
    'input[placeholder*="email" i]'
  ];
  
  const passwordSelectors = [
    'input[data-testid="input-password"]',
    'input[type="password"]',
    'input[name="password"]',
    'input[placeholder*="password" i]'
  ];
  
  const submitSelectors = [
    'button[data-testid="button-submit-login"]', // Scholar Auth uses this testid
    'button[type="submit"]',
    'button:has-text("Log in")',
    'button:has-text("Sign in")',
    'button:has-text("Continue")'
  ];
  
  // Find and fill email field
  let emailFilled = false;
  for (const selector of emailSelectors) {
    const element = page.locator(selector);
    if (await element.count() > 0 && await element.isVisible().catch(() => false)) {
      await element.fill(email);
      emailFilled = true;
      break;
    }
  }
  
  if (!emailFilled) {
    throw new Error('Could not find email input field on auth page');
  }
  
  // Find and fill password field
  let passwordFilled = false;
  for (const selector of passwordSelectors) {
    const element = page.locator(selector);
    if (await element.count() > 0 && await element.isVisible().catch(() => false)) {
      await element.fill(password);
      passwordFilled = true;
      break;
    }
  }
  
  if (!passwordFilled) {
    throw new Error('Could not find password input field on auth page');
  }
  
  // Find and click submit button, or press Enter as fallback
  let submitted = false;
  for (const selector of submitSelectors) {
    const element = page.locator(selector);
    if (await element.count() > 0 && await element.isVisible().catch(() => false)) {
      await element.click();
      submitted = true;
      break;
    }
  }
  
  // Fallback: press Enter on password field
  if (!submitted) {
    console.log('No submit button found, pressing Enter on password field');
    const passwordField = page.locator(passwordSelectors[0]);
    await passwordField.press('Enter');
  }
}

/**
 * Helper: Ensure user is authenticated on target app
 * Handles redirect to auth if needed and waits for successful return
 */
async function ensureAuthenticatedViaAuth(
  page: Page, 
  startUrl: string, 
  email: string, 
  password: string
) {
  await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  // Check if we got redirected to auth
  await page.waitForLoadState('domcontentloaded');
  const currentUrl = page.url();
  
  if (currentUrl.startsWith(AUTH_URL)) {
    console.log(`Redirected to auth, logging in with ${email}`);
    await loginOnAuth(page, email, password);
    
    // Wait for redirect back to the app
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
    
    // Wait for URL to change away from AUTH_URL
    await page.waitForFunction(
      (authUrl) => !window.location.href.startsWith(authUrl), 
      AUTH_URL, 
      { timeout: 30000 }
    );
  }
  
  // Verify we're on the expected app domain
  const finalUrl = page.url();
  const expectedOrigin = new URL(startUrl).origin;
  expect(finalUrl.startsWith(expectedOrigin), 
    `Expected to be on ${expectedOrigin}, but got ${finalUrl}`
  ).toBeTruthy();
}

/**
 * Helper: Check for authenticated UI indicators
 */
async function checkAuthenticatedUI(page: Page, appName: string): Promise<boolean> {
  const authIndicators = [
    // Stable data-testid selectors (preferred)
    page.locator('[data-testid="button-logout"]'),
    page.locator('[data-testid="user-menu"]'),
    page.locator('[data-testid="text-username"]'),
    
    // Semantic fallbacks
    page.getByRole('button', { name: /log out|sign out/i }),
    page.getByRole('button', { name: /profile|account|settings/i }),
    page.getByText(/dashboard|welcome back|my scholarships/i).first(),
  ];
  
  for (const indicator of authIndicators) {
    try {
      await indicator.waitFor({ state: 'visible', timeout: 10000 });
      console.log(`Found authenticated indicator in ${appName}`);
      return true;
    } catch {
      // Continue trying other indicators
    }
  }
  
  console.warn(`No authenticated indicator found in ${appName}`);
  return false;
}

test.describe('Centralized Authentication E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Increase timeout for Replit latencies
    test.setTimeout(90000);
  });

  test('Student app: unauthenticated user redirects to auth and logs in successfully', async ({ page }) => {
    test.skip(
      !TEST_EMAIL_STUDENT || !TEST_PASSWORD_STUDENT, 
      'Missing TEST_EMAIL_STUDENT/TEST_PASSWORD_STUDENT environment variables'
    );
    
    console.log(`Testing Student app authentication flow...`);
    console.log(`Student URL: ${STUDENT_URL}`);
    console.log(`Auth URL: ${AUTH_URL}`);
    
    // Navigate to student app and authenticate
    await ensureAuthenticatedViaAuth(page, STUDENT_URL, TEST_EMAIL_STUDENT, TEST_PASSWORD_STUDENT);
    
    // Verify authenticated UI is visible
    const isAuthenticated = await checkAuthenticatedUI(page, 'Student App');
    expect(isAuthenticated, 'Student app should show authenticated UI after login').toBeTruthy();
    
    // Take screenshot for verification
    await page.screenshot({ path: 'e2e-results/student-authenticated.png', fullPage: true });
  });

  test('Provider app: SSO pass-through after Student login (no credential prompt)', async ({ context }) => {
    test.skip(
      !TEST_EMAIL_STUDENT || !TEST_PASSWORD_STUDENT, 
      'Missing TEST_EMAIL_STUDENT/TEST_PASSWORD_STUDENT environment variables'
    );
    
    console.log(`Testing SSO flow: Student → Provider...`);
    
    // Step 1: Authenticate on Student app to establish session
    const studentPage = await context.newPage();
    await ensureAuthenticatedViaAuth(studentPage, STUDENT_URL, TEST_EMAIL_STUDENT, TEST_PASSWORD_STUDENT);
    
    const studentAuthed = await checkAuthenticatedUI(studentPage, 'Student App');
    expect(studentAuthed, 'Student app should be authenticated first').toBeTruthy();
    
    console.log('Student app authenticated, now testing SSO to Provider...');
    
    // Step 2: Navigate to Provider app in same context (shared auth session)
    const providerPage = await context.newPage();
    await providerPage.goto(PROVIDER_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // If redirected to auth, should auto-pass-through without login form
    await providerPage.waitForLoadState('domcontentloaded');
    
    // Wait for final landing (may briefly touch AUTH_URL for SSO check)
    await providerPage.waitForFunction(
      (authUrl) => !window.location.href.startsWith(authUrl), 
      AUTH_URL, 
      { timeout: 30000 }
    );
    
    // Should NOT see login form - verify we didn't have to enter credentials
    const emailInput = providerPage.locator('input[type="email"]');
    const emailVisible = await emailInput.isVisible().catch(() => false);
    expect(emailVisible, 'Should NOT see login form (SSO should pass through)').toBeFalsy();
    
    // Verify authenticated UI on Provider
    const providerAuthed = await checkAuthenticatedUI(providerPage, 'Provider App');
    expect(providerAuthed, 'Provider app should show authenticated UI via SSO').toBeTruthy();
    
    // Take screenshot for verification
    await providerPage.screenshot({ path: 'e2e-results/provider-sso-authenticated.png', fullPage: true });
  });

  test('Provider app: direct access redirects to auth and logs in successfully', async ({ page }) => {
    test.skip(
      !TEST_EMAIL_PROVIDER || !TEST_PASSWORD_PROVIDER, 
      'Missing TEST_EMAIL_PROVIDER/TEST_PASSWORD_PROVIDER environment variables'
    );
    
    console.log(`Testing Provider app direct authentication flow...`);
    console.log(`Provider URL: ${PROVIDER_URL}`);
    
    // Navigate to provider app and authenticate
    await ensureAuthenticatedViaAuth(page, PROVIDER_URL, TEST_EMAIL_PROVIDER, TEST_PASSWORD_PROVIDER);
    
    // Verify authenticated UI is visible
    const isAuthenticated = await checkAuthenticatedUI(page, 'Provider App');
    expect(isAuthenticated, 'Provider app should show authenticated UI after login').toBeTruthy();
    
    // Take screenshot for verification
    await page.screenshot({ path: 'e2e-results/provider-direct-authenticated.png', fullPage: true });
  });

  test.skip('Logout: revokes access on both client apps', async ({ context }) => {
    // TODO: Enable once consistent logout UI is implemented across apps
    test.skip(true, 'Logout flow test disabled - enable when logout UX is consistent');
    
    // Example flow:
    // 1. Authenticate on Student app
    // 2. Click logout
    // 3. Navigate to Provider app
    // 4. Verify redirect to auth with visible login form
  });
});
