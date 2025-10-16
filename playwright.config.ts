import { defineConfig, devices } from '@playwright/test';

// Test environment variables can be passed via command line or .env file
// Use: AUTH_URL=... STUDENT_URL=... npx playwright test

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Increased timeout for E2E auth flows with Replit latencies
  timeout: 90_000,
  expect: { timeout: 15_000 },
  
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['list'] // Better console output
  ],
  
  use: {
    baseURL: 'http://localhost:5000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // E2E specific settings
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  
  projects: [
    // E2E Auth tests only need to run on Chromium for speed
    {
      name: 'chromium-e2e',
      testMatch: /auth\.e2e\.spec\.ts/,
      use: { 
        ...devices['Desktop Chrome'],
        // Preserve cookies/session for SSO testing
        contextOptions: {
          ignoreHTTPSErrors: true,
        }
      },
    },
    
    // Other tests can run on all browsers
    {
      name: 'chromium',
      testIgnore: /auth\.e2e\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testIgnore: /auth\.e2e\.spec\.ts/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testIgnore: /auth\.e2e\.spec\.ts/,
      use: { ...devices['Desktop Safari'] },
    },
  ],
  
  // Only start local server for non-E2E tests
  webServer: process.env.AUTH_URL ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
  },
});