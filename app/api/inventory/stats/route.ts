import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

/**
 * GET INVENTORY STATISTICS
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }
    const db = getCrmDb(ctx);

    // Get all inventory items
    const items = await db.inventoryItem.findMany({
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
    const unresolvedAlertsCount = await db.stockAlert.count({
      where: {
        userId: session.user.id,
        isResolved: false,
      },
    });

    // Get pending purchase orders count
    const pendingPOCount = await db.purchaseOrder.count({
      where: {
        userId: session.user.id,
        status: {
          in: ["DRAFT", "SENT", "CONFIRMED"],
        },
      },
    });

    // Category breakdown
    const categoryBreakdown = await db.inventoryItem.groupBy({
      by: ["category"],
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
    console.error("❌ Stats fetch error:", error);
    return apiErrors.internal("Failed to fetch statistics");
  }
}
