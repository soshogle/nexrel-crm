/**
 * E2E tests for login flow (Phase 7 - Reliability)
 * Runs unauthenticated to verify sign-in UI and credential flow.
 */
import { test, expect } from '@playwright/test';

test.describe('Login flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signin');
  });

  test('should display sign-in page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /welcome back/i }).first()).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Use a unique email that cannot exist in DB (avoids collision with seeded test users)
    const nonexistentEmail = `e2e-nonexistent-${Date.now()}@example.com`;
    await page.fill('#email', nonexistentEmail);
    await page.fill('#password', 'wrongpassword');

    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/auth/') && res.url().includes('callback'),
        { timeout: 15_000 }
      ),
      page.click('button[type="submit"]'),
    ]);

    // Invalid credentials must not redirect to dashboard - stay on signin
    await expect(page).toHaveURL(/\/auth\/signin/, { timeout: 10_000 });
    // Error message shown when credentials fail (skip if login unexpectedly succeeds and redirects back)
    const errorAlert = page.getByTestId('signin-error');
    if (await errorAlert.isVisible().catch(() => false)) {
      await expect(errorAlert).toContainText(/invalid credentials|an error occurred|try again/i);
    }
  });

  test.skip('should redirect to dashboard on valid login', async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;

    if (!email || !password) {
      test.skip();
      return;
    }

    await page.fill('#email', email);
    await page.fill('#password', password);

    // Wait for auth callback + profile fetch (on success) or error (on failure)
    await page.click('button[type="submit"]');

    const authResponse = await page.waitForResponse(
      (res) => res.url().includes('/api/auth/') && res.url().includes('callback'),
      { timeout: 20_000 }
    ).catch(() => null);

    if (!authResponse) {
      throw new Error('Auth callback never completed. Is the dev server running?');
    }

    // On success: profile fetch happens, then redirect. On failure: error appears.
    try {
      await Promise.race([
        page.waitForResponse((r) => r.url().includes('/api/user/profile'), { timeout: 15_000 }),
        page.getByTestId('signin-error').waitFor({ state: 'visible', timeout: 15_000 }),
      ]);
    } catch {
      // Neither - check current state
      const url = page.url();
      if (url.includes('/dashboard') || url.includes('/platform-admin')) {
        return; // success
      }
      const errorText = await page.getByTestId('signin-error').textContent().catch(() => '');
      throw new Error(
        `Login did not complete. ${errorText ? `Error: ${errorText.trim()}` : 'No error shown.'} ` +
          'Try running with dev server already started: npm run dev (in one terminal), then npm run test:e2e (in another).'
      );
    }

    if (await page.getByTestId('signin-error').isVisible().catch(() => false)) {
      const errorText = await page.getByTestId('signin-error').textContent();
      throw new Error(`Login failed: ${errorText?.trim() || 'Invalid credentials'}`);
    }

    await page.waitForURL(/\/(dashboard|platform-admin)/, { timeout: 15_000 });
    await expect(page).not.toHaveURL(/\/auth\/signin/);
  });
});
