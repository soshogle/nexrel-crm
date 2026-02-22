/**
 * Conversation Data Access Layer
 * Phase 1: Wraps prisma.conversation - single DB for now
 */

import { getCrmDb } from './db';
import type { DalContext } from './types';
import type { Prisma } from '@prisma/client';

export const conversationService = {
  async findMany(
    ctx: DalContext,
    options?: {
      channelConnectionId?: string;
      leadId?: string;
      status?: string;
      take?: number;
      skip?: number;
    }
  ) {
    const where: Prisma.ConversationWhereInput = { userId: ctx.userId };
    if (options?.channelConnectionId) where.channelConnectionId = options.channelConnectionId;
    if (options?.leadId) where.leadId = options.leadId;
    if (options?.status) where.status = options.status as any;
    return getCrmDb(ctx).conversation.findMany({
      where,
      include: { messages: { orderBy: { sentAt: 'desc' }, take: 10 } },
      orderBy: { lastMessageAt: 'desc' },
      take: options?.take,
      skip: options?.skip,
    });
  },

  async findUnique(ctx: DalContext, conversationId: string) {
    return getCrmDb(ctx).conversation.findFirst({
      where: { id: conversationId, userId: ctx.userId },
      include: { messages: true, lead: true, channelConnection: true },
    });
  },

  async findFirst(ctx: DalContext, where: Prisma.ConversationWhereInput) {
    return getCrmDb(ctx).conversation.findFirst({
      where: { userId: ctx.userId, ...where },
      include: { messages: true, lead: true },
    });
  },

  async create(ctx: DalContext, data: Omit<Prisma.ConversationCreateInput, 'user'>) {
    return getCrmDb(ctx).conversation.create({
      data: { ...data, user: { connect: { id: ctx.userId } } },
    });
  },

  async update(ctx: DalContext, conversationId: string, data: Prisma.ConversationUpdateInput) {
    return getCrmDb(ctx).conversation.update({
      where: { id: conversationId, userId: ctx.userId },
      data,
    });
  },

  async delete(ctx: DalContext, conversationId: string) {
    return getCrmDb(ctx).conversation.delete({
      where: { id: conversationId, userId: ctx.userId },
    });
  },

  async count(ctx: DalContext, where?: Prisma.ConversationWhereInput) {
    return getCrmDb(ctx).conversation.count({
      where: { userId: ctx.userId, ...where },
    });
  },
};
