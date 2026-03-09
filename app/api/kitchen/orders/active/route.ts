import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

/**
 * GET ACTIVE KITCHEN ORDERS
 * List all orders currently in the kitchen
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

    const { searchParams } = new URL(req.url);
    const stationId = searchParams.get("stationId");

    // Get active kitchen items
    const where: any = {
      userId: session.user.id,
      status: {
        in: ["PENDING", "PREPARING", "READY"],
      },
    };

    if (stationId) {
      where.stationId = stationId;
    }

    const kitchenItems = await db.kitchenOrderItem.findMany({
      where,
      include: {
        posOrder: {
          select: {
            id: true,
            orderNumber: true,
            orderType: true,
            tableNumber: true,
            customerName: true,
            createdAt: true,
          },
        },
        station: {
          select: {
            id: true,
            displayName: true,
            color: true,
            icon: true,
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
      },
      orderBy: [{ priority: "desc" }, { receivedAt: "asc" }],
    });

    // Group by order
    const ordersMap = new Map();
    kitchenItems.forEach((item) => {
      const orderId = item.posOrder.id;
      if (!ordersMap.has(orderId)) {
        ordersMap.set(orderId, {
          ...item.posOrder,
          items: [],
          totalItems: 0,
          pendingItems: 0,
          preparingItems: 0,
          readyItems: 0,
        });
      }

      const order = ordersMap.get(orderId);
      order.items.push(item);
      order.totalItems++;

      if (item.status === "PENDING") order.pendingItems++;
      if (item.status === "PREPARING") order.preparingItems++;
      if (item.status === "READY") order.readyItems++;
    });

    const orders = Array.from(ordersMap.values());

    return NextResponse.json({
      orders,
      totalOrders: orders.length,
      totalItems: kitchenItems.length,
    });
  } catch (error) {
    console.error("❌ Active orders fetch error:", error);
    return apiErrors.internal("Failed to fetch active orders");
  }
}
