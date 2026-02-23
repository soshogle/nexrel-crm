/**
 * Fix orthodontist user industry - sets industry to ORTHODONTIST if null/empty.
 * Updates main DB, meta DB (auth), and orthodontist DB (if configured).
 * Run: npx tsx scripts/fix-orthodontist-industry.ts
 */
import { PrismaClient } from '@prisma/client';

const mainPrisma = new PrismaClient();

function getPrismaForEnv(envVar: string): PrismaClient | null {
  const url = process.env[envVar];
  if (!url) return null;
  return new PrismaClient({
    datasources: { db: { url } },
  });
}

async function fixUserInDb(
  prisma: PrismaClient,
  dbName: string
): Promise<{ updated: boolean; user: { id: string; email: string | null; name: string | null; industry: string | null } | null }> {
  const email = 'orthodontist@nexrel.com';
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, industry: true },
  });

  if (!user) {
    console.log(`   ⚠️  User not found in ${dbName}`);
    return { updated: false, user: null };
  }

  // Skip if already ORTHODONTIST
  if (user.industry === 'ORTHODONTIST') {
    return { updated: false, user };
  }

  // Set industry to ORTHODONTIST (meta DB may have DENTIST from create-orthodontist-admin script)
  await prisma.user.update({
    where: { id: user.id },
    data: { industry: 'ORTHODONTIST' },
  });
  return { updated: true, user };
}

async function main() {
  const email = 'orthodontist@nexrel.com';
  console.log('🔧 Fixing orthodontist user industry...\n');

  // 1. Main DB (DATABASE_URL)
  const mainResult = await fixUserInDb(mainPrisma, 'main DB');
  if (!mainResult.user) {
    console.log('❌ User not found in main DB:', email);
    process.exit(1);
  }
  if (mainResult.updated) {
    console.log('✅ Updated industry to ORTHODONTIST in main DB');
  } else {
    console.log('✅ Main DB: User already has industry:', mainResult.user.industry);
  }

  // 2. Meta DB (auth - DATABASE_URL_META) - session/industry comes from here
  const metaPrisma = getPrismaForEnv('DATABASE_URL_META');
  if (metaPrisma) {
    try {
      const metaResult = await fixUserInDb(metaPrisma, 'meta DB (auth)');
      if (metaResult.updated) {
        console.log('✅ Updated industry to ORTHODONTIST in meta DB (auth)');
      } else if (metaResult.user) {
        console.log('✅ Meta DB: User already has industry:', metaResult.user.industry);
      }
    } catch (e: any) {
      console.log('   ⚠️  Meta DB update skipped:', e?.message?.slice(0, 60) || 'schema mismatch');
    }
    await metaPrisma.$disconnect();
  }

  // 3. Orthodontist DB (if DATABASE_URL_ORTHODONTIST is set)
  const orthoPrisma = getPrismaForEnv('DATABASE_URL_ORTHODONTIST');
  if (orthoPrisma) {
    const orthoResult = await fixUserInDb(orthoPrisma, 'orthodontist DB');
    if (orthoResult.updated) {
      console.log('✅ Updated industry to ORTHODONTIST in orthodontist DB');
    } else if (orthoResult.user) {
      console.log('✅ Orthodontist DB: User already has industry:', orthoResult.user.industry);
    }
    await orthoPrisma.$disconnect();
  } else {
    console.log('   (DATABASE_URL_ORTHODONTIST not set - skipping orthodontist DB)');
  }

  console.log('\n📌 Next steps:');
  console.log('   1. Sign out and sign back in (to refresh your session token)');
  console.log('   2. Click Workflows again');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => mainPrisma.$disconnect());
