import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

// Load .env.local for TEST_USER_* (avoids shell escaping issues with special chars in password)
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Auth setup: log in and save storage state for authenticated tests
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: undefined,
    },
    // Authenticated tests (create lead, HITL) - depend on setup
    {
      name: 'authenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
      testMatch: /(leads|hitl)\.spec\.ts/,
    },
    // Unauthenticated tests (login flow) - no storage state
    {
      name: 'auth-flow',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /auth\.spec\.ts/,
    },
    // Legacy workflow tests - require auth + Real Estate user
    {
      name: 'workflows',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
      testMatch: /workflows\.spec\.ts/,
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ...process.env,
          NEXTAUTH_URL: baseURL, // Required for auth to work on localhost
        },
      },
});
