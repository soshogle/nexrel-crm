/**
 * Deal Data Access Layer
 * Phase 1: Wraps getCrmDb(ctx).deal - single DB for now
 * Phase 3: Will route to getIndustryDb(industry)
 */

import { getCrmDb } from './db';
import type { DalContext } from './types';
import type { Prisma } from '@prisma/client';

const defaultInclude = {
  stage: true,
  lead: true,
  pipeline: true,
} as const;

export const dealService = {
  async findMany(
    ctx: DalContext,
    options?: {
      pipelineId?: string;
      stageId?: string;
      leadId?: string;
      take?: number;
      skip?: number;
      include?: Prisma.DealInclude;
      where?: Prisma.DealWhereInput;
    }
  ) {
    const where: Prisma.DealWhereInput = { userId: ctx.userId, ...(options?.where ?? {}) };
    if (options?.pipelineId) where.pipelineId = options.pipelineId;
    if (options?.stageId) where.stageId = options.stageId;
    if (options?.leadId) where.leadId = options.leadId;

    return getCrmDb(ctx).deal.findMany({
      where,
      include: (options?.include as any) ?? defaultInclude,
      orderBy: { createdAt: 'desc' },
      take: options?.take,
      skip: options?.skip,
    });
  },

  async findUnique(ctx: DalContext, dealId: string, include?: Prisma.DealInclude) {
    return getCrmDb(ctx).deal.findFirst({
      where: { id: dealId, userId: ctx.userId },
      include: (include as any) ?? { ...defaultInclude, activities: true, lead: true },
    });
  },

  async create(ctx: DalContext, data: Prisma.DealCreateInput) {
    return getCrmDb(ctx).deal.create({
      data: { ...data, user: { connect: { id: ctx.userId } } },
      include: defaultInclude,
    });
  },

  async update(ctx: DalContext, dealId: string, data: Prisma.DealUpdateInput, include?: Prisma.DealInclude) {
    return getCrmDb(ctx).deal.update({
      where: { id: dealId, userId: ctx.userId },
      data,
      include: (include as any) ?? defaultInclude,
    });
  },

  async delete(ctx: DalContext, dealId: string) {
    return getCrmDb(ctx).deal.delete({
      where: { id: dealId, userId: ctx.userId },
    });
  },

  async count(ctx: DalContext, where?: Prisma.DealWhereInput) {
    return getCrmDb(ctx).deal.count({
      where: { userId: ctx.userId, ...where },
    });
  },
};
