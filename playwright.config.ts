import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  webServer: [
    {
      command: 'pnpm dev:api',
      url: 'http://localhost:4000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 90000,
    },
    {
      command: 'pnpm dev:web',
      url: 'http://localhost:3000/en',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  expect: { timeout: 10000 },
  reporter: 'list',
  use: {
    baseURL: process.env.BROWSER_BASE_URL ?? 'http://localhost:3000',
    channel: 'chrome',
    trace: 'off',
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: [
        '**/publication.spec.ts',
        '**/seo.spec.ts',
        '**/academy.spec.ts',
      ],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'tablet',
      testIgnore: [
        '**/publication.spec.ts',
        '**/seo.spec.ts',
        '**/academy.spec.ts',
      ],
      use: { viewport: { width: 820, height: 1180 } },
    },
    {
      name: 'mobile',
      testIgnore: [
        '**/publication.spec.ts',
        '**/seo.spec.ts',
        '**/academy.spec.ts',
      ],
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
    },
    {
      name: 'integration',
      testMatch: [
        '**/publication.spec.ts',
        '**/seo.spec.ts',
        '**/academy.spec.ts',
      ],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
