/**
 * Set onboardingCompleted=true for Theodora (hides Onboarding Wizard from menu).
 * Run: npx tsx scripts/fix-theodora-onboarding.ts
 */
import 'dotenv/config';
import { prisma } from '@/lib/db';
import { getMetaDb } from '@/lib/db/meta-db';

const THEODORA_EMAIL = 'theodora.stavropoulos@remax-quebec.com';

async function main() {
  const user = await prisma.user.findUnique({ where: { email: THEODORA_EMAIL } });
  if (!user) {
    console.error('❌ User not found:', THEODORA_EMAIL);
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { onboardingCompleted: true },
  });
  console.log('✅ Main DB: onboardingCompleted=true');

  try {
    await getMetaDb().user.update({
      where: { id: user.id },
      data: { onboardingCompleted: true },
    });
    console.log('✅ Meta DB: onboardingCompleted=true');
  } catch {
    console.log('   (Meta DB skipped - may be same as main)');
  }

  console.log('\n📌 Theodora must sign out and sign back in to refresh the session.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
