/**
 * Wire Theodora's website to her Vercel project so auto-deploy works.
 * Run: npx tsx scripts/wire-theodora-vercel.ts
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

async function listProjects(): Promise<{ id: string; name: string }[]> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) return [];
  const res = await fetch(
    `${VERCEL_API}/projects?teamId=${TEAM_ID}&limit=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  const projects = data.projects ?? data ?? [];
  return Array.isArray(projects)
    ? projects.map((p: any) => ({ id: p.id, name: p.name }))
    : [];
}

async function main() {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    console.error('❌ VERCEL_TOKEN required');
    process.exit(1);
  }

  const website = await prisma.website.findFirst({
    where: { name: { contains: 'Theodora', mode: 'insensitive' } },
  });

  if (!website) {
    console.error('❌ Theodora website not found');
    process.exit(1);
  }

  console.log('Website:', website.name, `(${website.id})`);
  console.log('Current vercelProjectId:', website.vercelProjectId || '(not set)');
  console.log('');

  const namesToTry = [
    'theodora-stavropoulos-remax',
    'Theodora-Stavropoulos-Remax',
    'theodora-stavropoulos-website',
  ];

  let projectId: string | null = null;
  for (const name of namesToTry) {
    projectId = await findVercelProject(name);
    if (projectId) {
      console.log(`✅ Found project "${name}": ${projectId}`);
      break;
    }
  }

  if (!projectId) {
    console.log('Could not find project by name. Listing projects containing "theodora":');
    const projects = await listProjects();
    const matches = projects.filter((p) =>
      p.name.toLowerCase().includes('theodora')
    );
    if (matches.length) {
      matches.forEach((p) => console.log(`  - ${p.name} (${p.id})`));
      projectId = matches[0].id;
      console.log(`\nUsing first match: ${projectId}`);
    }
  }

  if (!projectId) {
    console.error('❌ Could not find Theodora\'s Vercel project. Is it in the soshogle team?');
    process.exit(1);
  }

  await prisma.website.update({
    where: { id: website.id },
    data: { vercelProjectId: projectId },
  });

  console.log('\n✅ Updated website with vercelProjectId. Auto-deploy should now work on save.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
