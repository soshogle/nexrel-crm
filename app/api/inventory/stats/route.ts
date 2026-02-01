
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET INVENTORY STATISTICS
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all inventory items
    const items = await prisma.inventoryItem.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
    });

    // Calculate statistics
    const totalItems = items.length;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalValue = 0;

    items.forEach((item) => {
      const currentStock = Number(item.currentStock);
      const minimumStock = Number(item.minimumStock);
      const costPerUnit = Number(item.costPerUnit);

      if (currentStock <= 0) {
        outOfStockCount++;
      } else if (currentStock <= minimumStock) {
        lowStockCount++;
      }

      totalValue += currentStock * costPerUnit;
    });

    // Get unresolved alerts count
    const unresolvedAlertsCount = await prisma.stockAlert.count({
      where: {
        userId: session.user.id,
        isResolved: false,
      },
    });

    // Get pending purchase orders count
    const pendingPOCount = await prisma.purchaseOrder.count({
      where: {
        userId: session.user.id,
        status: {
          in: ['DRAFT', 'SENT', 'CONFIRMED'],
        },
      },
    });

    // Category breakdown
    const categoryBreakdown = await prisma.inventoryItem.groupBy({
      by: ['category'],
      where: {
        userId: session.user.id,
        isActive: true,
      },
      _count: {
        id: true,
      },
    });

    return NextResponse.json({
      totalItems,
      lowStockCount,
      outOfStockCount,
      totalValue: totalValue.toFixed(2),
      unresolvedAlertsCount,
      pendingPOCount,
      categoryBreakdown,
    });
  } catch (error) {
    console.error('❌ Stats fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
