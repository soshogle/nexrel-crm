#!/usr/bin/env tsx
/**
 * List Vercel projects the token can access.
 * Use to find the correct project name/ID for wire-eyal-darksword-to-crm.
 *
 * Run: npx tsx scripts/list-vercel-projects.ts
 * With team: VERCEL_TEAM_ID=team_xxx npx tsx scripts/list-vercel-projects.ts
 * Personal: VERCEL_TEAM_ID= npx tsx scripts/list-vercel-projects.ts
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const VERCEL_API = 'https://api.vercel.com/v9';
const TEAM_ID = process.env.VERCEL_TEAM_ID || undefined;

async function main() {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    console.error('❌ VERCEL_TOKEN not set in .env');
    process.exit(1);
  }

  const url = TEAM_ID
    ? `${VERCEL_API}/projects?teamId=${TEAM_ID}`
    : `${VERCEL_API}/projects`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.error('❌ Vercel API error:', res.status, await res.text());
    process.exit(1);
  }

  const data = await res.json();
  const projects = data.projects || [];
  console.log(`\n📋 Vercel projects (${TEAM_ID ? `team ${TEAM_ID}` : 'personal account'}):\n`);
  projects.forEach((p: any) => {
    const name = p.name || p.project?.name;
    const id = p.id || p.project?.id;
    if (name?.toLowerCase().includes('darksword')) {
      console.log(`   ★ ${name}  →  ${id}`);
    } else {
      console.log(`     ${name}  →  ${id}`);
    }
  });
  console.log('');
}

main().catch(console.error);
