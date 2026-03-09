import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

/**
 * GET KITCHEN ITEMS
 * List all kitchen order items with filtering
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
    const status = searchParams.get("status");
    const stationId = searchParams.get("stationId");
    const priority = searchParams.get("priority");
    const limit = parseInt(searchParams.get("limit") || "50");

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

    const items = await db.kitchenOrderItem.findMany({
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
            timestamp: "desc",
          },
          take: 5,
        },
      },
      orderBy: [{ priority: "desc" }, { receivedAt: "asc" }],
      take: limit,
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("❌ Kitchen items fetch error:", error);
    return apiErrors.internal("Failed to fetch kitchen items");
  }
}
