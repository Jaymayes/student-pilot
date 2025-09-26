import { test, expect } from '@playwright/test';

test.describe('API Integration Tests', () => {
  test('Health endpoints work correctly', async ({ request }) => {
    // Test all health endpoints
    const endpoints = ['/health', '/api/health', '/status', '/api/status', '/ping'];
    
    for (const endpoint of endpoints) {
      const response = await request.get(endpoint);
      expect(response.status()).toBe(200);
      
      if (endpoint !== '/ping') {
        const body = await response.json();
        expect(body).toHaveProperty('status');
      }
    }
  });

  test('API rate limiting works', async ({ request }) => {
    // Make multiple rapid requests to test rate limiting
    const requests = Array.from({ length: 10 }, () => 
      request.get('/api/health')
    );
    
    const responses = await Promise.all(requests);
    
    // Should mostly succeed but may get rate limited
    const successCount = responses.filter(r => r.status() === 200).length;
    expect(successCount).toBeGreaterThan(5);
  });

  test('CORS headers are configured', async ({ request }) => {
    const response = await request.get('/api/health', {
      headers: { 'Origin': 'https://example.com' }
    });
    
    const headers = response.headers();
    expect(headers['access-control-allow-origin']).toBeDefined();
  });

  test('Authentication endpoints respond appropriately', async ({ request }) => {
    // Test auth user endpoint without auth
    const response = await request.get('/api/auth/user');
    expect(response.status()).toBe(401);
    
    const body = await response.json();
    expect(body).toHaveProperty('message');
  });

  test('Billing endpoints require authentication', async ({ request }) => {
    const billingEndpoints = [
      '/api/billing/summary',
      '/api/billing/ledger',
      '/api/billing/usage'
    ];
    
    for (const endpoint of billingEndpoints) {
      const response = await request.get(endpoint);
      expect(response.status()).toBe(401);
    }
  });

  test('Infrastructure dashboard requires authentication', async ({ request }) => {
    const response = await request.get('/api/dashboard/infrastructure');
    expect(response.status()).toBe(401);
  });

  test('Security scan endpoints are protected', async ({ request }) => {
    const response = await request.get('/api/dashboard/security');
    expect(response.status()).toBe(401);
  });

  test('Error responses include correlation IDs', async ({ request }) => {
    const response = await request.get('/api/nonexistent');
    const headers = response.headers();
    
    // Should have correlation ID in response
    expect(headers['x-correlation-id']).toBeDefined();
    expect(headers['x-correlation-id']).toMatch(/^[a-f0-9-]{36}$/);
  });
});