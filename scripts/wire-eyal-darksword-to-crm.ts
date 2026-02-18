#!/usr/bin/env tsx
/**
 * Wire Eyal's darksword-armory to the CRM (Option B).
 * Sets githubRepoUrl and vercelProjectId so the CRM can trigger deploys when he edits.
 *
 * Does NOT provision new resources. Eyal keeps his existing repo and Vercel project.
 *
 * Run: npx tsx scripts/wire-eyal-darksword-to-crm.ts
 * Dry run: DRY_RUN=1 npx tsx scripts/wire-eyal-darksword-to-crm.ts
 */

import { prisma } from '@/lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const EYAL_WEBSITE_ID = 'cmlkk9awe0002puiqm64iqw7t';
const DARKSWORD_GITHUB_URL = 'https://github.com/soshogle/darksword-armory';
const VERCEL_API = 'https://api.vercel.com/v9';
const TEAM_ID = process.env.VERCEL_TEAM_ID || 'team_vJ3wdbf3QXa3R4KzaZjDEkLP';

async function findVercelProject(name: string, useTeam = true): Promise<string | null> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) return null;

  const url = useTeam && TEAM_ID
    ? `${VERCEL_API}/projects/${encodeURIComponent(name)}?teamId=${TEAM_ID}`
    : `${VERCEL_API}/projects/${encodeURIComponent(name)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.id || data.project?.id || null;
}

async function main() {
  const dryRun = process.env.DRY_RUN === '1';

  const website = await prisma.website.findUnique({
    where: { id: EYAL_WEBSITE_ID },
    select: { id: true, name: true, githubRepoUrl: true, vercelProjectId: true },
  });

  if (!website) {
    console.error('❌ Eyal website not found:', EYAL_WEBSITE_ID);
    process.exit(1);
  }

  console.log('🔗 Wiring Eyal Darksword Armory to CRM\n');
  console.log('   Website:', website.name);
  console.log('   GitHub:', DARKSWORD_GITHUB_URL);

  // darksword-armory = live site (darksword-armory.vercel.app); darksword-armory-website = alternate
  let vercelProjectId = await findVercelProject('darksword-armory');
  if (!vercelProjectId) vercelProjectId = await findVercelProject('darksword-armory-website');
  if (!vercelProjectId) vercelProjectId = await findVercelProject('darksword-armory', false); // personal account
  if (!vercelProjectId) vercelProjectId = await findVercelProject('darksword-armory-website', false);

  if (!vercelProjectId) {
    console.warn('\n⚠ Could not find Vercel project "darksword-armory" or "darksword-armory-website".');
    console.warn('   Set VERCEL_TOKEN in .env. If projects are under a personal account, try VERCEL_TEAM_ID=""');
    console.warn('   You can still set githubRepoUrl; vercelProjectId will be null.');
  } else {
    console.log('   Vercel project ID:', vercelProjectId);
  }

  if (!dryRun) {
    await prisma.website.update({
      where: { id: EYAL_WEBSITE_ID },
      data: {
        githubRepoUrl: DARKSWORD_GITHUB_URL,
        vercelProjectId: vercelProjectId || undefined,
      },
    });
    console.log('\n✅ Done. Eyal\'s site is now wired. Structure edits will trigger deploys.');
  } else {
    console.log('\n[dry] Would update githubRepoUrl and vercelProjectId. Run without DRY_RUN=1 to apply.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
