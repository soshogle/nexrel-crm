#!/usr/bin/env tsx
/**
 * Remove Darksword Armory ecommerce content from the orthodontist's "darksword" website.
 * That content was incorrectly seeded there; it belongs to Eyal's Darksword Armory.
 * Run: npx tsx scripts/remove-darksword-from-orthodontist.ts
 */
import { prisma } from '@/lib/db';

async function main() {
  const website = await prisma.website.findFirst({
    where: {
      user: {
        email: { equals: 'orthodontist@nexrel.com', mode: 'insensitive' },
      },
      name: { contains: 'darksword', mode: 'insensitive' },
    },
    include: { user: { select: { email: true } } },
  });

  if (!website) {
    console.log('\n   No orthodontist darksword website found. Nothing to remove.\n');
    return;
  }

  const hadContent = !!(website.ecommerceContent as Record<string, unknown>)?.pages;
  if (!hadContent) {
    console.log('\n   Orthodontist darksword site has no ecommerce content. Nothing to remove.\n');
    return;
  }

  await prisma.website.update({
    where: { id: website.id },
    data: { ecommerceContent: null },
  });

  console.log('\n✅ Removed Darksword Armory ecommerce content from orthodontist site');
  console.log('   Website:', website.name, `(${website.id})`);
  console.log('   Owner:', website.user?.email);
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
