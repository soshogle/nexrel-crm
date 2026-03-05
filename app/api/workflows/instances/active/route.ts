/**
 * Get Active Workflow Instances
 * Returns all active workflow instances for monitoring (generic multi-industry)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRouteDb } from '@/lib/dal/get-route-db';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const statusParam = searchParams.get('status') || 'all';

    // Build where clause: 'all' = no status filter (for Monitor Jobs)
    const whereClause: { userId: string; status?: any } = {
      userId: session.user.id,
    };
    if (statusParam !== 'all') {
      whereClause.status = statusParam as any;
    }

    const db = getRouteDb(session);
    const instances = await (db as any).workflowInstance.findMany({
      where: whereClause,
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
      instances: instances.map((i: any) => ({
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
        executions: i.executions.map((e: any) => ({
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
    return apiErrors.internal('Failed to fetch workflow instances');
  }
}
