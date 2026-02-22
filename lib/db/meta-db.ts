/**
 * Meta DB Client - Phase 2
 * Returns Prisma client for Meta DB (User, Session, Account, Agency, etc.).
 * Phase 2: Uses DATABASE_URL_META or falls back to DATABASE_URL (single DB).
 * Phase 4: Set DATABASE_URL_META to separate auth/billing DB.
 */

import { PrismaClient } from '@prisma/client';

let metaClient: PrismaClient | null = null;

/**
 * Get Prisma client for Meta DB.
 * Phase 2: Same as main prisma when DATABASE_URL_META not set.
 */
export function getMetaDb(): PrismaClient {
  if (!metaClient) {
    const url = process.env.DATABASE_URL_META || process.env.DATABASE_URL;
    metaClient = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      datasources: {
        db: { url: url! },
      },
    });
  }
  return metaClient;
}
