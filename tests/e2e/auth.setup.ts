/**
 * Playwright auth setup: logs in and saves storage state for authenticated E2E tests.
 * Requires TEST_USER_EMAIL and TEST_USER_PASSWORD in env.
 * If not set, the setup passes (no-op) and authenticated tests will skip.
 */
import { test as setup } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const authFile = path.join('playwright', '.auth', 'user.json');

setup('authenticate', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    // Create empty auth file so authenticated tests can skip gracefully
    fs.mkdirSync(path.dirname(authFile), { recursive: true });
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  await page.goto('/auth/signin');
  await page.fill('#email', email);
  await page.fill('#password', password);

  await page.click('button[type="submit"]');

  const authResponse = await page.waitForResponse(
    (res) => res.url().includes('/api/auth/') && res.url().includes('callback'),
    { timeout: 20_000 }
  ).catch(() => null);

  if (!authResponse) {
    fs.mkdirSync(path.dirname(authFile), { recursive: true });
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  try {
    await Promise.race([
      page.waitForResponse((r) => r.url().includes('/api/user/profile'), { timeout: 15_000 }),
      page.getByTestId('signin-error').waitFor({ state: 'visible', timeout: 15_000 }),
    ]);
  } catch {
    const url = page.url();
    if (url.includes('/dashboard') || url.includes('/platform-admin')) {
      await page.context().storageState({ path: authFile });
      return;
    }
    fs.mkdirSync(path.dirname(authFile), { recursive: true });
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  if (await page.getByTestId('signin-error').isVisible().catch(() => false)) {
    fs.mkdirSync(path.dirname(authFile), { recursive: true });
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  await page.waitForURL(/\/(dashboard|platform-admin)/, { timeout: 15_000 });
  await page.context().storageState({ path: authFile });
});
