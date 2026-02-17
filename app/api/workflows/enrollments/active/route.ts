/**
 * Get Active Drip Campaign Enrollments
 * Returns all active enrollments across all workflows for monitoring
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
    const statusParam = searchParams.get('status') || 'all';

    // Build where: 'all' = no status filter (for Monitor Jobs)
    const whereClause: { workflow: { userId: string }; status?: any } = {
      workflow: { userId: session.user.id },
    };
    if (statusParam !== 'all') {
      whereClause.status = statusParam as any;
    }

    const enrollments = await prisma.workflowTemplateEnrollment.findMany({
      where: whereClause,
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            executionMode: true,
          },
        },
        lead: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
            email: true,
            phone: true,
            status: true,
          },
        },
      },
      orderBy: {
        nextSendAt: 'asc', // Show next actions first
      },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      enrollments: enrollments.map(e => ({
        id: e.id,
        workflowId: e.workflowId,
        workflowName: e.workflow.name,
        leadId: e.leadId,
        lead: e.lead,
        status: e.status,
        currentStep: e.currentStep,
        nextSendAt: e.nextSendAt,
        enrolledAt: e.enrolledAt,
        completedAt: e.completedAt,
        abTestGroup: e.abTestGroup,
      })),
      total: enrollments.length,
    });
  } catch (error) {
    console.error('Error fetching active enrollments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enrollments' },
      { status: 500 }
    );
  }
}
