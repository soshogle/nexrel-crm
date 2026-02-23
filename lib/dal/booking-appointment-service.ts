import { getCrmDb } from './db';
import type { DalContext } from './types';

export const bookingAppointmentService = {
  async findMany(ctx: DalContext, options?: { take?: number; skip?: number; where?: any; include?: any; orderBy?: any; search?: string; status?: string }) {
    const where: any = { userId: ctx.userId, ...(options?.where ?? {}) };
    
    if (options?.search) {
      where.OR = [
        { customerName: { contains: options.search, mode: 'insensitive' } },
      ];
    }
    
    if (options?.status) {
      where.status = options.status;
    }
    
    return getCrmDb(ctx).bookingAppointment.findMany({
      where,
      orderBy: options?.orderBy ?? { createdAt: 'desc' },
      take: options?.take,
      skip: options?.skip,
      include: options?.include,
    } as any);
  },
  async findUnique(ctx: DalContext, id: string, include?: any) {
    return getCrmDb(ctx).bookingAppointment.findFirst({ where: { id, userId: ctx.userId }, include } as any);
  },
  async create(ctx: DalContext, data: any) {
    return getCrmDb(ctx).bookingAppointment.create({ data: { ...data, userId: ctx.userId } } as any);
  },
  async update(ctx: DalContext, id: string, data: any) {
    return getCrmDb(ctx).bookingAppointment.update({ where: { id, userId: ctx.userId }, data } as any);
  },
  async delete(ctx: DalContext, id: string) {
    return getCrmDb(ctx).bookingAppointment.delete({ where: { id, userId: ctx.userId } } as any);
  },
  async count(ctx: DalContext, where?: any) {
    return getCrmDb(ctx).bookingAppointment.count({ where: { userId: ctx.userId, ...where } } as any);
  },
};
