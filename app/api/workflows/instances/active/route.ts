/**
 * Get Active Workflow Instances
 * Returns all active workflow instances for monitoring (generic multi-industry)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status') || 'ACTIVE';

    // Get active workflow instances
    const instances = await prisma.workflowInstance.findMany({
      where: {
        userId: session.user.id,
        status: status as any,
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            executionMode: true,
            tasks: {
              select: {
                id: true,
                name: true,
                displayOrder: true,
              },
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
        lead: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
            email: true,
          },
        },
        deal: {
          select: {
            id: true,
            title: true,
          },
        },
        executions: {
          include: {
            task: {
              select: {
                id: true,
                name: true,
                displayOrder: true,
                delayValue: true,
                delayUnit: true,
              },
            },
          },
          orderBy: { startedAt: 'asc' },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      instances: instances.map(i => ({
        id: i.id,
        templateId: i.templateId,
        workflowName: i.template.name,
        executionMode: (i.template as any).executionMode || 'WORKFLOW',
        status: i.status,
        currentTaskId: i.currentTaskId,
        startedAt: i.startedAt,
        completedAt: i.completedAt,
        lead: i.lead,
        deal: i.deal,
        totalTasks: i.template.tasks.length,
        executions: i.executions.map(e => ({
          id: e.id,
          taskId: e.taskId,
          taskName: e.task.name,
          status: e.status,
          scheduledFor: e.scheduledFor || e.startedAt, // Fallback to startedAt if scheduledFor doesn't exist
          startedAt: e.startedAt,
          completedAt: e.completedAt,
        })),
      })),
      total: instances.length,
    });
  } catch (error) {
    console.error('Error fetching workflow instances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow instances' },
      { status: 500 }
    );
  }
}
