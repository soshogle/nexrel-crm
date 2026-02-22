/**
 * Lead Data Access Layer
 * Phase 1: Wraps prisma.lead - single DB for now
 * Phase 3: Will route to getIndustryDb(industry)
 */

import { getCrmDb } from './db';
import type { DalContext } from './types';
import type { Lead, Prisma } from '@prisma/client';

const defaultInclude = {
  notes: { select: { id: true, createdAt: true } },
  messages: { select: { id: true, createdAt: true } },
} as const;

export const leadService = {
  async findMany(
    ctx: DalContext,
    options?: {
      status?: string;
      search?: string;
      take?: number;
      skip?: number;
      include?: Prisma.LeadInclude;
      select?: Prisma.LeadSelect;
      orderBy?: Prisma.LeadOrderByWithRelationInput | Prisma.LeadOrderByWithRelationInput[];
      where?: Prisma.LeadWhereInput; // Additional where (merged with userId)
    }
  ) {
    const where: Prisma.LeadWhereInput = { userId: ctx.userId, ...(options?.where ?? {}) };
    if (options?.status && options.status !== 'ALL') {
      where.status = options.status as any;
    }
    if (options?.search) {
      where.OR = [
        { businessName: { contains: options.search, mode: 'insensitive' } },
        { contactPerson: { contains: options.search, mode: 'insensitive' } },
        { email: { contains: options.search, mode: 'insensitive' } },
        { phone: { contains: options.search } },
      ];
    }
    const query: Prisma.LeadFindManyArgs = {
      where,
      orderBy: options?.orderBy ?? { createdAt: 'desc' },
      take: options?.take,
      skip: options?.skip,
    };
    if (options?.select) query.select = options.select;
    else query.include = options?.include ?? defaultInclude;
    return getCrmDb(ctx).lead.findMany(query);
  },

  async findUnique(ctx: DalContext, leadId: string, include?: Prisma.LeadInclude) {
    return getCrmDb(ctx).lead.findFirst({
      where: { id: leadId, userId: ctx.userId },
      include: include ?? defaultInclude,
    });
  },

  async create(ctx: DalContext, data: Omit<Prisma.LeadCreateInput, 'user'>) {
    return getCrmDb(ctx).lead.create({
      data: { ...data, userId: ctx.userId },
      include: { notes: true, messages: true },
    });
  },

  async update(ctx: DalContext, leadId: string, data: Prisma.LeadUpdateInput, include?: Prisma.LeadInclude) {
    return getCrmDb(ctx).lead.update({
      where: { id: leadId, userId: ctx.userId },
      data,
      include: include ?? defaultInclude,
    });
  },

  async delete(ctx: DalContext, leadId: string) {
    return getCrmDb(ctx).lead.delete({
      where: { id: leadId, userId: ctx.userId },
    });
  },

  async deleteMany(ctx: DalContext, where?: Prisma.LeadWhereInput) {
    return getCrmDb(ctx).lead.deleteMany({
      where: { userId: ctx.userId, ...where },
    });
  },

  async count(ctx: DalContext, where?: Prisma.LeadWhereInput) {
    return getCrmDb(ctx).lead.count({
      where: { userId: ctx.userId, ...where },
    });
  },
};
