import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';
import { parsePagination, paginatedResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const pagination = parsePagination(req);

    const tasks = await getCrmDb(ctx).task.findMany({
      where: { userId: ctx.userId },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        deal: { select: { id: true, title: true } },
        lead: { select: { id: true, businessName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: pagination.take,
      skip: pagination.skip,
    });

    const total = await getCrmDb(ctx).task.count({ where: { userId: ctx.userId } });
    return paginatedResponse(tasks, total, pagination, 'tasks');
  } catch (error: unknown) {
    console.error('Error fetching tasks:', error);
    return apiErrors.internal('Failed to fetch tasks');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const body = await req.json();
    const { title, description, priority, dueDate, assignedToId, dealId, leadId } = body;

    const task = await getCrmDb(ctx).task.create({
      data: {
        userId: ctx.userId,
        title,
        description,
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedToId,
        dealId,
        leadId,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating task:', error);
    return apiErrors.internal('Failed to create task');
  }
}
