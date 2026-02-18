#!/usr/bin/env tsx
/**
 * Phase 4a: Add websiteSecret to Eyal's Website record.
 * Run backup first, then add secret. Exclusion stays in place.
 *
 * Run: npx tsx scripts/phase4a-eyal-website-secret.ts
 */
import { prisma } from '@/lib/db';
import { randomBytes } from 'crypto';

const EYAL_EMAIL = 'eyal@darksword-armory.com';

async function main() {
  console.log('\n🔐 Phase 4a: Add websiteSecret to Eyal\'s Website\n');
  console.log('⚠️  Run backup first: npx tsx scripts/phase0-backup-eyal-darksword.ts\n');

  const website = await prisma.website.findFirst({
    where: { user: { email: { equals: EYAL_EMAIL, mode: 'insensitive' } } },
    select: { id: true, name: true, websiteSecret: true },
  });

  if (!website) {
    console.error('❌ Eyal\'s website not found');
    process.exit(1);
  }

  if (website.websiteSecret) {
    console.log('✅ websiteSecret already set');
    console.log('   Website:', website.name);
    console.log('   ID:', website.id);
    return;
  }

  const secret = randomBytes(32).toString('hex');
  await prisma.website.update({
    where: { id: website.id },
    data: { websiteSecret: secret },
  });

  console.log('✅ websiteSecret added');
  console.log('   Website:', website.name);
  console.log('   ID:', website.id);
  console.log('\n📋 Add to Eyal\'s Vercel project (darksword-armory):');
  console.log(`   WEBSITE_SECRET=${secret}`);
  console.log('   NEXREL_CRM_URL=https://www.nexrel.soshogle.com');
  console.log(`   NEXREL_WEBSITE_ID=${website.id}`);
  console.log('\n⚠️  Run backup first: npx tsx scripts/phase0-backup-eyal-darksword.ts');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
