/**
 * Resolve which database contains a website record.
 *
 * Used by server-to-server routes (x-website-secret auth) where no user session
 * is available and therefore no industry is known for DB routing.
 *
 * Strategy: check main DB first, then each configured industry DB (deduplicated
 * by URL so we never hit the same host twice). A findUnique by PK is essentially
 * instant on each database.
 */

import type { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db';
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
  // 1. Try main DB
  try {
    const found = await prisma.website.findUnique({
      where: { id: websiteId },
      select: { id: true },
    });
    if (found) return { db: prisma, industry: null };
  } catch {
    /* main DB may not have the table or may be unreachable — continue */
  }

  // 2. Try each industry DB whose URL differs from what we already checked
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
        select: { id: true },
      });
      if (found) return { db, industry: key };
    } catch {
      /* skip unreachable DBs */
    }
  }

  return null;
}
