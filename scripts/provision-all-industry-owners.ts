#!/usr/bin/env npx tsx
/**
 * Provision AI employees for ALL business owners that have an industry set
 * but haven't yet been fully provisioned.
 *
 * Run: npx tsx scripts/provision-all-industry-owners.ts
 * Run: npx tsx scripts/provision-all-industry-owners.ts --dry-run  (list only, no provision)
 *
 * Skips: deleted users, SUPER_ADMIN, users without industry
 * Safe to run multiple times - skips already-provisioned agents
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { prisma } from '../lib/db';
import { provisionAIEmployeesForUserAsync } from '../lib/ai-employee-auto-provision';

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const users = await prisma.user.findMany({
    where: {
      industry: { not: null },
      deletedAt: null,
      role: { not: 'SUPER_ADMIN' },
    },
    select: {
      id: true,
      email: true,
      name: true,
      industry: true,
      _count: {
        select: {
          industryAIEmployeeAgents: true,
          professionalAIEmployeeAgents: true,
          reAIEmployeeAgents: true,
        },
      },
    },
    orderBy: { email: 'asc' },
  });

  if (users.length === 0) {
    console.log('No business owners with industry found.');
    return;
  }

  console.log(`Found ${users.length} business owner(s) with industry set.\n`);

  if (dryRun) {
    console.log('DRY RUN - would provision for:\n');
    for (const u of users) {
      const industryCount = (u._count as any).industryAIEmployeeAgents ?? 0;
      const profCount = (u._count as any).professionalAIEmployeeAgents ?? 0;
      const reCount = (u._count as any).reAIEmployeeAgents ?? 0;
      console.log(`  ${u.email || '(no email)'}  |  ${u.name || '(no name)'}  |  ${u.industry}  |  industry:${industryCount} prof:${profCount} re:${reCount}`);
    }
    console.log('\nRun without --dry-run to provision.');
    return;
  }

  let success = 0;
  let failed = 0;

  for (const user of users) {
    try {
      console.log(`\nProvisioning ${user.email} (${user.industry})...`);
      await provisionAIEmployeesForUserAsync(user.id);
      success++;
      console.log(`  ✓ Done`);
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ Failed: ${msg}`);
    }
    // Small delay to avoid rate limits (ElevenLabs, etc.)
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n--- Complete: ${success} succeeded, ${failed} failed ---`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
