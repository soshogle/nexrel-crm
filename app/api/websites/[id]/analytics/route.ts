/**
 * Website Analytics API
 * Provides inventory health, sales analytics, and insights
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { websiteStockSyncService } from '@/lib/website-builder/stock-sync-service';
import { websiteOrderService } from '@/lib/website-builder/order-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days

    // Get website
    const website = await prisma.website.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });

    if (!website || website.userId !== session.user.id) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Get orders for this website
    const orders = await websiteOrderService.getWebsiteOrders(params.id);

    // Filter orders by period
    const recentOrders = orders.filter(
      (order) => new Date(order.createdAt) >= startDate
    );

    // Calculate sales metrics
    const totalRevenue = recentOrders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = recentOrders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Get inventory health
    const stockStatus = await websiteStockSyncService.getWebsiteStockStatus(params.id);
    const healthScore = await websiteStockSyncService.calculateInventoryHealthScore(params.id);

    // Get top selling products
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    recentOrders.forEach((order) => {
      order.items.forEach((item) => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            name: item.productName,
            quantity: 0,
            revenue: 0,
          };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += item.total;
      });
    });

    const topProducts = Object.entries(productSales)
      .map(([productId, data]) => ({
        productId,
        ...data,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Get products needing restock
    const productsNeedingRestock = await websiteStockSyncService.getProductsNeedingRestock(
      params.id
    );

    // Calculate growth metrics (compare to previous period)
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - parseInt(period));
    
    const previousOrders = orders.filter(
      (order) =>
        new Date(order.createdAt) >= previousStartDate &&
        new Date(order.createdAt) < startDate
    );

    const previousRevenue = previousOrders.reduce((sum, order) => sum + order.total, 0);
    const revenueGrowth = previousRevenue > 0
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
      : 0;

    return NextResponse.json({
      success: true,
      analytics: {
        period: parseInt(period),
        sales: {
          totalRevenue,
          totalOrders,
          averageOrderValue,
          revenueGrowth,
          orders: recentOrders.map((order) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            total: order.total,
            status: order.status,
            createdAt: order.createdAt,
          })),
        },
        inventory: {
          healthScore,
          summary: stockStatus.summary,
          productsNeedingRestock: productsNeedingRestock.length,
        },
        topProducts,
        productsNeedingRestock: productsNeedingRestock.slice(0, 10),
      },
    });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
