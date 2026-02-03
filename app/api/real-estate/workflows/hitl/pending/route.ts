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

// GET - Get all pending HITL approvals
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get pending HITL notifications (with error handling and timeout protection)
    let notifications: any[] = [];
    try {
      // Add timeout to prevent 508 errors
      const notificationsPromise = prisma.rEHITLNotification.findMany({
        where: {
          userId: session.user.id,
          isActioned: false
        },
        orderBy: { createdAt: 'desc' },
        take: 50, // Limit to prevent timeouts
      });
      
      notifications = await Promise.race([
        notificationsPromise,
        new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 5000)) // 5 second timeout
      ]);
    } catch (notifError: any) {
      console.error('[HITL Pending] Error fetching notifications:', notifError);
      // Continue with empty array if notifications fail
      notifications = [];
    }

    // Also get task executions awaiting HITL (with error handling and timeout protection)
    let awaitingApproval: any[] = [];
    try {
      const executionsPromise = prisma.rETaskExecution.findMany({
        where: {
          instance: {
            userId: session.user.id
          },
          status: 'AWAITING_HITL'
        },
        include: {
          task: {
            select: {
              name: true,
              description: true,
              taskType: true,
              assignedAgentType: true,
              actionConfig: true
            }
          },
          instance: {
            include: {
              template: {
                select: { name: true, type: true }
              },
              lead: {
                select: { id: true, businessName: true, contactPerson: true, email: true, phone: true }
              },
              deal: {
                select: { id: true, title: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50, // Limit to prevent timeouts
      });
      
      awaitingApproval = await Promise.race([
        executionsPromise,
        new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 5000)) // 5 second timeout
      ]);
    } catch (execError: any) {
      console.error('[HITL Pending] Error fetching task executions:', execError);
      // Continue with empty array if executions fail
      awaitingApproval = [];
    }

    // Enrich with agent names (with error handling)
    const enrichedApprovals = awaitingApproval.map((execution: {
      task: { assignedAgentType: REAIEmployeeType | null };
      [key: string]: unknown;
    }) => {
      try {
        return {
          ...execution,
          agentName: execution.task.assignedAgentType 
            ? RE_AGENT_NAMES[execution.task.assignedAgentType] 
            : 'System'
        };
      } catch (mapError: any) {
        console.error('[HITL Pending] Error enriching approval:', mapError);
        return {
          ...execution,
          agentName: 'System'
        };
      }
    });

    return NextResponse.json({
      success: true,
      notifications: notifications || [],
      pendingApprovals: enrichedApprovals || [],
      totalPending: enrichedApprovals.length
    });
  } catch (error: any) {
    console.error('Error fetching HITL approvals:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch pending approvals',
        details: error?.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}
