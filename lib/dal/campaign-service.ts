/**
 * Campaign Data Access Layer
 * Phase 1: Wraps getCrmDb(ctx).campaign - single DB for now
 * Phase 3: Will route to getIndustryDb(industry)
 */

import { getCrmDb } from './db';
import type { DalContext } from './types';
import type { Prisma } from '@prisma/client';

const defaultInclude = {
  _count: {
    select: {
      messages: true,
      campaignLeads: true,
    },
  },
} as const;

export const campaignService = {
  async findMany(
    ctx: DalContext,
    options?: {
      status?: string;
      type?: string;
      take?: number;
      skip?: number;
      include?: Prisma.CampaignInclude;
      where?: Prisma.CampaignWhereInput;
    }
  ) {
    const where: Prisma.CampaignWhereInput = { userId: ctx.userId, ...(options?.where ?? {}) };
    if (options?.status) where.status = options.status as any;
    if (options?.type) where.type = options.type as any;

    return getCrmDb(ctx).campaign.findMany({
      where,
      include: (options?.include as any) ?? defaultInclude,
      orderBy: { createdAt: 'desc' },
      take: options?.take,
      skip: options?.skip,
    });
  },

  async findUnique(ctx: DalContext, campaignId: string, include?: Prisma.CampaignInclude) {
    return getCrmDb(ctx).campaign.findFirst({
      where: { id: campaignId, userId: ctx.userId },
      include: (include as any) ?? defaultInclude,
    });
  },

  async create(ctx: DalContext, data: Prisma.CampaignCreateInput, include?: Prisma.CampaignInclude) {
    return getCrmDb(ctx).campaign.create({
      data: { ...data, user: { connect: { id: ctx.userId } } },
      include: (include as any) ?? defaultInclude,
    });
  },

  async update(
    ctx: DalContext,
    campaignId: string,
    data: Prisma.CampaignUpdateInput,
    include?: Prisma.CampaignInclude
  ) {
    return getCrmDb(ctx).campaign.update({
      where: { id: campaignId, userId: ctx.userId },
      data,
      include: (include as any) ?? defaultInclude,
    });
  },

  async delete(ctx: DalContext, campaignId: string) {
    return getCrmDb(ctx).campaign.delete({
      where: { id: campaignId, userId: ctx.userId },
    });
  },

  async count(ctx: DalContext, where?: Prisma.CampaignWhereInput) {
    return getCrmDb(ctx).campaign.count({
      where: { userId: ctx.userId, ...where },
    });
  },
};
