/**
 * E2E tests for create lead flow (Phase 7 - Reliability)
 * Requires authenticated session (TEST_USER_EMAIL, TEST_USER_PASSWORD).
 */
import { test, expect } from '@playwright/test';

test.describe('Create lead', () => {
  test.beforeEach(async ({ page }) => {
    const hasAuth = process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD;
    if (!hasAuth) test.skip();
    await page.goto('/dashboard/leads/new');
    // Skip if redirected to signin (auth setup failed)
    if (page.url().includes('/auth/signin')) test.skip();
  });

  test('should display new lead form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /add new lead/i })).toBeVisible();
    await expect(page.locator('#businessName')).toBeVisible();
    await expect(page.locator('#contactPerson')).toBeVisible();
    await expect(page.getByRole('button', { name: /create lead/i })).toBeVisible();
  });

  test('should create lead and redirect to lead detail', async ({ page }) => {
    const timestamp = Date.now();
    const businessName = `E2E Test Business ${timestamp}`;
    const contactPerson = `Test Contact ${timestamp}`;

    await page.fill('#businessName', businessName);
    await page.fill('#contactPerson', contactPerson);
    await page.fill('#email', `e2e-${timestamp}@example.com`);

    await page.click('button[type="submit"]');

    // Should redirect to lead detail page
    await expect(page).toHaveURL(/\/dashboard\/leads\/[^/]+$/, { timeout: 15_000 });
    // Verify lead detail page loaded - look for business name, contact, or lead UI (Back to Leads, Edit, etc.)
    await expect(
      page.getByText(businessName).or(page.getByText(contactPerson)).or(page.getByRole('link', { name: /back to leads/i }))
    ).toBeVisible({ timeout: 10_000 });
  });

  test('should show error when neither business nor contact provided', async ({ page }) => {
    // Leave businessName and contactPerson empty
    await page.fill('#email', 'test@example.com');
    await page.click('button[type="submit"]');

    await expect(page.getByText(/business name or contact person/i)).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL(/\/dashboard\/leads\/new/);
  });
});
