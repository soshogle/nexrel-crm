/**
 * Website Data Access Layer
 * Phase 1: Wraps prisma.website - single DB for now
 */

import { getCrmDb } from './db';
import type { DalContext } from './types';
import type { Prisma } from '@prisma/client';
import { cached, invalidatePattern, TTL } from '@/lib/cache';
import { getMetaDb } from '@/lib/db/meta-db';

const cacheKey = (userId: string, suffix = 'list') => `website:${userId}:${suffix}`

export const websiteService = {
  async findMany(ctx: DalContext, options?: { status?: string; take?: number; skip?: number }) {
    return cached(cacheKey(ctx.userId), TTL.MEDIUM, () => {
      const where: Prisma.WebsiteWhereInput = { userId: ctx.userId };
      if (options?.status) where.status = options.status as any;
      return getCrmDb(ctx).website.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.take,
        skip: options?.skip,
      });
    });
  },

  async findUnique(ctx: DalContext, websiteId: string) {
    return cached(cacheKey(ctx.userId, websiteId), TTL.MEDIUM, () =>
      getCrmDb(ctx).website.findFirst({
        where: { id: websiteId, userId: ctx.userId },
      })
    );
  },

  async findFirst(ctx: DalContext, where?: Prisma.WebsiteWhereInput) {
    return getCrmDb(ctx).website.findFirst({
      where: { userId: ctx.userId, ...where },
    });
  },

  async create(ctx: DalContext, data: Omit<Prisma.WebsiteCreateInput, 'user'>) {
    const result = await getCrmDb(ctx).website.create({
      data: { ...data, userId: ctx.userId },
    });
    await invalidatePattern(`website:${ctx.userId}:*`);
    if (ctx.industry) {
      upsertRouting(result.id, ctx.userId, ctx.industry);
    }
    return result;
  },

  async update(ctx: DalContext, websiteId: string, data: Prisma.WebsiteUpdateInput) {
    const result = await getCrmDb(ctx).website.update({
      where: { id: websiteId, userId: ctx.userId },
      data,
    });
    await invalidatePattern(`website:${ctx.userId}:*`);
    return result;
  },

  async delete(ctx: DalContext, websiteId: string) {
    const result = await getCrmDb(ctx).website.delete({
      where: { id: websiteId, userId: ctx.userId },
    });
    await invalidatePattern(`website:${ctx.userId}:*`);
    deleteRouting(websiteId);
    return result;
  },

  async count(ctx: DalContext, where?: Prisma.WebsiteWhereInput) {
    return getCrmDb(ctx).website.count({
      where: { userId: ctx.userId, ...where },
    });
  },
};

/** Fire-and-forget routing table maintenance — never blocks the request */
function upsertRouting(websiteId: string, userId: string, industry: string) {
  getMetaDb()
    .websiteRouting.upsert({
      where: { websiteId },
      create: { websiteId, userId, industry },
      update: { userId, industry },
    })
    .catch(() => {});
}

function deleteRouting(websiteId: string) {
  getMetaDb()
    .websiteRouting.delete({ where: { websiteId } })
    .catch(() => {});
}
