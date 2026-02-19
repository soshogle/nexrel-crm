import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { WorkflowInstancesQuerySchema } from '@/lib/api-validation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/real-estate/workflows/instances - List workflow instances for user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const queryResult = WorkflowInstancesQuerySchema.safeParse({
      status: searchParams.get('status') ?? undefined,
      leadId: searchParams.get('leadId') ?? undefined,
      dealId: searchParams.get('dealId') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      cursor: searchParams.get('cursor') ?? undefined,
    });
    if (!queryResult.success) {
      return apiErrors.validationError('Invalid query parameters', queryResult.error.flatten());
    }
    const { status, leadId, dealId, limit, cursor } = queryResult.data;

    const where: any = {
      template: {
        userId: session.user.id,
      },
    };

    if (status) {
      where.status = status;
    }
    if (leadId) {
      where.leadId = leadId;
    }
    if (dealId) {
      where.dealId = dealId;
    }

    const instances = await prisma.rEWorkflowInstance.findMany({
      where,
      take: limit + 1, // Fetch one extra to check if there's a next page
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { startedAt: 'desc' },
      include: {
        template: {
          include: {
            tasks: {
              orderBy: { displayOrder: 'asc' },
              select: {
                id: true,
                name: true,
                displayOrder: true,
                isHITL: true,
              },
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
            value: true,
          },
        },
        executions: {
          include: {
            task: {
              select: {
                id: true,
                name: true,
                displayOrder: true,
                isHITL: true,
              },
            },
          },
          orderBy: { startedAt: 'asc' },
        },
      },
    });

    const hasMore = instances.length > limit;
    const items = hasMore ? instances.slice(0, limit) : instances;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return NextResponse.json({
      instances: items,
      nextCursor,
      hasMore: !!nextCursor,
    });
  } catch (error) {
    logger.error('Error fetching workflow instances', { component: 'workflow-instances', error: String(error) });
    return apiErrors.internal('Failed to fetch workflow instances');
  }
}
