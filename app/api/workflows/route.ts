
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get workflows with their actions
    const workflows = await prisma.workflow.findMany({
      where: { userId: user.id },
      include: {
        actions: {
          orderBy: { displayOrder: 'asc' },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ workflows });
  } catch (error: any) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflows', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, status, triggerType, triggerConfig, actions } = body;

    // Validate required fields
    if (!name || !triggerType) {
      return NextResponse.json(
        { error: 'Name and trigger type are required' },
        { status: 400 }
      );
    }

    // Create workflow with actions
    const workflow = await prisma.workflow.create({
      data: {
        userId: user.id,
        name,
        description,
        status: status || 'DRAFT',
        triggerType,
        triggerConfig: triggerConfig || {},
        actions: {
          create: (actions || []).map((action: any, index: number) => ({
            type: action.type,
            displayOrder: action.displayOrder ?? index,
            actionConfig: action.actionConfig || {},
            delayMinutes: action.delayMinutes,
            parentActionId: action.parentActionId,
          })),
        },
      },
      include: {
        actions: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    return NextResponse.json({ workflow }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow', details: error.message },
      { status: 500 }
    );
  }
}
