/**
 * Note Data Access Layer
 * Phase 1: Wraps prisma.note - single DB for now
 * Notes are linked to leads (industry-scoped via lead)
 */

import { getCrmDb } from './db';
import type { DalContext } from './types';
import type { Prisma } from '@prisma/client';

export const noteService = {
  async findMany(ctx: DalContext, where?: Prisma.NoteWhereInput, options?: { select?: Prisma.NoteSelect; take?: number }) {
    const baseWhere: Prisma.NoteWhereInput = where ?? {};
    return getCrmDb(ctx).note.findMany({
      where: baseWhere,
      select: options?.select,
      take: options?.take,
    });
  },

  async create(ctx: DalContext, data: { leadId: string; content: string }) {
    return getCrmDb(ctx).note.create({
      data: {
        leadId: data.leadId,
        userId: ctx.userId,
        content: data.content,
      },
    });
  },

  async findFirst(ctx: DalContext, where: Prisma.NoteWhereInput) {
    return getCrmDb(ctx).note.findFirst({
      where: { userId: ctx.userId, ...where },
    });
  },

  async update(ctx: DalContext, noteId: string, data: Prisma.NoteUpdateInput) {
    return getCrmDb(ctx).note.update({
      where: { id: noteId, userId: ctx.userId },
      data,
    });
  },

  async delete(ctx: DalContext, noteId: string) {
    return getCrmDb(ctx).note.delete({
      where: { id: noteId, userId: ctx.userId },
    });
  },
};
