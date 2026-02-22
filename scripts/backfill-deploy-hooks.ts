/**
 * Backfill vercelDeployHookUrl for existing websites that have vercelProjectId.
 * Run once to enable auto-deploy for sites created before deploy hook automation.
 *
 * Usage: npx tsx scripts/backfill-deploy-hooks.ts
 */
import { prisma } from '../lib/db';
import { createOrFetchDeployHook } from '../lib/website-builder/deploy-hook';

async function main() {
  const websites = await prisma.website.findMany({
    where: {
      vercelProjectId: { not: null },
      vercelDeployHookUrl: null,
    },
    select: { id: true, name: true, vercelProjectId: true },
  });

  console.log(`Found ${websites.length} website(s) with vercelProjectId but no deploy hook.\n`);

  for (const w of websites) {
    const projectId = w.vercelProjectId as string;
    if (!projectId) continue;

    process.stdout.write(`${w.name} (${w.id})... `);
    try {
      const url = await createOrFetchDeployHook(projectId);
      if (url) {
        await prisma.website.update({
          where: { id: w.id },
          data: { vercelDeployHookUrl: url },
        });
        console.log('✅ Deploy hook created and saved');
      } else {
        console.log('⚠️  Could not create or fetch deploy hook (Vercel API may not support it)');
      }
    } catch (e: any) {
      console.log(`❌ ${e?.message || 'Failed'}`);
    }
  }

  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
