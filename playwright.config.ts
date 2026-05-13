import { defineConfig, devices } from '@playwright/test';

// E2E suite for the live dev deploy. Tests are read-mostly: they verify the
// UI renders correctly per role, the menu filters correctly server-side, the
// Dashboard Inbox shows the right sections, and detail pages gate ActionBar
// buttons by role. Mutations are deliberately out of scope for the first
// pass — read-only assertions catch most gaps without polluting shared
// backend data.
//
// Run: `npx playwright test`
// Single suite: `npx playwright test tests/e2e/role-rbac.spec.ts`
// HTML report: `npx playwright show-report`

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://keystone-ui-dev.anairacloud.com';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
