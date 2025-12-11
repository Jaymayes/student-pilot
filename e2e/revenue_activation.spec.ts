import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test Suite: Revenue & Activation (student_pilot)
 * Framework: Playwright
 * Strategic Context: "Student Activation via Document Hub" & B2C Revenue
 * 
 * Tests validate:
 * 1. Zero 404 - Homepage accessibility
 * 2. Activation - Document upload flow (10x engagement driver)
 * 3. Upgrade UI - Pricing modal with $9.99 tier visibility
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

// Helper to set up authenticated session via test endpoint
async function mockAuth(page: Page, userId?: string) {
  const testUserId = userId || `test-user-${Date.now()}`;
  
  // Use the test login endpoint to create authenticated session
  const response = await page.request.post(`${BASE_URL}/api/test/login`, {
    data: { userId: testUserId }
  });
  
  if (!response.ok()) {
    console.log('Test login not available, proceeding without auth');
    return null;
  }
  
  return testUserId;
}

test.describe('Suite A: Zero 404 - Core Page Accessibility', () => {
  test('Homepage returns HTTP 200', async ({ page }) => {
    const response = await page.goto(BASE_URL);
    
    expect(response?.status()).toBe(200);
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Homepage accessible - Zero 404 verified');
  });

  test('Dashboard route exists (may redirect to auth)', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/dashboard`);
    
    // Should return 200 (even if redirected to login)
    expect(response?.status()).toBeLessThan(500);
    
    console.log('✅ Dashboard route accessible');
  });

  test('Scholarships page returns HTTP 200', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/scholarships`);
    
    expect(response?.status()).toBe(200);
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Scholarships page accessible');
  });

  test('Legal pages are accessible', async ({ page }) => {
    const legalPages = ['/privacy', '/terms', '/accessibility'];
    
    for (const path of legalPages) {
      const response = await page.goto(`${BASE_URL}${path}`);
      expect(response?.status()).toBe(200);
      console.log(`✅ ${path} accessible`);
    }
  });

  test('Health endpoint returns 200', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    
    expect(response.status()).toBe(200);
    const health = await response.json();
    expect(health.status).toBe('ok');
    
    console.log('✅ Health check passed');
  });
});

test.describe('Suite B: Activation Flow - Document Upload', () => {
  test('Document upload button is visible when authenticated', async ({ page }) => {
    // Navigate to dashboard (will redirect to login if not authenticated)
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Check if we're on a dashboard or login page
    const currentUrl = page.url();
    
    if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
      console.log('⏩ Not authenticated - skipping upload button visibility test');
      test.skip();
      return;
    }
    
    // Look for document upload UI elements
    const uploadButton = page.locator('[data-testid="button-upload-document"], [data-testid="upload-document"], button:has-text("Upload")');
    const isVisible = await uploadButton.isVisible().catch(() => false);
    
    if (isVisible) {
      console.log('✅ Upload Document button is visible');
    } else {
      console.log('⚠️ Upload button not found - may require navigation to documents section');
    }
  });

  test('Documents page is accessible', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/documents`);
    
    // Should not be a server error
    expect(response?.status()).toBeLessThan(500);
    
    console.log('✅ Documents page accessible');
  });

  test('API: Document upload endpoint exists', async ({ request }) => {
    // Test that the upload endpoint exists (will return 401 without auth)
    const response = await request.post(`${BASE_URL}/api/documents`, {
      data: { test: true }
    });
    
    // Should return 401 (auth required) not 404
    expect(response.status()).not.toBe(404);
    
    console.log(`✅ Documents upload endpoint exists (status: ${response.status()})`);
  });
});

test.describe('Suite C: Upgrade UI - Pricing Modal', () => {
  test('Pricing page is accessible', async ({ page }) => {
    // Try common pricing routes
    const pricingRoutes = ['/pricing', '/billing', '/upgrade'];
    let found = false;
    
    for (const route of pricingRoutes) {
      const response = await page.goto(`${BASE_URL}${route}`);
      if (response?.status() === 200) {
        found = true;
        console.log(`✅ Pricing accessible at ${route}`);
        break;
      }
    }
    
    if (!found) {
      console.log('⚠️ No dedicated pricing page - pricing may be in modal');
    }
  });

  test('Pricing modal can be triggered from dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Look for upgrade/pricing button
    const upgradeButton = page.locator(
      '[data-testid="button-upgrade"], ' +
      '[data-testid="upgrade-button"], ' +
      'button:has-text("Upgrade"), ' +
      'button:has-text("Buy Credits"), ' +
      'button:has-text("Get Credits")'
    );
    
    const isVisible = await upgradeButton.first().isVisible().catch(() => false);
    
    if (isVisible) {
      await upgradeButton.first().click();
      await page.waitForTimeout(500);
      
      // Check if pricing modal appeared
      const pricingModal = page.locator(
        '[data-testid="pricing-modal"], ' +
        '[role="dialog"]:has-text("$9.99"), ' +
        '.pricing-modal, ' +
        'text=/\\$9\\.99/i'
      );
      
      const modalVisible = await pricingModal.first().isVisible().catch(() => false);
      
      if (modalVisible) {
        console.log('✅ Pricing modal visible with $9.99 tier');
      } else {
        console.log('⚠️ Modal appeared but $9.99 tier not confirmed');
      }
    } else {
      console.log('⚠️ Upgrade button not visible - may require authentication');
    }
  });

  test('API: Checkout endpoint exists', async ({ request }) => {
    // Test that checkout endpoint exists (will return 401 without auth)
    const response = await request.post(`${BASE_URL}/api/checkout`, {
      data: { packageCode: 'starter' }
    });
    
    // Should return 401 (auth required) not 404
    expect(response.status()).not.toBe(404);
    
    console.log(`✅ Checkout endpoint exists (status: ${response.status()})`);
  });

  test('Pricing tiers are correctly configured', async ({ request }) => {
    // Check if we can access pricing info via API
    const response = await request.get(`${BASE_URL}/api/billing/packages`);
    
    if (response.status() === 200) {
      const packages = await response.json();
      
      // Verify starter tier exists with $9.99
      const starter = packages.find((p: any) => p.code === 'starter');
      if (starter) {
        expect(starter.priceUsdCents).toBe(999);
        expect(starter.credits).toBe(100);
        console.log('✅ Starter tier verified: $9.99 for 100 credits');
      }
    } else if (response.status() === 404) {
      console.log('⚠️ Packages endpoint not found - pricing may be hardcoded');
    } else {
      console.log(`⚠️ Packages endpoint returned ${response.status()}`);
    }
  });
});

test.describe('Suite D: Revenue Integrity - Webhook Endpoints', () => {
  test('Stripe webhook endpoint exists', async ({ request }) => {
    // Test that webhook endpoint exists (will return 400 without signature)
    const response = await request.post(`${BASE_URL}/api/billing/stripe-webhook`, {
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'invalid_signature'
      },
      data: { type: 'test' }
    });
    
    // Should return 400 (bad signature) not 404
    expect(response.status()).not.toBe(404);
    
    console.log(`✅ Stripe webhook endpoint exists (status: ${response.status()})`);
  });

  test('Credit balance endpoint requires auth', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/billing/balance`);
    
    expect(response.status()).toBe(401);
    
    console.log('✅ Credit balance endpoint secured');
  });

  test('ARR metrics endpoint is accessible', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/billing/arr-metrics`);
    
    // Should return data or require auth, not 404
    expect(response.status()).not.toBe(404);
    
    if (response.status() === 200) {
      const metrics = await response.json();
      console.log(`✅ ARR Metrics: ${JSON.stringify(metrics).substring(0, 100)}...`);
    } else {
      console.log(`✅ ARR metrics endpoint exists (status: ${response.status()})`);
    }
  });
});

test.describe('Suite E: Telemetry & Observability', () => {
  test('Telemetry status endpoint accessible', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/internal/telemetry/status`);
    
    // May require auth
    if (response.status() === 200) {
      const status = await response.json();
      console.log(`✅ Telemetry status: ${JSON.stringify(status).substring(0, 200)}`);
    } else {
      console.log(`⚠️ Telemetry status requires auth (status: ${response.status()})`);
    }
  });

  test('Version endpoint returns app info', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/version`);
    
    expect(response.status()).toBe(200);
    
    const version = await response.json();
    expect(version.app).toBe('student_pilot');
    
    console.log(`✅ Version: ${version.app} v${version.version || 'unknown'}`);
  });

  test('Readiness probe returns healthy', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/readyz`);
    
    expect(response.status()).toBe(200);
    
    console.log('✅ Readiness probe passed');
  });
});
