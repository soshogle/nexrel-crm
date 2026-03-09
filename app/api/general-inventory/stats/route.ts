import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/general-inventory/stats - Get inventory statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const [
      totalItems,
      totalValue,
      lowStockItems,
      outOfStockItems,
      recentAdjustments,
    ] = await Promise.all([
      // Total active items
      db.generalInventoryItem.count({
        where: { userId: session.user.id, isActive: true },
      }),

      // Total inventory value
      db.generalInventoryItem.aggregate({
        where: { userId: session.user.id, isActive: true },
        _sum: {
          quantity: true,
        },
      }),

      // Low stock items (quantity <= reorderLevel)
      db.generalInventoryItem.findMany({
        where: {
          userId: session.user.id,
          isActive: true,
          quantity: { lte: db.generalInventoryItem.fields.reorderLevel },
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
      db.generalInventoryItem.count({
        where: { userId: session.user.id, isActive: true, quantity: 0 },
      }),

      // Recent adjustments
      db.generalInventoryAdjustment.findMany({
        where: { userId: session.user.id },
        include: {
          item: {
            select: {
              name: true,
              sku: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    // Calculate total value
    const items = await db.generalInventoryItem.findMany({
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
    console.error("Error fetching inventory stats:", error);
    return apiErrors.internal(error.message);
  }
}
