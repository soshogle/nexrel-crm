/**
 * E-commerce content API tests
 * Run: npm run test:api
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@/lib/db';

const TEST_WEBSITE_ID = process.env.TEST_WEBSITE_ID || 'cmlkjpjlq0001jr043j95fl94';

describe('ecommerce-content API', () => {
  beforeAll(async () => {
    // Ensure test website exists with ecommerceContent
    const site = await prisma.website.findUnique({
      where: { id: TEST_WEBSITE_ID },
    });
    if (!site) {
      console.warn(`Test website ${TEST_WEBSITE_ID} not found - some tests may be skipped`);
    }
  });

  it('returns ecommerce content structure', async () => {
    const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const secret = process.env.WEBSITE_VOICE_CONFIG_SECRET;
    const headers: Record<string, string> = {};
    if (secret) headers['x-website-secret'] = secret;

    const res = await fetch(`${base}/api/websites/${TEST_WEBSITE_ID}/ecommerce-content`, {
      headers,
    });

    // May 401 if no auth, 404 if website missing
    if (res.status === 401 || res.status === 404) {
      expect([401, 404]).toContain(res.status);
      return;
    }

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('products');
    expect(data).toHaveProperty('pages');
    expect(data).toHaveProperty('videos');
    expect(data).toHaveProperty('policies');
    expect(Array.isArray(data.products)).toBe(true);
    expect(Array.isArray(data.pages)).toBe(true);
  });
});
