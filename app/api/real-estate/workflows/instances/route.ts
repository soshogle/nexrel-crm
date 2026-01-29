import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/real-estate/workflows/instances - List workflow instances for user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const leadId = searchParams.get('leadId');
    const dealId = searchParams.get('dealId');
    const limit = parseInt(searchParams.get('limit') || '50');

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
      take: limit,
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

    return NextResponse.json({ instances });
  } catch (error) {
    console.error('Error fetching workflow instances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow instances' },
      { status: 500 }
    );
  }
}
