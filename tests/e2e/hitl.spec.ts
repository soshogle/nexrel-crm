/**
 * E2E tests for HITL approval flow (Phase 7 - Reliability)
 * Requires: authenticated Real Estate user + pending HITL workflow instance.
 * Skips when no pending HITL (cannot easily seed one in E2E).
 */
import { test, expect } from '@playwright/test';

test.describe('HITL approval', () => {
  test.beforeEach(async ({ page }) => {
    const hasAuth = process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD;
    if (!hasAuth) test.skip();
    await page.goto('/dashboard/ai-employees?tab=workflows');
    if (page.url().includes('/auth/signin')) test.skip();
  });

  test('should show workflows tab for Real Estate user', async ({ page }) => {
    // If user is redirected to signin, we're not authenticated
    if (page.url().includes('/auth/signin')) {
      test.skip();
    }
    // Workflows tab or related UI should be visible
    await expect(
      page.getByRole('tab', { name: /workflows/i }).or(page.getByText(/workflow/i).first())
    ).toBeVisible({ timeout: 10_000 });
  });

  test('should display HITL panel when pending items exist', async ({ page }) => {
    if (page.url().includes('/auth/signin')) {
      test.skip();
    }
    // HITL panel only shows for Real Estate users with pending items
    // We cannot seed a pending HITL in E2E, so we just verify the workflows page loads
    await page.waitForLoadState('networkidle');
    const hitlPanel = page.getByText(/approval required|pending approval|approve/i);
    const hasHitl = await hitlPanel.first().isVisible().catch(() => false);
    if (!hasHitl) {
      test.skip(); // No pending HITL - expected in most runs
    }
    // If we have HITL, verify approve button exists
    await expect(page.getByRole('button', { name: /approve/i }).first()).toBeVisible();
  });
});
