import { getCrmDb } from './db';
import type { DalContext } from './types';

export const paymentService = {
  async findMany(ctx: DalContext, options?: { take?: number; skip?: number; where?: any; include?: any; orderBy?: any }) {
    const where = { userId: ctx.userId, ...(options?.where ?? {}) };
    return getCrmDb(ctx).payment.findMany({
      where,
      orderBy: options?.orderBy ?? { createdAt: 'desc' },
      take: options?.take,
      skip: options?.skip,
      include: options?.include,
    } as any);
  },
  async findUnique(ctx: DalContext, id: string, include?: any) {
    return getCrmDb(ctx).payment.findFirst({ where: { id, userId: ctx.userId }, include } as any);
  },
  async create(ctx: DalContext, data: any) {
    return getCrmDb(ctx).payment.create({ data: { ...data, userId: ctx.userId } } as any);
  },
  async update(ctx: DalContext, id: string, data: any) {
    return getCrmDb(ctx).payment.update({ where: { id, userId: ctx.userId }, data } as any);
  },
  async delete(ctx: DalContext, id: string) {
    return getCrmDb(ctx).payment.delete({ where: { id, userId: ctx.userId } } as any);
  },
  async count(ctx: DalContext, where?: any) {
    return getCrmDb(ctx).payment.count({ where: { userId: ctx.userId, ...where } } as any);
  },
};
