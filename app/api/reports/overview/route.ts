
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET COMPREHENSIVE OVERVIEW REPORT
 * Combines all system metrics into one dashboard
 */

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '7d'; // 1d, 7d, 30d, 90d

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    switch (period) {
      case '1d':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
    }

    // POS Sales Metrics
    const posOrders = await prisma.pOSOrder.findMany({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: true,
      },
    });

    const totalRevenue = posOrders.reduce(
      (sum, order) => sum + Number(order.total),
      0
    );
    const averageOrderValue = posOrders.length > 0 ? totalRevenue / posOrders.length : 0;
    const completedOrders = posOrders.filter(o => o.status === 'COMPLETED').length;

    // Kitchen Performance
    const kitchenItems = await prisma.kitchenOrderItem.findMany({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalPrepTime = kitchenItems.reduce((sum, item) => {
      if (item.completedAt && item.startedAt) {
        return sum + (item.completedAt.getTime() - item.startedAt.getTime());
      }
      return sum;
    }, 0);

    const averagePrepTime = kitchenItems.length > 0
      ? Math.round(totalPrepTime / kitchenItems.length / 1000 / 60) // minutes
      : 0;

    // Inventory Status
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
    });

    const lowStockCount = inventoryItems.filter(
      item => Number(item.currentStock) <= Number(item.minimumStock)
    ).length;

    const outOfStockCount = inventoryItems.filter(
      item => Number(item.currentStock) <= 0
    ).length;

    const totalInventoryValue = inventoryItems.reduce(
      (sum, item) => sum + (Number(item.currentStock) * Number(item.costPerUnit)),
      0
    );

    // Delivery Performance
    const deliveryOrders = await prisma.deliveryOrder.findMany({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const completedDeliveries = deliveryOrders.filter(
      d => d.status === 'DELIVERED'
    ).length;

    const averageDeliveryTime = deliveryOrders.length > 0
      ? deliveryOrders.reduce((sum, d) => {
          if (d.actualDeliveryTime && d.actualPickupTime) {
            return sum + (d.actualDeliveryTime.getTime() - d.actualPickupTime.getTime());
          }
          return sum;
        }, 0) / deliveryOrders.length / 1000 / 60 // minutes
      : 0;

    // Reservations
    const reservations = await prisma.reservation.findMany({
      where: {
        userId: session.user.id,
        reservationDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const confirmedReservations = reservations.filter(
      r => r.status === 'CONFIRMED'
    ).length;

    // Top Selling Products
    const posOrderItems = posOrders.flatMap(order => order.items);
    const productSales = posOrderItems.reduce((acc: any, item) => {
      const name = item.name;
      if (!acc[name]) {
        acc[name] = {
          name,
          quantity: 0,
          revenue: 0,
        };
      }
      acc[name].quantity += item.quantity;
      acc[name].revenue += Number(item.unitPrice) * item.quantity;
      return acc;
    }, {});

    const topProducts = Object.values(productSales)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 10);

    // Revenue Trend (daily breakdown)
    const revenueTrend = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const dayOrders = posOrders.filter(
        order =>
          order.createdAt >= dayStart &&
          order.createdAt <= dayEnd
      );

      const dayRevenue = dayOrders.reduce(
        (sum, order) => sum + Number(order.total),
        0
      );

      revenueTrend.push({
        date: currentDate.toISOString().split('T')[0],
        revenue: dayRevenue,
        orders: dayOrders.length,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json({
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      sales: {
        totalRevenue: totalRevenue.toFixed(2),
        totalOrders: posOrders.length,
        completedOrders,
        averageOrderValue: averageOrderValue.toFixed(2),
      },
      kitchen: {
        totalItems: kitchenItems.length,
        averagePrepTime: `${averagePrepTime} mins`,
        completedItems: kitchenItems.filter(i => i.status === 'BUMPED').length,
      },
      inventory: {
        totalItems: inventoryItems.length,
        lowStockCount,
        outOfStockCount,
        totalValue: totalInventoryValue.toFixed(2),
      },
      delivery: {
        totalDeliveries: deliveryOrders.length,
        completedDeliveries,
        averageTime: `${Math.round(averageDeliveryTime)} mins`,
      },
      reservations: {
        total: reservations.length,
        confirmed: confirmedReservations,
        pending: reservations.filter(r => r.status === 'PENDING').length,
      },
      topProducts,
      revenueTrend,
    });
  } catch (error) {
    console.error('❌ Overview report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
