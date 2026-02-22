/**
 * CRM Database Client - Phase 2–5
 * Routes to industry DB when ctx.industry set and DATABASE_URL_* configured.
 * Falls back to main prisma when industry DB not configured (backward compatible).
 */

import { prisma } from '@/lib/db';
import { getIndustryDb } from '@/lib/db/industry-db';
import type { DalContext } from './types';

/**
 * Get CRM database client for the given context.
 * When ctx.industry is set and DATABASE_URL_{INDUSTRY} exists, returns industry DB.
 * Otherwise returns shared prisma (single DB).
 */
export function getCrmDb(ctx: DalContext) {
  if (ctx.industry && process.env[`DATABASE_URL_${ctx.industry}`]) {
    if (process.env.NODE_ENV === 'development' && process.env.DAL_LOG_ROUTING === 'true') {
      console.debug('[DAL] Routing to industry DB:', ctx.industry);
    }
    return getIndustryDb(ctx.industry);
  }
  return prisma;
}
