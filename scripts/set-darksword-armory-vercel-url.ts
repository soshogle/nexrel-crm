#!/usr/bin/env tsx
/**
 * Set vercelDeploymentUrl for Eyal's Darksword Armory website.
 * Run: npx tsx scripts/set-darksword-armory-vercel-url.ts
 */
import { prisma } from '@/lib/db';

const DARKSWORD_ARMORY_VERCEL_URL = 'https://darksword-armory.vercel.app';

async function main() {
  const website = await prisma.website.findFirst({
    where: {
      user: {
        email: { equals: 'eyal@darksword-armory.com', mode: 'insensitive' },
      },
    },
    include: { user: { select: { email: true, name: true } } },
  });

  if (!website) {
    console.error('\n❌ Eyal\'s Darksword Armory website not found.');
    console.error('   Run: npx tsx scripts/create-darksword-admin-and-website.ts');
    process.exit(1);
  }

  await prisma.website.update({
    where: { id: website.id },
    data: { vercelDeploymentUrl: DARKSWORD_ARMORY_VERCEL_URL },
  });

  console.log('\n✅ Updated vercelDeploymentUrl for Darksword Armory');
  console.log('   Website:', website.name);
  console.log('   ID:', website.id);
  console.log('   Owner:', website.user?.email);
  console.log('   URL:', DARKSWORD_ARMORY_VERCEL_URL);
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
