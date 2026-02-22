/**
 * Check deploy config for all websites. Shows vercelProjectId, vercelDeployHookUrl,
 * and whether auto-deploy will work.
 *
 * Usage: npx tsx scripts/check-website-deploy-config.ts
 */
import { prisma } from '../lib/db';

async function main() {
  const websites = await prisma.website.findMany({
    select: { id: true, name: true, vercelProjectId: true, vercelDeployHookUrl: true },
  });

  const hasToken = !!process.env.VERCEL_TOKEN;
  console.log('VERCEL_TOKEN:', hasToken ? 'set' : 'NOT SET');
  console.log('WEBSITE_AUTO_DEPLOY:', process.env.WEBSITE_AUTO_DEPLOY ?? '(default: enabled)');
  console.log('');

  for (const w of websites) {
    const hasHook = !!(w.vercelDeployHookUrl as string)?.trim();
    const hasProject = !!w.vercelProjectId;
    const canDeploy = hasHook || (hasProject && hasToken);

    console.log(`${w.name} (${w.id})`);
    console.log(`  vercelProjectId: ${w.vercelProjectId || '(not set)'}`);
    console.log(`  vercelDeployHookUrl: ${hasHook ? 'set' : '(not set)'}`);
    console.log(`  Auto-deploy: ${canDeploy ? '✅ will work' : '❌ will fail'}`);
    if (!canDeploy) {
      if (!hasProject) console.log(`    → Add vercelProjectId (run migrate script or wire script)`);
      else if (!hasToken) console.log(`    → Set VERCEL_TOKEN in env`);
      else console.log(`    → Add vercelDeployHookUrl in Settings (paste from Vercel dashboard)`);
    }
    console.log('');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
