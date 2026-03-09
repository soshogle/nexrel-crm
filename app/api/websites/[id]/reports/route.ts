/**
 * Advanced Reporting API
 * Generate comprehensive reports with export capabilities
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { getCrmDb } from "@/lib/dal";
import { websiteOrderService } from "@/lib/website-builder/order-service";
import { websiteStockSyncService } from "@/lib/website-builder/stock-sync-service";
import { apiErrors } from "@/lib/api-error";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type") || "sales";
    const format = searchParams.get("format") || "json"; // json, csv
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    let report: any = {};

    switch (reportType) {
      case "sales":
        report = await generateSalesReport(params.id, start, end);
        break;
      case "inventory":
        report = await generateInventoryReport(params.id);
        break;
      case "products":
        report = await generateProductsReport(ctx, params.id);
        break;
      case "customers":
        report = await generateCustomersReport(params.id, start, end);
        break;
      default:
        return apiErrors.badRequest("Invalid report type");
    }

    if (format === "csv") {
      const csv = convertToCSV(report);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${reportType}-report-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      reportType,
      period: { start, end },
      generatedAt: new Date().toISOString(),
      data: report,
    });
  } catch (error: any) {
    console.error("Error generating report:", error);
    return apiErrors.internal(error.message || "Failed to generate report");
  }
}

async function generateSalesReport(websiteId: string, start: Date, end: Date) {
  const orders = await websiteOrderService.getWebsiteOrders(websiteId);
  const filteredOrders = orders.filter(
    (o) => new Date(o.createdAt) >= start && new Date(o.createdAt) <= end,
  );

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = filteredOrders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Daily breakdown
  const dailySales: Record<string, { revenue: number; orders: number }> = {};
  filteredOrders.forEach((order) => {
    const date = new Date(order.createdAt).toISOString().split("T")[0];
    if (!dailySales[date]) {
      dailySales[date] = { revenue: 0, orders: 0 };
    }
    dailySales[date].revenue += order.total;
    dailySales[date].orders += 1;
  });

  return {
    summary: {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      period: { start, end },
    },
    dailyBreakdown: Object.entries(dailySales).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      orders: data.orders,
    })),
    orders: filteredOrders.map((o) => ({
      orderNumber: o.orderNumber,
      customerEmail: o.customerEmail,
      total: o.total,
      status: o.status,
      createdAt: o.createdAt,
    })),
  };
}

async function generateInventoryReport(websiteId: string) {
  const status = await websiteStockSyncService.getWebsiteStockStatus(websiteId);
  const healthScore =
    await websiteStockSyncService.calculateInventoryHealthScore(websiteId);

  return {
    healthScore,
    summary: status.summary,
    products: status.products.map((p: any) => ({
      name: p.name,
      sku: p.sku,
      stock: p.stock,
      status: p.status,
      isVisible: p.isVisible,
    })),
  };
}

async function generateProductsReport(
  ctx: NonNullable<ReturnType<typeof getDalContextFromSession>>,
  websiteId: string,
) {
  const websiteProducts = await getCrmDb(ctx).websiteProduct.findMany({
    where: { websiteId },
    include: {
      product: true,
    },
  });

  return {
    totalProducts: websiteProducts.length,
    visibleProducts: websiteProducts.filter((wp) => wp.isVisible).length,
    products: websiteProducts.map((wp) => ({
      name: wp.product.name,
      sku: wp.product.sku,
      price: wp.product.price,
      inventory: wp.product.inventory,
      isVisible: wp.isVisible,
    })),
  };
}

async function generateCustomersReport(
  websiteId: string,
  start: Date,
  end: Date,
) {
  const orders = await websiteOrderService.getWebsiteOrders(websiteId);
  const filteredOrders = orders.filter(
    (o) => new Date(o.createdAt) >= start && new Date(o.createdAt) <= end,
  );

  const customers: Record<
    string,
    { email: string; name: string; orders: number; totalSpent: number }
  > = {};
  filteredOrders.forEach((order) => {
    if (!customers[order.customerEmail]) {
      customers[order.customerEmail] = {
        email: order.customerEmail,
        name: order.customerName,
        orders: 0,
        totalSpent: 0,
      };
    }
    customers[order.customerEmail].orders += 1;
    customers[order.customerEmail].totalSpent += order.total;
  });

  return {
    totalCustomers: Object.keys(customers).length,
    customers: Object.values(customers).sort(
      (a, b) => b.totalSpent - a.totalSpent,
    ),
  };
}

function convertToCSV(report: any): string {
  // Simple CSV conversion - can be enhanced
  if (report.summary) {
    return Object.entries(report.summary)
      .map(([key, value]) => `${key},${value}`)
      .join("\n");
  }
  return JSON.stringify(report);
}
