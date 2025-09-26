import { test, expect } from '@playwright/test';

test.describe('ScholarLink Critical User Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
  });

  test('Homepage loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/ScholarLink/);
    
    // Check for critical UI elements
    await expect(page.locator('[data-testid="main-navigation"]')).toBeVisible();
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
  });

  test('Authentication flow works', async ({ page }) => {
    // Click login button
    await page.click('[data-testid="login-button"]');
    
    // Should redirect to auth flow
    await expect(page.url()).toContain('auth');
    
    // Mock successful auth return
    await page.goto('/?auth=success');
    
    // Should show authenticated state
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('Health endpoints return 200', async ({ page }) => {
    const healthResponse = await page.request.get('/health');
    expect(healthResponse.status()).toBe(200);
    
    const apiHealthResponse = await page.request.get('/api/health');
    expect(apiHealthResponse.status()).toBe(200);
    
    const statusResponse = await page.request.get('/status');
    expect(statusResponse.status()).toBe(200);
  });

  test('Dashboard loads for authenticated users', async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'mock-token');
    });
    
    await page.goto('/dashboard');
    
    // Check dashboard elements
    await expect(page.locator('[data-testid="dashboard-stats"]')).toBeVisible();
    await expect(page.locator('[data-testid="dashboard-navigation"]')).toBeVisible();
  });

  test('API error handling works correctly', async ({ page }) => {
    const response = await page.request.get('/api/nonexistent');
    expect(response.status()).toBe(404);
    
    // Test rate limiting doesn't break normal requests
    const normalResponse = await page.request.get('/api/health');
    expect(normalResponse.status()).toBe(200);
  });

  test('Performance: Critical pages load under 3s', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000);
  });

  test('Security headers are present', async ({ page }) => {
    const response = await page.request.get('/');
    
    const headers = response.headers();
    expect(headers['x-frame-options']).toBeDefined();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['strict-transport-security']).toBeDefined();
    expect(headers['content-security-policy']).toBeDefined();
  });

  test('CSRF protection is active', async ({ page }) => {
    // Try to make a POST request without proper headers
    const response = await page.request.post('/api/test', {
      data: { test: 'data' },
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Should get rejected by CSRF protection or auth
    expect([401, 403, 422]).toContain(response.status());
  });
});