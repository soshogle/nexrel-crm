import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { taskService, getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { emitCRMEvent } from '@/lib/crm-event-emitter';
import { apiErrors } from '@/lib/api-error';
import { parsePagination, paginatedResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/tasks - List tasks with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assignedToId = searchParams.get('assignedToId');
    const category = searchParams.get('category');
    const leadId = searchParams.get('leadId');
    const dealId = searchParams.get('dealId');
    const parentTaskId = searchParams.get('parentTaskId');
    const search = searchParams.get('search');
    const overdue = searchParams.get('overdue');
    const pagination = parsePagination(request);

    const where: any = {
      OR: [{ userId: ctx.userId }, { assignedToId: ctx.userId }],
    };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedToId) where.assignedToId = assignedToId;
    if (category) where.category = category;
    if (leadId) where.leadId = leadId;
    if (dealId) where.dealId = dealId;
    if (parentTaskId === 'null') {
      where.parentTaskId = null;
    } else if (parentTaskId) {
      where.parentTaskId = parentTaskId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (overdue === 'true') {
      where.dueDate = { lt: new Date() };
      where.status = { notIn: ['COMPLETED', 'CANCELLED'] };
    }

    const tasks = await getCrmDb(ctx).task.findMany({
      where,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        lead: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
            phone: true,
          },
        },
        deal: {
          select: {
            id: true,
            title: true,
          },
        },
        dependsOn: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        subtasks: {
          select: {
            id: true,
            title: true,
            status: true,
            completedAt: true,
          },
        },
        _count: {
          select: {
            comments: true,
            attachments: true,
            subtasks: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
      take: pagination.take,
      skip: pagination.skip,
    } as any);

    const total = await getCrmDb(ctx).task.count({ where } as any);

    const isOrthoDemo = String(session.user.email || '').toLowerCase().trim() === 'orthodontist@nexrel.com';
    // Preserve demo behavior only for orthodontist demo account
    if (isOrthoDemo && tasks.length === 0 && total === 0) {
      const { MOCK_TASKS } = await import('@/lib/mock-data');
      const mockTasks = MOCK_TASKS.slice(pagination.skip, pagination.skip + pagination.take);
      return paginatedResponse(mockTasks, MOCK_TASKS.length, pagination, 'tasks');
    }

    return paginatedResponse(tasks, total, pagination, 'tasks');
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return apiErrors.internal(error.message || 'Failed to fetch tasks');
  }
}

// POST /api/tasks - Create new task
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const {
      title,
      description,
      priority,
      status,
      assignedToId,
      dueDate,
      startDate,
      category,
      tags,
      leadId,
      dealId,
      dependsOnId,
      parentTaskId,
      estimatedHours,
      aiSuggested,
      aiContext,
      autoCreated,
      automationRule,
    } = body;

    if (!title) {
      return apiErrors.badRequest('Title is required');
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    // Check if dependency task exists and is not completed
    if (dependsOnId) {
      const dependsTask = await taskService.findUnique(ctx, dependsOnId);
      if (!dependsTask) {
        return apiErrors.notFound('Dependency task not found');
      }
    }

    const task = await taskService.create(ctx, {
      title,
      description,
      priority: priority || 'MEDIUM',
      status: status || 'TODO',
      assignedToId,
      dueDate: dueDate ? new Date(dueDate) : null,
      startDate: startDate ? new Date(startDate) : null,
      category,
      tags: tags || [],
      leadId,
      dealId,
      dependsOnId,
      parentTaskId,
      estimatedHours,
      aiSuggested: aiSuggested || false,
      aiContext,
      autoCreated: autoCreated || false,
      automationRule,
    } as any);

    const taskWithInclude = await getCrmDb(ctx).task.findUnique({
      where: { id: task.id },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        lead: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
            phone: true,
          },
        },
        deal: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    emitCRMEvent('task_created', ctx.userId, { entityId: task.id, entityType: 'Task', data: { title } });

    // Create activity log
    await (getCrmDb(ctx) as any).taskActivity.create({
      data: {
        taskId: task.id,
        userId: ctx.userId,
        action: 'CREATED',
        newValue: 'Task created',
      },
    });

    // Track relationships automatically
    try {
      const { RelationshipHooks } = await import('@/lib/relationship-hooks');
      await RelationshipHooks.onTaskCreated({
        userId: ctx.userId,
        taskId: task.id,
        leadId: leadId,
        dealId: dealId,
      });
    } catch (error) {
      console.error('Error tracking task relationships:', error);
      // Don't fail the request if relationship tracking fails
    }

    return NextResponse.json({ task: taskWithInclude ?? task }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating task:', error);
    return apiErrors.internal(error.message || 'Failed to create task');
  }
}
