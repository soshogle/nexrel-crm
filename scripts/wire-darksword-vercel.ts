/**
 * Wire the "darksword" website to its Vercel project so auto-deploy works.
 * Run: npx tsx scripts/wire-darksword-vercel.ts
 */
import { prisma } from '../lib/db';

const VERCEL_API = 'https://api.vercel.com/v9';
const TEAM_ID = process.env.VERCEL_TEAM_ID || 'team_vJ3wdbf3QXa3R4KzaZjDEkLP';

async function findVercelProject(name: string): Promise<string | null> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) return null;
  const res = await fetch(
    `${VERCEL_API}/projects/${encodeURIComponent(name)}?teamId=${TEAM_ID}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.id || data.project?.id || null;
}

async function main() {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    console.error('❌ VERCEL_TOKEN required');
    process.exit(1);
  }

  const website = await prisma.website.findUnique({
    where: { id: 'cmlkjpjlq0001jr043j95fl94' },
  });

  if (!website) {
    console.error('❌ darksword website not found');
    process.exit(1);
  }

  console.log('Website:', website.name, `(${website.id})`);
  console.log('Current vercelProjectId:', website.vercelProjectId || '(not set)');
  console.log('');

  const namesToTry = ['darksword-armory', 'darksword-armory-website', 'darksword'];
  let projectId: string | null = null;

  for (const name of namesToTry) {
    projectId = await findVercelProject(name);
    if (projectId) {
      console.log(`✅ Found project "${name}": ${projectId}`);
      break;
    }
  }

  if (!projectId) {
    console.error('❌ Could not find Vercel project. Tried:', namesToTry.join(', '));
    process.exit(1);
  }

  await prisma.website.update({
    where: { id: website.id },
    data: { vercelProjectId: projectId },
  });

  console.log('\n✅ Updated. Auto-deploy should now work on save.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
