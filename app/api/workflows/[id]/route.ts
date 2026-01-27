
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const workflow = await prisma.workflow.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
      include: {
        actions: {
          orderBy: { displayOrder: 'asc' },
        },
        enrollments: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            lead: true,
            deal: true,
            executions: {
              include: {
                action: true,
              },
            },
          },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    return NextResponse.json({ workflow });
  } catch (error: any) {
    console.error('Error fetching workflow:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check workflow exists and user owns it
    const existing = await prisma.workflow.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Update workflow
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (triggerType !== undefined) updateData.triggerType = triggerType;
    if (triggerConfig !== undefined) updateData.triggerConfig = triggerConfig;

    // If actions are provided, delete old ones and create new ones
    if (actions) {
      await prisma.workflowAction.deleteMany({
        where: { workflowId: params.id },
      });

      updateData.actions = {
        create: actions.map((action: any, index: number) => ({
          type: action.type,
          displayOrder: action.displayOrder ?? index,
          actionConfig: action.actionConfig || {},
          delayMinutes: action.delayMinutes,
          parentActionId: action.parentActionId,
        })),
      };
    }

    const workflow = await prisma.workflow.update({
      where: { id: params.id },
      data: updateData,
      include: {
        actions: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    return NextResponse.json({ workflow });
  } catch (error: any) {
    console.error('Error updating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to update workflow', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check workflow exists and user owns it
    const existing = await prisma.workflow.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Delete workflow (cascades to actions and enrollments)
    await prisma.workflow.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json(
      { error: 'Failed to delete workflow', details: error.message },
      { status: 500 }
    );
  }
}
