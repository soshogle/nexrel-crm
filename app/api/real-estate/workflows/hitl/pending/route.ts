/**
 * Real Estate HITL Pending Approvals API
 * Get all pending human-in-the-loop approvals for the user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { RE_AGENT_NAMES } from '@/lib/real-estate/workflow-templates';
import { REAIEmployeeType } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let notifications: any[] = [];
    try {
      const notificationsPromise = prisma.rEHITLNotification.findMany({
        where: {
          userId: session.user.id,
          isActioned: false,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      notifications = await Promise.race([
        notificationsPromise,
        new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 5000)),
      ]);
    } catch (notifError: any) {
      console.error('[HITL Pending] Error fetching notifications:', notifError);
      notifications = [];
    }

    let awaitingApproval: any[] = [];
    try {
      const executionsPromise = prisma.rETaskExecution.findMany({
        where: {
          instance: { userId: session.user.id },
          status: 'AWAITING_HITL',
        },
        include: {
          task: {
            select: {
              id: true,
              name: true,
              description: true,
              taskType: true,
              assignedAgentType: true,
              actionConfig: true,
            },
          },
          instance: {
            include: {
              template: { select: { id: true, name: true, type: true } },
              lead: { select: { id: true, businessName: true, contactPerson: true, email: true, phone: true } },
              deal: { select: { id: true, title: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      awaitingApproval = await Promise.race([
        executionsPromise,
        new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 5000)),
      ]);
    } catch (execError: any) {
      console.error('[HITL Pending] Error fetching task executions:', execError);
      awaitingApproval = [];
    }

    // Enrich notifications with execution data so the UI can display full context
    const executionMap = new Map<string, any>();
    for (const exec of awaitingApproval) {
      executionMap.set(exec.id, exec);
    }

    const enrichedNotifications = notifications.map((notif: any) => {
      const execution = notif.executionId ? executionMap.get(notif.executionId) : null;
      return {
        ...notif,
        taskExecution: execution
          ? {
              id: execution.id,
              task: execution.task || null,
              workflowInstance: execution.instance
                ? {
                    id: execution.instance.id,
                    workflow: execution.instance.template || null,
                    lead: execution.instance.lead || null,
                    deal: execution.instance.deal || null,
                  }
                : null,
            }
          : null,
      };
    });

    const enrichedApprovals = awaitingApproval.map(
      (execution: { task: { assignedAgentType: REAIEmployeeType | null }; [key: string]: unknown }) => {
        try {
          return {
            ...execution,
            agentName: execution.task.assignedAgentType
              ? RE_AGENT_NAMES[execution.task.assignedAgentType]
              : 'System',
          };
        } catch {
          return { ...execution, agentName: 'System' };
        }
      }
    );

    return NextResponse.json({
      success: true,
      notifications: enrichedNotifications || [],
      pendingApprovals: enrichedApprovals || [],
      totalPending: (enrichedApprovals || []).length,
    });
  } catch (error: any) {
    console.error('[HITL Pending] Error fetching HITL approvals:', error);
    return NextResponse.json({
      success: true,
      notifications: [],
      pendingApprovals: [],
      totalPending: 0,
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined,
    });
  }
}
