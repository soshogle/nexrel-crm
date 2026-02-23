/**
 * Resolve which database contains a website record.
 *
 * Used by server-to-server routes (x-website-secret auth) where no user session
 * is available and therefore no industry is known for DB routing.
 *
 * Strategy (fast path first):
 *   1. Check the WebsiteRouting table in the meta DB — single indexed lookup.
 *   2. Fallback: scan main DB then each configured industry DB (deduplicated
 *      by URL). If found this way, backfill the routing table for next time.
 */

import type { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getMetaDb } from '@/lib/db/meta-db';
import { getIndustryDb } from '@/lib/db/industry-db';
import type { IndustryDbKey } from '@/lib/db/industry-db';

const INDUSTRY_KEYS: IndustryDbKey[] = [
  'REAL_ESTATE',
  'TECHNOLOGY',
  'ACCOUNTING',
  'RESTAURANT',
  'SPORTS_CLUB',
  'CONSTRUCTION',
  'LAW',
  'MEDICAL',
  'DENTIST',
  'MEDICAL_SPA',
  'OPTOMETRIST',
  'HEALTH_CLINIC',
  'HOSPITAL',
  'ORTHODONTIST',
];

export interface ResolvedWebsiteDb {
  db: PrismaClient;
  industry: IndustryDbKey | null;
}

export async function resolveWebsiteDb(
  websiteId: string,
): Promise<ResolvedWebsiteDb | null> {
  // 1. Fast path: check the routing table in the meta DB
  try {
    const routing = await getMetaDb().websiteRouting.findUnique({
      where: { websiteId },
    });
    if (routing?.industry) {
      const key = routing.industry as IndustryDbKey;
      const envVar = `DATABASE_URL_${key}`;
      if (process.env[envVar]) {
        return { db: getIndustryDb(key), industry: key };
      }
      // Industry env var not configured — fall through to scan
    }
  } catch {
    // Table may not exist yet (pre-migration) — fall through to scan
  }

  // 2. Fallback: scan databases
  // Try main DB
  try {
    const found = await prisma.website.findUnique({
      where: { id: websiteId },
      select: { id: true },
    });
    if (found) return { db: prisma, industry: null };
  } catch {
    /* continue */
  }

  // Try each industry DB with a unique URL
  const triedUrls = new Set<string>();
  if (process.env.DATABASE_URL) triedUrls.add(process.env.DATABASE_URL);

  for (const key of INDUSTRY_KEYS) {
    const url = process.env[`DATABASE_URL_${key}`];
    if (!url || triedUrls.has(url)) continue;
    triedUrls.add(url);

    try {
      const db = getIndustryDb(key);
      const found = await db.website.findUnique({
        where: { id: websiteId },
        select: { id: true, userId: true },
      });
      if (found) {
        // Backfill the routing table so future lookups are instant
        backfillRouting(websiteId, (found as any).userId, key);
        return { db, industry: key };
      }
    } catch {
      /* skip unreachable DBs */
    }
  }

  return null;
}

/** Fire-and-forget backfill — never blocks the request */
function backfillRouting(websiteId: string, userId: string, industry: string) {
  getMetaDb()
    .websiteRouting.upsert({
      where: { websiteId },
      create: { websiteId, userId, industry },
      update: { userId, industry },
    })
    .catch(() => {
      /* best-effort — ignore failures */
    });
}
