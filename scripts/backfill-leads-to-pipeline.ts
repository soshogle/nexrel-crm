#!/usr/bin/env npx tsx
/**
 * Backfill leads to pipeline - create Deal records for leads that don't have one.
 * Run: npx tsx scripts/backfill-leads-to-pipeline.ts [userEmail]
 * If userEmail omitted, processes all users with leads.
 */

import { prisma } from '../lib/db';
import { getCrmDb } from '../lib/dal';
import { createDalContext } from '../lib/context/industry-context';
import { syncLeadCreatedToPipeline } from '../lib/lead-pipeline-sync';

async function main() {
  const userEmail = process.argv[2];

  const users = userEmail
    ? await prisma.user.findMany({
        where: { email: userEmail },
        select: { id: true, email: true, industry: true },
      })
    : await prisma.user.findMany({
        select: { id: true, email: true, industry: true },
      });

  if (users.length === 0) {
    console.log('No users found');
    process.exit(1);
  }

  let totalSynced = 0;
  for (const user of users) {
    const ctx = createDalContext(user.id, user.industry);
    const db = getCrmDb(ctx);

    const leads = await db.lead.findMany({
      where: { userId: user.id },
      select: { id: true, businessName: true, contactPerson: true, status: true },
    });

    const existingDeals = await db.deal.findMany({
      where: { userId: user.id, leadId: { not: null } },
      select: { leadId: true },
    });
    const leadIdsWithDeals = new Set(existingDeals.map((d) => d.leadId).filter(Boolean));

    const missing = leads.filter((l) => !leadIdsWithDeals.has(l.id));
    if (missing.length === 0) {
      console.log(`✓ ${user.email}: all ${leads.length} leads already have deals`);
      continue;
    }

    console.log(`\n${user.email} (${user.industry || 'default'}): ${missing.length} leads without deals`);
    for (const lead of missing) {
      try {
        const deal = await syncLeadCreatedToPipeline(user.id, lead, user.industry as string | null);
        if (deal) {
          totalSynced++;
          console.log(`  + ${lead.contactPerson || lead.businessName || lead.id} → deal created`);
        }
      } catch (err: any) {
        console.error(`  ✗ ${lead.id}:`, err.message);
      }
    }
  }

  console.log(`\nDone. Synced ${totalSynced} leads to pipeline.`);
}

main().catch(console.error).finally(() => process.exit(0));
