/**
 * Test the deploy trigger for a website. Run to see actual API response.
 * Usage: npx tsx scripts/test-deploy-trigger.ts [websiteId]
 */
import { prisma } from '../lib/db';
import { triggerWebsiteDeploy } from '../lib/website-builder/deploy-trigger';

async function main() {
  const websiteId = process.argv[2] || 'cmlpuuy8a0001pu4gz4y97hrm'; // Theodora default
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
    select: { id: true, name: true, vercelProjectId: true, vercelDeployHookUrl: true },
  });
  if (!website) {
    console.error('Website not found:', websiteId);
    process.exit(1);
  }
  console.log('Testing deploy for:', website.name, websiteId);
  console.log('vercelProjectId:', website.vercelProjectId);
  console.log('vercelDeployHookUrl:', website.vercelDeployHookUrl ? 'set' : '(not set)');
  console.log('');
  const result = await triggerWebsiteDeploy(websiteId);
  console.log('Result:', result);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
