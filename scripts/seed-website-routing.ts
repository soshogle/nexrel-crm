#!/usr/bin/env tsx
/**
 * Seed the WebsiteRouting table in the meta DB.
 *
 * Reads all websites from main DB + each configured industry DB,
 * looks up each owner's industry, and upserts into WebsiteRouting.
 *
 * Safe to re-run — uses upsert so existing entries are updated, not duplicated.
 * Read-only against industry DBs; only writes to meta DB's WebsiteRouting table.
 *
 * Run:  npx tsx scripts/seed-website-routing.ts
 */

import { PrismaClient } from '@prisma/client';

const INDUSTRY_KEYS = [
  'REAL_ESTATE', 'TECHNOLOGY', 'ACCOUNTING', 'RESTAURANT', 'SPORTS_CLUB',
  'CONSTRUCTION', 'LAW', 'MEDICAL', 'DENTIST', 'MEDICAL_SPA',
  'OPTOMETRIST', 'HEALTH_CLINIC', 'HOSPITAL', 'ORTHODONTIST',
] as const;

interface WebsiteEntry {
  websiteId: string;
  userId: string;
  industry: string;
  source: string;
}

async function main() {
  console.log('🔍 Seeding WebsiteRouting table\n');

  const metaUrl = process.env.DATABASE_URL_META || process.env.DATABASE_URL;
  const metaDb = new PrismaClient({
    log: ['error'],
    datasources: { db: { url: metaUrl } },
  });

  const entries: WebsiteEntry[] = [];
  const triedUrls = new Set<string>();

  // 1. Scan main DB
  const mainUrl = process.env.DATABASE_URL!;
  triedUrls.add(mainUrl);

  const mainDb = mainUrl === metaUrl
    ? metaDb
    : new PrismaClient({ log: ['error'], datasources: { db: { url: mainUrl } } });

  try {
    const websites = await mainDb.website.findMany({
      select: { id: true, userId: true },
    });
    for (const w of websites) {
      const user = await metaDb.user.findUnique({
        where: { id: w.userId },
        select: { industry: true },
      });
      if (user?.industry) {
        entries.push({ websiteId: w.id, userId: w.userId, industry: user.industry, source: 'main' });
      }
    }
    console.log(`  Main DB: found ${websites.length} websites`);
  } catch {
    console.log('  Main DB: no websites table or unreachable');
  }

  // 2. Scan each industry DB with a unique URL
  for (const key of INDUSTRY_KEYS) {
    const url = process.env[`DATABASE_URL_${key}`];
    if (!url || triedUrls.has(url)) continue;
    triedUrls.add(url);

    const db = new PrismaClient({ log: ['error'], datasources: { db: { url } } });
    try {
      const websites = await db.website.findMany({
        select: { id: true, userId: true },
      });
      for (const w of websites) {
        const user = await metaDb.user.findUnique({
          where: { id: w.userId },
          select: { industry: true },
        });
        entries.push({
          websiteId: w.id,
          userId: w.userId,
          industry: user?.industry || key,
          source: key,
        });
      }
      if (websites.length > 0) {
        console.log(`  ${key}: found ${websites.length} websites`);
      }
    } catch {
      /* skip unreachable DBs */
    }
    await db.$disconnect();
  }

  // 3. Deduplicate by websiteId (prefer industry DB entry over main)
  const byId = new Map<string, WebsiteEntry>();
  for (const entry of entries) {
    const existing = byId.get(entry.websiteId);
    if (!existing || entry.source !== 'main') {
      byId.set(entry.websiteId, entry);
    }
  }

  const unique = [...byId.values()];
  console.log(`\n  Total unique websites: ${unique.length}\n`);

  // 4. Upsert into meta DB
  let created = 0;
  let updated = 0;

  for (const entry of unique) {
    try {
      await metaDb.websiteRouting.upsert({
        where: { websiteId: entry.websiteId },
        create: {
          websiteId: entry.websiteId,
          userId: entry.userId,
          industry: entry.industry,
        },
        update: {
          userId: entry.userId,
          industry: entry.industry,
        },
      });

      const existed = await metaDb.websiteRouting.findUnique({
        where: { websiteId: entry.websiteId },
      });
      if (existed) updated++;
      else created++;
    } catch (e: any) {
      console.log(`  ❌ ${entry.websiteId}: ${e.message?.slice(0, 100)}`);
    }
  }

  console.log(`  ✅ Upserted ${unique.length} routing entries`);

  // 5. Verify
  const totalRouting = await metaDb.websiteRouting.count();
  console.log(`  📊 Total WebsiteRouting rows: ${totalRouting}\n`);

  const all = await metaDb.websiteRouting.findMany({ orderBy: { industry: 'asc' } });
  for (const r of all) {
    console.log(`     ${r.websiteId} → userId=${r.userId}, industry=${r.industry}`);
  }

  console.log('\nDone.\n');

  if (mainDb !== metaDb) await mainDb.$disconnect();
  await metaDb.$disconnect();
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
