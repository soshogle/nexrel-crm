import { getCrmDb } from './db';
import type { DalContext } from './types';
import { cached, invalidatePattern, TTL } from '@/lib/cache';

const cacheKey = (userId: string, suffix = 'list') => `pipeline:${userId}:${suffix}`

export const pipelineService = {
  async findMany(ctx: DalContext, options?: { take?: number; skip?: number; where?: any; include?: any; orderBy?: any }) {
    return cached(cacheKey(ctx.userId), TTL.LONG, () => {
      const where = { userId: ctx.userId, ...(options?.where ?? {}) };
      return getCrmDb(ctx).pipeline.findMany({
        where,
        orderBy: options?.orderBy ?? { createdAt: 'desc' },
        take: options?.take,
        skip: options?.skip,
        include: options?.include ?? { stages: true },
      } as any);
    });
  },
  async findUnique(ctx: DalContext, id: string, include?: any) {
    return cached(cacheKey(ctx.userId, id), TTL.LONG, () =>
      getCrmDb(ctx).pipeline.findFirst({ where: { id, userId: ctx.userId }, include: include ?? { stages: true } } as any)
    );
  },
  async create(ctx: DalContext, data: any) {
    const result = await getCrmDb(ctx).pipeline.create({ data: { ...data, userId: ctx.userId } } as any);
    await invalidatePattern(`pipeline:${ctx.userId}:*`);
    return result;
  },
  async update(ctx: DalContext, id: string, data: any) {
    const result = await getCrmDb(ctx).pipeline.update({ where: { id, userId: ctx.userId }, data } as any);
    await invalidatePattern(`pipeline:${ctx.userId}:*`);
    return result;
  },
  async delete(ctx: DalContext, id: string) {
    const result = await getCrmDb(ctx).pipeline.delete({ where: { id, userId: ctx.userId } } as any);
    await invalidatePattern(`pipeline:${ctx.userId}:*`);
    return result;
  },
  async count(ctx: DalContext, where?: any) {
    return getCrmDb(ctx).pipeline.count({ where: { userId: ctx.userId, ...where } } as any);
  },
};
