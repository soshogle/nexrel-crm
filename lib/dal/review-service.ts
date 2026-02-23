import { getCrmDb } from './db';
import type { DalContext } from './types';

export const reviewService = {
  async findMany(ctx: DalContext, options?: { take?: number; skip?: number; where?: any; include?: any; orderBy?: any }) {
    const where = { campaign: { userId: ctx.userId }, ...(options?.where ?? {}) };
    return getCrmDb(ctx).review.findMany({
      where,
      orderBy: options?.orderBy ?? { createdAt: 'desc' },
      take: options?.take,
      skip: options?.skip,
      include: options?.include,
    } as any);
  },
  async findUnique(ctx: DalContext, id: string, include?: any) {
    return getCrmDb(ctx).review.findFirst({ where: { id, campaign: { userId: ctx.userId } }, include } as any);
  },
  async create(ctx: DalContext, data: any) {
    return getCrmDb(ctx).review.create({ data: { ...data } } as any);
  },
  async update(ctx: DalContext, id: string, data: any) {
    return getCrmDb(ctx).review.update({ where: { id, campaign: { userId: ctx.userId } }, data } as any);
  },
  async delete(ctx: DalContext, id: string) {
    return getCrmDb(ctx).review.delete({ where: { id, campaign: { userId: ctx.userId } } } as any);
  },
  async count(ctx: DalContext, where?: any) {
    return getCrmDb(ctx).review.count({ where: { campaign: { userId: ctx.userId }, ...where } } as any);
  },
};
