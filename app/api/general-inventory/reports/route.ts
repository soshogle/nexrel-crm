
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/general-inventory/reports - Generate various inventory reports
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const reports: any = {};

    // Stock Movement Report
    if (reportType === 'all' || reportType === 'stock-movement') {
      const dateFilter: any = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);

      const adjustments = await prisma.generalInventoryAdjustment.findMany({
        where: {
          userId: session.user.id,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
        include: {
          item: {
            select: {
              name: true,
              sku: true,
              category: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      // Group by type
      const movementByType = adjustments.reduce((acc: any, adj) => {
        if (!acc[adj.type]) {
          acc[adj.type] = { count: 0, totalQuantity: 0, items: [] };
        }
        acc[adj.type].count++;
        acc[adj.type].totalQuantity += adj.quantity;
        acc[adj.type].items.push({
          itemName: adj.item.name,
          itemSku: adj.item.sku,
          category: adj.item.category?.name || 'Uncategorized',
          quantity: adj.quantity,
          type: adj.type,
          date: adj.createdAt,
          reason: adj.reason,
        });
        return acc;
      }, {});

      reports.stockMovement = {
        totalMovements: adjustments.length,
        byType: movementByType,
        recentMovements: adjustments.slice(0, 20).map((adj) => ({
          id: adj.id,
          itemName: adj.item.name,
          itemSku: adj.item.sku,
          type: adj.type,
          quantity: adj.quantity,
          quantityBefore: adj.quantityBefore,
          quantityAfter: adj.quantityAfter,
          date: adj.createdAt,
          reason: adj.reason,
          unitCost: adj.unitCost,
        })),
      };
    }

    // Inventory Valuation Report
    if (reportType === 'all' || reportType === 'valuation') {
      const items = await prisma.generalInventoryItem.findMany({
        where: {
          userId: session.user.id,
          isActive: true,
        },
        include: {
          category: { select: { name: true } },
          supplier: { select: { name: true } },
          location: { select: { name: true } },
        },
      });

      const valuationByCategory: any = {};
      const valuationBySupplier: any = {};
      const valuationByLocation: any = {};
      let totalCostValue = 0;
      let totalSellingValue = 0;

      items.forEach((item) => {
        const costValue = (item.costPrice || 0) * item.quantity;
        const sellingValue = (item.sellingPrice || 0) * item.quantity;
        totalCostValue += costValue;
        totalSellingValue += sellingValue;

        // By Category
        const catName = item.category?.name || 'Uncategorized';
        if (!valuationByCategory[catName]) {
          valuationByCategory[catName] = { items: 0, quantity: 0, costValue: 0, sellingValue: 0 };
        }
        valuationByCategory[catName].items++;
        valuationByCategory[catName].quantity += item.quantity;
        valuationByCategory[catName].costValue += costValue;
        valuationByCategory[catName].sellingValue += sellingValue;

        // By Supplier
        const suppName = item.supplier?.name || 'No Supplier';
        if (!valuationBySupplier[suppName]) {
          valuationBySupplier[suppName] = { items: 0, quantity: 0, costValue: 0, sellingValue: 0 };
        }
        valuationBySupplier[suppName].items++;
        valuationBySupplier[suppName].quantity += item.quantity;
        valuationBySupplier[suppName].costValue += costValue;
        valuationBySupplier[suppName].sellingValue += sellingValue;

        // By Location
        const locName = item.location?.name || 'No Location';
        if (!valuationByLocation[locName]) {
          valuationByLocation[locName] = { items: 0, quantity: 0, costValue: 0, sellingValue: 0 };
        }
        valuationByLocation[locName].items++;
        valuationByLocation[locName].quantity += item.quantity;
        valuationByLocation[locName].costValue += costValue;
        valuationByLocation[locName].sellingValue += sellingValue;
      });

      reports.valuation = {
        totalItems: items.length,
        totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
        totalCostValue,
        totalSellingValue,
        potentialProfit: totalSellingValue - totalCostValue,
        profitMargin: totalCostValue > 0 ? ((totalSellingValue - totalCostValue) / totalCostValue) * 100 : 0,
        byCategory: valuationByCategory,
        bySupplier: valuationBySupplier,
        byLocation: valuationByLocation,
        topValueItems: items
          .map((item) => ({
            name: item.name,
            sku: item.sku,
            quantity: item.quantity,
            costValue: (item.costPrice || 0) * item.quantity,
            sellingValue: (item.sellingPrice || 0) * item.quantity,
          }))
          .sort((a, b) => b.costValue - a.costValue)
          .slice(0, 10),
      };
    }

    // Low Stock Alert Report
    if (reportType === 'all' || reportType === 'low-stock') {
      const lowStockItems = await prisma.generalInventoryItem.findMany({
        where: {
          userId: session.user.id,
          isActive: true,
          OR: [
            { quantity: { lte: prisma.generalInventoryItem.fields.reorderLevel } },
            { quantity: 0 },
          ],
        },
        include: {
          category: { select: { name: true } },
          supplier: { select: { name: true } },
          location: { select: { name: true } },
        },
        orderBy: { quantity: 'asc' },
      });

      const outOfStock = lowStockItems.filter((item) => item.quantity === 0);
      const criticalStock = lowStockItems.filter(
        (item) => item.quantity > 0 && item.quantity <= item.reorderLevel / 2
      );
      const lowStock = lowStockItems.filter(
        (item) => item.quantity > item.reorderLevel / 2 && item.quantity <= item.reorderLevel
      );

      reports.lowStock = {
        totalAlerts: lowStockItems.length,
        outOfStock: outOfStock.length,
        criticalStock: criticalStock.length,
        lowStock: lowStock.length,
        items: lowStockItems.map((item) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          category: item.category?.name || 'Uncategorized',
          supplier: item.supplier?.name || 'No Supplier',
          location: item.location?.name || 'No Location',
          quantity: item.quantity,
          reorderLevel: item.reorderLevel,
          reorderQuantity: item.reorderQuantity,
          status:
            item.quantity === 0
              ? 'OUT_OF_STOCK'
              : item.quantity <= item.reorderLevel / 2
              ? 'CRITICAL'
              : 'LOW',
        })),
      };
    }

    // Category Performance Report
    if (reportType === 'all' || reportType === 'category-performance') {
      const categories = await prisma.generalInventoryCategory.findMany({
        where: { userId: session.user.id },
        include: {
          items: {
            where: { isActive: true },
            select: {
              quantity: true,
              costPrice: true,
              sellingPrice: true,
            },
          },
        },
      });

      const categoryPerformance = categories.map((cat) => {
        const totalItems = cat.items.length;
        const totalQuantity = cat.items.reduce((sum, item) => sum + item.quantity, 0);
        const totalCostValue = cat.items.reduce(
          (sum, item) => sum + (item.costPrice || 0) * item.quantity,
          0
        );
        const totalSellingValue = cat.items.reduce(
          (sum, item) => sum + (item.sellingPrice || 0) * item.quantity,
          0
        );

        return {
          categoryName: cat.name,
          totalItems,
          totalQuantity,
          totalCostValue,
          totalSellingValue,
          potentialProfit: totalSellingValue - totalCostValue,
        };
      });

      reports.categoryPerformance = categoryPerformance.sort(
        (a, b) => b.totalCostValue - a.totalCostValue
      );
    }

    return NextResponse.json({ success: true, reports });
  } catch (error: any) {
    console.error('Error generating reports:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate reports' },
      { status: 500 }
    );
  }
}
