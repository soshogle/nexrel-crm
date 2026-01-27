
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET KITCHEN ITEMS
 * List all kitchen order items with filtering
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const stationId = searchParams.get('stationId');
    const priority = searchParams.get('priority');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = { userId: session.user.id };

    if (status) {
      where.status = status;
    }
    if (stationId) {
      where.stationId = stationId;
    }
    if (priority) {
      where.priority = priority;
    }

    const items = await prisma.kitchenOrderItem.findMany({
      where,
      include: {
        posOrder: {
          select: {
            orderNumber: true,
            orderType: true,
            tableNumber: true,
            customerName: true,
          },
        },
        posOrderItem: {
          select: {
            name: true,
            quantity: true,
            modifiers: true,
            notes: true,
          },
        },
        station: {
          select: {
            name: true,
            displayName: true,
            color: true,
            icon: true,
          },
        },
        prepLogs: {
          orderBy: {
            timestamp: 'desc',
          },
          take: 5,
        },
      },
      orderBy: [
        { priority: 'desc' },
        { receivedAt: 'asc' },
      ],
      take: limit,
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('❌ Kitchen items fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch kitchen items' },
      { status: 500 }
    );
  }
}
