/**
 * Message Data Access Layer
 * Phase 1: Wraps prisma.message - single DB for now
 * Messages are linked to leads (industry-scoped via lead)
 */

import { getCrmDb } from './db';
import type { DalContext } from './types';
import type { Prisma } from '@prisma/client';

export const messageService = {
  async findMany(ctx: DalContext, where?: Prisma.MessageWhereInput, options?: { select?: Prisma.MessageSelect; take?: number }) {
    return getCrmDb(ctx).message.findMany({
      where: where ?? {},
      select: options?.select,
      take: options?.take,
    });
  },

  async create(ctx: DalContext, data: { leadId: string; content: string; messageType?: string; isUsed?: boolean }) {
    return getCrmDb(ctx).message.create({
      data: {
        leadId: data.leadId,
        userId: ctx.userId,
        content: data.content,
        messageType: data.messageType ?? 'ai_generated',
        isUsed: data.isUsed ?? false,
      },
    });
  },

  async findFirst(ctx: DalContext, where: Prisma.MessageWhereInput) {
    return getCrmDb(ctx).message.findFirst({
      where: { userId: ctx.userId, ...where },
    });
  },

  async update(ctx: DalContext, messageId: string, data: Prisma.MessageUpdateInput) {
    return getCrmDb(ctx).message.update({
      where: { id: messageId, userId: ctx.userId },
      data,
    });
  },
};
