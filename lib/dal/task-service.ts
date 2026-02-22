/**
 * Task Data Access Layer
 * Phase 1: Wraps prisma.task - single DB for now
 */

import { getCrmDb } from './db';
import type { DalContext } from './types';
import type { Prisma } from '@prisma/client';

export const taskService = {
  async findMany(
    ctx: DalContext,
    options?: {
      status?: string;
      leadId?: string;
      dealId?: string;
      assignedToId?: string;
      take?: number;
      skip?: number;
    }
  ) {
    const where: Prisma.TaskWhereInput = {
      OR: [{ userId: ctx.userId }, { assignedToId: ctx.userId }],
    };
    if (options?.status) where.status = options.status as any;
    if (options?.leadId) where.leadId = options.leadId;
    if (options?.dealId) where.dealId = options.dealId;
    if (options?.assignedToId) where.assignedToId = options.assignedToId;
    return getCrmDb(ctx).task.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      take: options?.take,
      skip: options?.skip,
    });
  },

  async findUnique(ctx: DalContext, taskId: string) {
    return getCrmDb(ctx).task.findFirst({
      where: {
        id: taskId,
        OR: [{ userId: ctx.userId }, { assignedToId: ctx.userId }],
      },
    });
  },

  async create(ctx: DalContext, data: Omit<Prisma.TaskCreateInput, 'user'>) {
    return getCrmDb(ctx).task.create({
      data: { ...data, user: { connect: { id: ctx.userId } } },
    });
  },

  async update(ctx: DalContext, taskId: string, data: Prisma.TaskUpdateInput) {
    return getCrmDb(ctx).task.update({
      where: { id: taskId, userId: ctx.userId },
      data,
    });
  },

  async delete(ctx: DalContext, taskId: string) {
    return getCrmDb(ctx).task.delete({
      where: { id: taskId, userId: ctx.userId },
    });
  },

  async count(ctx: DalContext, where?: Prisma.TaskWhereInput) {
    return getCrmDb(ctx).task.count({
      where: {
        OR: [{ userId: ctx.userId }, { assignedToId: ctx.userId }],
        ...where,
      },
    });
  },
};
