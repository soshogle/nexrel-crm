import { getCrmDb } from './db';
import type { DalContext } from './types';
import { cached, invalidatePattern, TTL } from '@/lib/cache';

const cacheKey = (userId: string, suffix = 'list') => `voiceAgent:${userId}:${suffix}`

export const voiceAgentService = {
  async findMany(ctx: DalContext, options?: { take?: number; skip?: number; where?: any; include?: any; orderBy?: any }) {
    return cached(cacheKey(ctx.userId), TTL.MEDIUM, () => {
      const where = { userId: ctx.userId, ...(options?.where ?? {}) };
      return getCrmDb(ctx).voiceAgent.findMany({
        where,
        orderBy: options?.orderBy ?? { createdAt: 'desc' },
        take: options?.take,
        skip: options?.skip,
        include: options?.include,
      } as any);
    });
  },
  async findUnique(ctx: DalContext, id: string, include?: any) {
    return cached(cacheKey(ctx.userId, id), TTL.MEDIUM, () =>
      getCrmDb(ctx).voiceAgent.findFirst({ where: { id, userId: ctx.userId }, include } as any)
    );
  },
  async create(ctx: DalContext, data: any) {
    const result = await getCrmDb(ctx).voiceAgent.create({ data: { ...data, userId: ctx.userId } } as any);
    await invalidatePattern(`voiceAgent:${ctx.userId}:*`);
    return result;
  },
  async update(ctx: DalContext, id: string, data: any) {
    const result = await getCrmDb(ctx).voiceAgent.update({ where: { id, userId: ctx.userId }, data } as any);
    await invalidatePattern(`voiceAgent:${ctx.userId}:*`);
    return result;
  },
  async delete(ctx: DalContext, id: string) {
    const result = await getCrmDb(ctx).voiceAgent.delete({ where: { id, userId: ctx.userId } } as any);
    await invalidatePattern(`voiceAgent:${ctx.userId}:*`);
    return result;
  },
  async count(ctx: DalContext, where?: any) {
    return getCrmDb(ctx).voiceAgent.count({ where: { userId: ctx.userId, ...where } } as any);
  },
};
