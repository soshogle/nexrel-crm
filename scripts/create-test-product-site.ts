/**
 * Create a test PRODUCT site to verify end-to-end provisioning.
 * Uses internal API with NEXTAUTH_SECRET.
 *
 * Run: npx tsx scripts/create-test-product-site.ts
 * Optional: TEST_USER_ID=xxx (user with 0 websites)
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function main() {
  const baseUrl = process.env.TEST_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const secret = process.env.NEXTAUTH_SECRET;
  const userId = process.env.TEST_USER_ID;

  if (!secret) {
    console.error('❌ NEXTAUTH_SECRET required');
    process.exit(1);
  }

  if (!userId) {
    console.error('❌ TEST_USER_ID required');
    console.log('   Set TEST_USER_ID to a user ID with 0 websites (create API allows one per user).');
    console.log('   Example: TEST_USER_ID=clxxx TEST_BASE_URL=http://localhost:3000 npx tsx scripts/create-test-product-site.ts');
    process.exit(1);
  }

  console.log(`Using user ID: ${userId}\n`);

  const res = await fetch(`${baseUrl}/api/website-builder/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': secret,
    },
    body: JSON.stringify({
      name: 'Test Product Store',
      type: 'PRODUCT_TEMPLATE',
      templateType: 'PRODUCT',
      questionnaireAnswers: {
        businessName: 'Test Product Store',
        businessDescription: 'A test ecommerce site for provisioning verification',
        products: ['Test Product 1', 'Test Product 2'],
      },
      enableVoiceAI: false,
      _internalUserId: userId,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error('❌ Create failed:', data.error || res.statusText);
    process.exit(1);
  }

  console.log('✅ Website created:', data.website?.name);
  console.log('   ID:', data.website?.id);
  console.log('   Status:', data.website?.status);
  console.log('\nBuild is running in background. Check dashboard for progress.');
  console.log(`   ${baseUrl}/dashboard/websites/${data.website?.id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
