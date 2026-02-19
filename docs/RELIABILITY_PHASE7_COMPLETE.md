# Phase 7: E2E Tests for Critical Flows – Complete

## What Was Done

### 1. Playwright Configuration (`playwright.config.ts`)

- **baseURL:** `http://localhost:3000` (or `PLAYWRIGHT_BASE_URL`)
- **Projects:**
  - **setup** – Auth setup: logs in and saves storage state to `playwright/.auth/user.json`
  - **authenticated** – Uses storage state; runs `leads.spec.ts`, `hitl.spec.ts`
  - **auth-flow** – No storage state; runs `auth.spec.ts` (login flow)
  - **workflows** – Legacy workflow tests
- **webServer:** Starts `npm run dev` when not in CI; `reuseExistingServer: true` for local runs

### 2. Auth Setup (`tests/e2e/auth.setup.ts`)

- Requires `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` in env
- If not set: writes empty storage state so authenticated tests skip gracefully
- If set: logs in, waits for redirect to `/dashboard` or `/platform-admin`, saves cookies

### 3. Login Flow Tests (`tests/e2e/auth.spec.ts`)

- **Display sign-in page** – Verifies heading, email/password inputs, sign-in button
- **Invalid credentials** – Enters bad credentials, expects "Invalid credentials" and stays on signin
- **Valid login redirect** – Uses `TEST_USER_*` if set; skips otherwise; verifies redirect to dashboard

### 4. Create Lead Tests (`tests/e2e/leads.spec.ts`)

- **Display new lead form** – Verifies form fields and Create Lead button
- **Create lead and redirect** – Fills business name, contact, email; submits; expects redirect to lead detail
- **Validation error** – Submits with neither business nor contact; expects error message

### 5. HITL Tests (`tests/e2e/hitl.spec.ts`)

- **Workflows tab visible** – For Real Estate user, verifies workflows UI loads
- **HITL panel when pending** – Skips when no pending HITL (cannot seed in E2E); verifies approve button if present

### 6. Dependencies

- Added `@playwright/test` for the test runner
- `.gitignore` updated: `playwright/.auth/`, `test-results/`, `playwright-report/`

## How to Run

```bash
# Install browsers (first time only)
npx playwright install chromium

# Run all E2E tests (starts dev server if not running)
npm run test:e2e

# Run specific project
npx playwright test --project=auth-flow
npx playwright test --project=authenticated

# With test credentials for full coverage
TEST_USER_EMAIL=your@email.com TEST_USER_PASSWORD=yourpass npm run test:e2e
```

## Notes

- **Auth tests** run without credentials; the "redirect to dashboard" test skips if `TEST_USER_*` is unset
- **Leads and HITL tests** require auth; they skip when credentials are not provided
- **HITL approve** flow is hard to test end-to-end without seeding a pending workflow; the test verifies the UI when present
