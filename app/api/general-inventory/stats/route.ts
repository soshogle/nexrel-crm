
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/general-inventory/stats - Get inventory statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [
      totalItems,
      totalValue,
      lowStockItems,
      outOfStockItems,
      recentAdjustments,
    ] = await Promise.all([
      // Total active items
      prisma.generalInventoryItem.count({
        where: { userId: session.user.id, isActive: true },
      }),

      // Total inventory value
      prisma.generalInventoryItem.aggregate({
        where: { userId: session.user.id, isActive: true },
        _sum: {
          quantity: true,
        },
      }),

      // Low stock items (quantity <= reorderLevel)
      prisma.generalInventoryItem.findMany({
        where: {
          userId: session.user.id,
          isActive: true,
          quantity: { lte: prisma.generalInventoryItem.fields.reorderLevel },
        },
        select: {
          id: true,
          name: true,
          sku: true,
          quantity: true,
          reorderLevel: true,
        },
        take: 10,
      }),

      // Out of stock items
      prisma.generalInventoryItem.count({
        where: { userId: session.user.id, isActive: true, quantity: 0 },
      }),

      // Recent adjustments
      prisma.generalInventoryAdjustment.findMany({
        where: { userId: session.user.id },
        include: {
          item: {
            select: {
              name: true,
              sku: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // Calculate total value
    const items = await prisma.generalInventoryItem.findMany({
      where: { userId: session.user.id, isActive: true },
      select: {
        quantity: true,
        costPrice: true,
      },
    });

    const totalInventoryValue = items.reduce((sum, item) => {
      const value = (item.costPrice || 0) * item.quantity;
      return sum + value;
    }, 0);

    return NextResponse.json({
      success: true,
      stats: {
        totalItems,
        totalInventoryValue,
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems,
        lowStockItems,
        recentAdjustments,
      },
    });
  } catch (error: any) {
    console.error('Error fetching inventory stats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
