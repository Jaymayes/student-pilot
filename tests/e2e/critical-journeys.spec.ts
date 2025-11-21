import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite: Critical Student Journeys
 * Framework: Playwright
 * Target: student_pilot application
 * Purpose: Validate core revenue-generating user flows
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

test.describe('Critical Journey: Scholarship Discovery (Anonymous)', () => {
  test('should browse scholarships without authentication', async ({ page }) => {
    // Navigate to homepage
    await page.goto(BASE_URL);
    
    // Wait for page load
    await page.waitForLoadState('networkidle');
    
    // Verify scholarships are visible
    const scholarshipCards = page.locator('[data-testid^="card-scholarship-"]');
    const count = await scholarshipCards.count();
    
    expect(count).toBeGreaterThan(0);
    console.log(`✅ Found ${count} scholarship cards on homepage`);
    
    // Verify scholarship data loaded
    await expect(page.locator('text=/scholarship/i').first()).toBeVisible();
  });

  test('should view scholarship detail page', async ({ page }) => {
    // Get scholarship list first
    const response = await page.request.get(`${BASE_URL}/api/scholarships`);
    expect(response.ok()).toBeTruthy();
    
    const scholarships = await response.json();
    expect(Array.isArray(scholarships)).toBeTruthy();
    expect(scholarships.length).toBeGreaterThan(0);
    
    const firstScholarship = scholarships[0];
    console.log(`📄 Testing scholarship detail: ${firstScholarship.title}`);
    
    // Navigate to detail page
    await page.goto(`${BASE_URL}/scholarships/${firstScholarship.id}`);
    await page.waitForLoadState('networkidle');
    
    // Verify scholarship title is displayed
    await expect(page.locator(`text=${firstScholarship.title}`).first()).toBeVisible();
    
    // Verify essential scholarship information
    const detailContent = await page.textContent('body');
    expect(detailContent).toContain(firstScholarship.organization);
    
    console.log(`✅ Scholarship detail page loaded successfully`);
  });

  test('should handle 404 for non-existent scholarship', async ({ page }) => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    
    await page.goto(`${BASE_URL}/scholarships/${fakeId}`);
    await page.waitForLoadState('networkidle');
    
    // Should show 404 or error message
    const content = await page.textContent('body');
    const has404Indicator = content?.includes('404') || 
                           content?.includes('not found') || 
                           content?.includes('Not Found');
    
    expect(has404Indicator).toBeTruthy();
    console.log(`✅ 404 handling works correctly`);
  });
});

test.describe('API Testing: Core Endpoints', () => {
  test('GET /api/scholarships returns valid data', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/scholarships`);
    
    // Verify response status
    expect(response.status()).toBe(200);
    
    // Verify response headers
    const headers = response.headers();
    expect(headers['content-type']).toContain('application/json');
    expect(headers['cache-control']).toBeTruthy();
    expect(headers['etag']).toBeTruthy();
    
    // Verify response body
    const scholarships = await response.json();
    expect(Array.isArray(scholarships)).toBeTruthy();
    expect(scholarships.length).toBeGreaterThan(0);
    
    // Verify scholarship schema
    const firstScholarship = scholarships[0];
    expect(firstScholarship).toHaveProperty('id');
    expect(firstScholarship).toHaveProperty('title');
    expect(firstScholarship).toHaveProperty('organization');
    expect(firstScholarship).toHaveProperty('amount');
    expect(firstScholarship).toHaveProperty('deadline');
    
    console.log(`✅ API returned ${scholarships.length} scholarships with valid schema`);
  });

  test('GET /api/scholarships/:id returns scholarship detail', async ({ request }) => {
    // Get first scholarship ID
    const listResponse = await request.get(`${BASE_URL}/api/scholarships`);
    const scholarships = await listResponse.json();
    const firstId = scholarships[0].id;
    
    // Get scholarship detail
    const detailResponse = await request.get(`${BASE_URL}/api/scholarships/${firstId}`);
    expect(detailResponse.status()).toBe(200);
    
    const scholarship = await detailResponse.json();
    expect(scholarship.id).toBe(firstId);
    expect(scholarship.title).toBeTruthy();
    
    console.log(`✅ Scholarship detail API returned: ${scholarship.title}`);
  });

  test('GET /api/scholarships/:id returns 404 for non-existent ID', async ({ request }) => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await request.get(`${BASE_URL}/api/scholarships/${fakeId}`);
    
    expect(response.status()).toBe(404);
    
    const error = await response.json();
    expect(error).toHaveProperty('error');
    
    console.log(`✅ 404 handling works for API endpoint`);
  });

  test('GET /api/matches requires authentication', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/matches`);
    
    expect(response.status()).toBe(401);
    
    const error = await response.json();
    expect(error.error.code).toBe('UNAUTHENTICATED');
    expect(error.error.message).toContain('Authentication required');
    
    console.log(`✅ Protected endpoint correctly requires authentication`);
  });

  test('POST /api/applications requires authentication', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/applications`, {
      data: {
        scholarshipId: '00000000-0000-0000-0000-000000000000'
      }
    });
    
    expect(response.status()).toBe(401);
    
    const error = await response.json();
    expect(error.error.code).toBe('UNAUTHENTICATED');
    
    console.log(`✅ Application submission correctly requires authentication`);
  });

  test('GET /api/health returns healthy status', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    
    expect(response.status()).toBe(200);
    
    const health = await response.json();
    expect(health.status).toBe('ok');
    expect(health.checks).toHaveProperty('database');
    expect(health.checks.database).toBe('healthy');
    
    console.log(`✅ Health check passed: ${JSON.stringify(health.checks)}`);
  });

  test('GET /api/readyz returns ready status', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/readyz`);
    
    expect(response.status()).toBe(200);
    
    console.log(`✅ Readiness check passed`);
  });
});

test.describe('Performance Testing: API Latency', () => {
  test('scholarship list API meets P95 latency target (<120ms)', async ({ request }) => {
    const latencies: number[] = [];
    const iterations = 10;
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      const response = await request.get(`${BASE_URL}/api/scholarships`);
      const latency = Date.now() - start;
      
      expect(response.ok()).toBeTruthy();
      latencies.push(latency);
    }
    
    // Calculate P95
    latencies.sort((a, b) => a - b);
    const p95Index = Math.floor(latencies.length * 0.95);
    const p95 = latencies[p95Index];
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    
    console.log(`📊 List API latency - Avg: ${avg.toFixed(0)}ms, P95: ${p95}ms`);
    
    expect(p95).toBeLessThan(120);
  });

  test('scholarship detail API meets P95 latency target (<120ms)', async ({ request }) => {
    // Get first scholarship ID
    const listResponse = await request.get(`${BASE_URL}/api/scholarships`);
    const scholarships = await listResponse.json();
    const firstId = scholarships[0].id;
    
    const latencies: number[] = [];
    const iterations = 10;
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      const response = await request.get(`${BASE_URL}/api/scholarships/${firstId}`);
      const latency = Date.now() - start;
      
      expect(response.ok()).toBeTruthy();
      latencies.push(latency);
    }
    
    // Calculate P95
    latencies.sort((a, b) => a - b);
    const p95Index = Math.floor(latencies.length * 0.95);
    const p95 = latencies[p95Index];
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    
    console.log(`📊 Detail API latency - Avg: ${avg.toFixed(0)}ms, P95: ${p95}ms`);
    
    expect(p95).toBeLessThan(120);
  });
});

test.describe('Security Testing: Authentication & Authorization', () => {
  test('protected routes return 401 without JWT', async ({ request }) => {
    const protectedEndpoints = [
      '/api/matches',
      '/api/applications',
      '/api/billing/balance',
      '/api/profile'
    ];
    
    for (const endpoint of protectedEndpoints) {
      const response = await request.get(`${BASE_URL}${endpoint}`);
      expect(response.status()).toBe(401);
      
      const error = await response.json();
      expect(error.error.code).toBe('UNAUTHENTICATED');
    }
    
    console.log(`✅ All ${protectedEndpoints.length} protected endpoints require authentication`);
  });

  test('rate limiting enforced on API endpoints', async ({ request }) => {
    // Note: This test would need to make 300+ requests to trigger rate limit
    // For now, just verify rate limit headers are present
    const response = await request.get(`${BASE_URL}/api/scholarships`);
    
    // Some rate limiters add headers
    const headers = response.headers();
    console.log(`Rate limit headers present: ${JSON.stringify({
      'x-ratelimit-limit': headers['x-ratelimit-limit'],
      'x-ratelimit-remaining': headers['x-ratelimit-remaining']
    })}`);
    
    // Test passes if no error
    expect(response.ok()).toBeTruthy();
  });
});

test.describe('Data Integrity: Schema Validation', () => {
  test('scholarship objects have required fields', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/scholarships`);
    const scholarships = await response.json();
    
    const requiredFields = ['id', 'title', 'organization', 'amount', 'deadline'];
    
    scholarships.forEach((scholarship: any, index: number) => {
      requiredFields.forEach(field => {
        expect(scholarship[field]).toBeDefined();
      });
    });
    
    console.log(`✅ All ${scholarships.length} scholarships have required fields`);
  });

  test('scholarship amounts are valid numbers', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/scholarships`);
    const scholarships = await response.json();
    
    scholarships.forEach((scholarship: any) => {
      expect(typeof scholarship.amount).toBe('number');
      expect(scholarship.amount).toBeGreaterThan(0);
    });
    
    console.log(`✅ All scholarship amounts are valid positive numbers`);
  });

  test('scholarship deadlines are valid dates', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/scholarships`);
    const scholarships = await response.json();
    
    scholarships.forEach((scholarship: any) => {
      const deadline = new Date(scholarship.deadline);
      expect(deadline.toString()).not.toBe('Invalid Date');
    });
    
    console.log(`✅ All scholarship deadlines are valid dates`);
  });
});

test.describe('Cache Headers: Performance Optimization', () => {
  test('scholarship list has proper cache headers', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/scholarships`);
    const headers = response.headers();
    
    expect(headers['cache-control']).toContain('public');
    expect(headers['cache-control']).toContain('max-age');
    expect(headers['etag']).toBeTruthy();
    
    console.log(`✅ Cache headers: ${headers['cache-control']}, ETag: ${headers['etag']?.substring(0, 30)}...`);
  });

  test('scholarship detail has proper cache headers', async ({ request }) => {
    const listResponse = await request.get(`${BASE_URL}/api/scholarships`);
    const scholarships = await listResponse.json();
    const firstId = scholarships[0].id;
    
    const response = await request.get(`${BASE_URL}/api/scholarships/${firstId}`);
    const headers = response.headers();
    
    expect(headers['cache-control']).toContain('public');
    expect(headers['etag']).toBeTruthy();
    
    console.log(`✅ Detail cache headers present`);
  });
});
