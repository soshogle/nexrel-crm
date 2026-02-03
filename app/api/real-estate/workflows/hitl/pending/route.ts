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

    // Get pending HITL notifications
    const notifications = await prisma.rEHITLNotification.findMany({
      where: {
        userId: session.user.id,
        isActioned: false
      },
      orderBy: { createdAt: 'desc' }
    });

    // Also get task executions awaiting HITL
    const awaitingApproval = await prisma.rETaskExecution.findMany({
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
      orderBy: { createdAt: 'desc' }
    });

    // Enrich with agent names
    const enrichedApprovals = awaitingApproval.map((execution: {
      task: { assignedAgentType: REAIEmployeeType | null };
      [key: string]: unknown;
    }) => ({
      ...execution,
      agentName: execution.task.assignedAgentType 
        ? RE_AGENT_NAMES[execution.task.assignedAgentType] 
        : 'System'
    }));

    return NextResponse.json({
      success: true,
      notifications,
      pendingApprovals: enrichedApprovals,
      totalPending: awaitingApproval.length
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
