#!/usr/bin/env tsx
/**
 * Migrate Theodora to her own repo (from nexrel-service-template).
 * Creates a new GitHub repo, updates CRM, and provides instructions for Vercel.
 *
 * The Vercel project "theodora-stavropoulos-remax" must be manually reconnected
 * to the new repo (Vercel dashboard: Settings → Git → Disconnect → Connect new repo).
 *
 * Run: npx tsx scripts/migrate-theodora-to-own-repo.ts
 * Dry run: DRY_RUN=1 npx tsx scripts/migrate-theodora-to-own-repo.ts
 */

import { prisma } from '@/lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const THEODORA_EMAIL = 'theodora.stavropoulos@remax-quebec.com';
const TEMPLATE_OWNER = process.env.NEXREL_SERVICE_TEMPLATE_OWNER || 'soshogle';
const TEMPLATE_REPO = process.env.NEXREL_SERVICE_TEMPLATE_REPO || 'nexrel-service-template';
const GITHUB_ORG = process.env.GITHUB_ORG || 'soshogle';
const REPO_NAME = 'theodora-stavropoulos-website';
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
  const dryRun = process.env.DRY_RUN === '1';
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    console.error('❌ GITHUB_TOKEN required in .env');
    process.exit(1);
  }

  const theodora = await prisma.user.findUnique({
    where: { email: THEODORA_EMAIL },
    include: { websites: true },
  });

  if (!theodora?.websites?.length) {
    console.error('❌ Theodora or her website not found');
    process.exit(1);
  }

  const website = theodora.websites[0];
  console.log('📦 Migrating Theodora to own repo\n');
  console.log('   Website:', website.name, `(${website.id})`);
  console.log('   Template:', `${TEMPLATE_OWNER}/${TEMPLATE_REPO}`);
  console.log('   New repo:', `${GITHUB_ORG}/${REPO_NAME}`);

  if (!dryRun) {
    const res = await fetch(
      `https://api.github.com/repos/${TEMPLATE_OWNER}/${TEMPLATE_REPO}/generate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: REPO_NAME,
          description: `Website: ${website.name}`,
          private: true,
          include_all_branches: false,
          owner: GITHUB_ORG,
        }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error('❌ GitHub create-from-template failed:', res.status, text);
      process.exit(1);
    }

    const repo = await res.json();
    const githubRepoUrl = repo.html_url || `https://github.com/${GITHUB_ORG}/${REPO_NAME}`;

    const vercelProjectId = await findVercelProject('theodora-stavropoulos-remax');

    await prisma.website.update({
      where: { id: website.id },
      data: { githubRepoUrl, vercelProjectId: vercelProjectId || undefined },
    });

    console.log('\n✅ Repo created:', githubRepoUrl);
    console.log('✅ CRM updated with githubRepoUrl' + (vercelProjectId ? ' and vercelProjectId' : ''));
    console.log('\n📋 Manual step – connect Vercel to new repo:');
    console.log('   1. Go to https://vercel.com/soshogle/theodora-stavropoulos-remax/settings/git');
    console.log('   2. Disconnect current repository');
    console.log('   3. Connect repository → select', REPO_NAME);
    console.log('   4. Root directory: leave empty (or .)');
    console.log('   5. Redeploy');
  } else {
    console.log('\n[dry] Would create repo and update CRM. Run without DRY_RUN=1 to apply.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
