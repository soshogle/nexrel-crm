/**
 * WorkflowTemplate Data Access Layer
 * Phase 1: Wraps prisma.workflowTemplate - single DB for now
 * Used by real estate and multi-industry workflows
 */

import { getCrmDb } from './db';
import type { DalContext } from './types';
import type { Prisma } from '@prisma/client';

export const workflowTemplateService = {
  async findMany(
    ctx: DalContext,
    options?: {
      industry?: string;
      type?: string;
      isActive?: boolean;
      take?: number;
      skip?: number;
    }
  ) {
    const where: Prisma.WorkflowTemplateWhereInput = { userId: ctx.userId };
    if (options?.industry) where.industry = options.industry as any;
    if (options?.type) where.type = options.type as any;
    if (options?.isActive !== undefined) where.isActive = options.isActive;
    return getCrmDb(ctx).workflowTemplate.findMany({
      where,
      include: { tasks: { orderBy: { displayOrder: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      take: options?.take,
      skip: options?.skip,
    });
  },

  async findUnique(ctx: DalContext, templateId: string) {
    return getCrmDb(ctx).workflowTemplate.findFirst({
      where: { id: templateId, userId: ctx.userId },
      include: { tasks: { orderBy: { displayOrder: 'asc' } } },
    });
  },

  async findFirst(ctx: DalContext, where?: Prisma.WorkflowTemplateWhereInput) {
    return getCrmDb(ctx).workflowTemplate.findFirst({
      where: { userId: ctx.userId, ...where },
      include: { tasks: true },
    });
  },

  async create(ctx: DalContext, data: Omit<Prisma.WorkflowTemplateCreateInput, 'user'>) {
    return getCrmDb(ctx).workflowTemplate.create({
      data: { ...data, user: { connect: { id: ctx.userId } } },
    });
  },

  async update(ctx: DalContext, templateId: string, data: Prisma.WorkflowTemplateUpdateInput) {
    return getCrmDb(ctx).workflowTemplate.update({
      where: { id: templateId, userId: ctx.userId },
      data,
    });
  },

  async delete(ctx: DalContext, templateId: string) {
    return getCrmDb(ctx).workflowTemplate.delete({
      where: { id: templateId, userId: ctx.userId },
    });
  },

  async count(ctx: DalContext, where?: Prisma.WorkflowTemplateWhereInput) {
    return getCrmDb(ctx).workflowTemplate.count({
      where: { userId: ctx.userId, ...where },
    });
  },
};
