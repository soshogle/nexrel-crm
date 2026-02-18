#!/usr/bin/env tsx
/**
 * List all Darksword-related websites in the database.
 * Run: npx tsx scripts/list-darksword-websites.ts
 */
import { prisma } from '@/lib/db';

async function main() {
  const websites = await prisma.website.findMany({
    where: {
      OR: [
        { name: { contains: 'darksword', mode: 'insensitive' } },
        { vercelDeploymentUrl: { contains: 'darksword', mode: 'insensitive' } },
        {
          user: {
            email: { contains: 'darksword', mode: 'insensitive' },
          },
        },
      ],
    },
    include: {
      user: { select: { email: true, name: true } },
    },
    orderBy: { name: 'asc' },
  });

  console.log('\n📋 Darksword-related websites in CRM:\n');
  if (websites.length === 0) {
    console.log('   None found.\n');
    return;
  }

  for (const w of websites) {
    const hasEcommerce = !!(w.ecommerceContent as Record<string, unknown>)?.pages;
    const pageCount = Array.isArray((w.ecommerceContent as any)?.pages)
      ? (w.ecommerceContent as any).pages.length
      : 0;
    const productCount = Array.isArray((w.ecommerceContent as any)?.products)
      ? (w.ecommerceContent as any).products.length
      : 0;

    console.log(`   ${w.name}`);
    console.log(`   ID:        ${w.id}`);
    console.log(`   Owner:     ${w.user?.email} (${w.user?.name || '—'})`);
    console.log(`   Type:      ${w.type} / ${w.templateType || '—'}`);
    console.log(`   Deploy:    ${w.vercelDeploymentUrl || '(not set)'}`);
    console.log(`   Ecommerce: ${hasEcommerce ? `${productCount} products, ${pageCount} pages` : 'none'}`);
    console.log('');
  }

  const target = 'https://darksword-armory.vercel.app';
  const match = websites.find(
    (w) =>
      w.vercelDeploymentUrl?.toLowerCase().includes('darksword-armory.vercel.app') ||
      w.vercelDeploymentUrl === target
  );
  if (match) {
    console.log(`✅ Website matching ${target}: ${match.name} (${match.id})\n`);
  } else {
    console.log(`⚠️  No website has vercelDeploymentUrl = ${target}`);
    console.log('   The live site may be deployed outside the CRM, or the URL is not stored.\n');
  }
}

main().catch(console.error);
