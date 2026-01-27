
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/tasks - List tasks with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    const limit = parseInt(searchParams.get('limit') || '100');

    const where: any = {
      userId: session.user.id,
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

    const tasks = await prisma.task.findMany({
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
      take: limit,
    });

    return NextResponse.json({ tasks });
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create new task
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Check if dependency task exists and is not completed
    if (dependsOnId) {
      const dependsTask = await prisma.task.findUnique({
        where: { id: dependsOnId },
      });
      if (!dependsTask) {
        return NextResponse.json(
          { error: 'Dependency task not found' },
          { status: 404 }
        );
      }
    }

    const task = await prisma.task.create({
      data: {
        userId: session.user.id,
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
      },
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

    // Create activity log
    await prisma.taskActivity.create({
      data: {
        taskId: task.id,
        userId: session.user.id,
        action: 'CREATED',
        newValue: 'Task created',
      },
    });

    // Track relationships automatically
    try {
      const { RelationshipHooks } = await import('@/lib/relationship-hooks');
      await RelationshipHooks.onTaskCreated({
        userId: session.user.id,
        taskId: task.id,
        leadId: leadId,
        dealId: dealId,
      });
    } catch (error) {
      console.error('Error tracking task relationships:', error);
      // Don't fail the request if relationship tracking fails
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create task' },
      { status: 500 }
    );
  }
}
