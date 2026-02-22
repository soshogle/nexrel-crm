/**
 * Website Data Access Layer
 * Phase 1: Wraps prisma.website - single DB for now
 */

import { getCrmDb } from './db';
import type { DalContext } from './types';
import type { Prisma } from '@prisma/client';

export const websiteService = {
  async findMany(ctx: DalContext, options?: { status?: string; take?: number; skip?: number }) {
    const where: Prisma.WebsiteWhereInput = { userId: ctx.userId };
    if (options?.status) where.status = options.status as any;
    return getCrmDb(ctx).website.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.take,
      skip: options?.skip,
    });
  },

  async findUnique(ctx: DalContext, websiteId: string) {
    return getCrmDb(ctx).website.findFirst({
      where: { id: websiteId, userId: ctx.userId },
    });
  },

  async findFirst(ctx: DalContext, where?: Prisma.WebsiteWhereInput) {
    return getCrmDb(ctx).website.findFirst({
      where: { userId: ctx.userId, ...where },
    });
  },

  async create(ctx: DalContext, data: Omit<Prisma.WebsiteCreateInput, 'user'>) {
    return getCrmDb(ctx).website.create({
      data: { ...data, userId: ctx.userId },
    });
  },

  async update(ctx: DalContext, websiteId: string, data: Prisma.WebsiteUpdateInput) {
    return getCrmDb(ctx).website.update({
      where: { id: websiteId, userId: ctx.userId },
      data,
    });
  },

  async delete(ctx: DalContext, websiteId: string) {
    return getCrmDb(ctx).website.delete({
      where: { id: websiteId, userId: ctx.userId },
    });
  },

  async count(ctx: DalContext, where?: Prisma.WebsiteWhereInput) {
    return getCrmDb(ctx).website.count({
      where: { userId: ctx.userId, ...where },
    });
  },
};
