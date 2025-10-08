# E2E Test Mode Documentation

## Overview

ScholarLink implements a comprehensive test mode that ensures clean React Query cache state during automated end-to-end testing. This prevents test flakiness caused by stale error states persisting across test runs.

## Activation

### Method 1: URL Parameter (Recommended for Playwright)
```typescript
// Navigate with ?e2e=1 parameter
await page.goto('https://scholarlink.replit.app/?e2e=1');
```

### Method 2: Environment Variable
```bash
# Set environment variable
export VITE_E2E_MODE=1

# Or in .env file
VITE_E2E_MODE=1
```

## Behavior in Test Mode

When test mode is active, the following changes occur:

### 1. Automatic Cache Clearing
- `queryClient.clear()` is called on app initialization
- Console log emitted: `[E2E] React Query cache cleared - test mode active`

### 2. Query Configuration Override
```typescript
{
  staleTime: 0,              // No caching - always fetch fresh data
  gcTime: 0,                 // Immediate garbage collection
  refetchOnMount: 'always',  // Always refetch when component mounts
  refetchOnWindowFocus: 'always', // Always refetch on window focus
  retry: false,              // No retries for faster test feedback
  networkMode: 'always',     // Bypass offline mode checks
}
```

### 3. Manual Cache Reset API
```typescript
// Available globally in test mode
window.E2E.resetRQ();  // Clears all queries and invalidates cache

// Also accessible
window.E2E.queryClient // Direct access to QueryClient instance
```

### 4. Server-Side Cache Headers
Test mode triggers aggressive no-cache headers on critical endpoints:
```
Cache-Control: no-store, no-cache, must-revalidate, private
Pragma: no-cache
Expires: 0
```

## Integration with Playwright

### Basic Usage
```typescript
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Navigate with test mode enabled
  await page.goto('/?e2e=1');
  
  // Wait for test mode confirmation
  await page.waitForFunction(() => {
    return window.console.log.toString().includes('[E2E] React Query cache cleared');
  });
});

test('dashboard loads fresh data', async ({ page }) => {
  // Perform OIDC login
  await page.evaluate(() => {
    window.setNextOIDCLoginClaims({
      sub: 'test-user-123',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User'
    });
  });
  
  await page.click('[data-testid="button-login"]');
  
  // Dashboard should load with fresh data
  await expect(page.locator('[data-testid="ttv-dashboard"]')).not.toContainText('Failed to load');
});
```

### Manual Cache Reset During Test
```typescript
test('can reset cache mid-test', async ({ page }) => {
  // Some test steps...
  
  // Manually reset cache if needed
  await page.evaluate(() => window.E2E?.resetRQ());
  
  // Continue testing with clean cache
});
```

### Checking Test Mode Status
```typescript
test('verify test mode is active', async ({ page }) => {
  await page.goto('/?e2e=1');
  
  const isTestMode = await page.evaluate(() => {
    return !!window.E2E;
  });
  
  expect(isTestMode).toBe(true);
});
```

## Analytics Exclusion

### User-Agent Tagging
All synthetic monitoring requests should use:
```
User-Agent: ScholarshipAI-Canary/1.0
```

### Query Parameter Detection
The `?e2e=1` parameter can be used to exclude test traffic from analytics:

```typescript
// Analytics exclusion logic
if (new URLSearchParams(window.location.search).has('e2e')) {
  console.log('Test mode detected - skipping analytics');
  return;
}
```

## Canary Deployment Integration

### Synthetic Monitor Configuration
```typescript
const CONFIG = {
  baseUrl: 'https://scholarlink.replit.app',
  userAgent: 'ScholarshipAI-Canary/1.0',
  testModeParam: '?e2e=1', // Always append to avoid analytics pollution
};
```

### CI/CD Environment Variables
```yaml
# .github/workflows/canary.yml
env:
  VITE_E2E_MODE: '1'
  PLAYWRIGHT_TEST_MODE: 'true'
```

## Troubleshooting

### Test Mode Not Activating
1. Verify URL parameter is present: `window.location.search.includes('e2e=1')`
2. Check console for activation log: `[E2E] React Query cache cleared - test mode active`
3. Verify `window.E2E` is defined: `console.log(window.E2E)`

### Stale Data Still Appearing
1. Call manual reset: `await page.evaluate(() => window.E2E?.resetRQ())`
2. Force navigation reload: `await page.goto('/?e2e=1', { waitUntil: 'networkidle' })`
3. Clear browser storage: `await context.clearCookies()`

### Cache Headers Not Applied
- Verify server logs show endpoints with `Cache-Control: no-store`
- Check response headers in browser DevTools
- Confirm ETag is disabled: `app.disable('etag')` in server config

## Security Considerations

**Test mode should NOT be available in production.** Implement feature flag:

```typescript
// Only enable in development/staging
const isTestMode = (
  (new URLSearchParams(window.location.search).has('e2e') || 
   import.meta.env.VITE_E2E_MODE === '1') &&
  import.meta.env.MODE !== 'production'
);
```

## Performance Impact

Test mode introduces intentional performance overhead:
- ❌ No query caching (all requests hit network)
- ❌ No request deduplication
- ❌ Increased network traffic

**Do not use test mode for performance benchmarking.**

## Summary

✅ **Activation**: `?e2e=1` URL parameter or `VITE_E2E_MODE=1`  
✅ **Auto-clearing**: Cache cleared on mount  
✅ **Manual reset**: `window.E2E.resetRQ()`  
✅ **Fresh data**: `staleTime: 0`, `refetchOnMount: 'always'`  
✅ **Analytics safe**: Exclude via user-agent and URL param  
✅ **Production safe**: Feature flag to disable in prod  

**Code Location**: `client/src/lib/queryClient.ts` (lines 59-121)
