import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

/**
 * BUMP KITCHEN ITEM
 * Mark item as complete and picked up
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
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
    const db = getCrmDb(ctx);

    const body = await req.json();
    const { staffId, staffName, notes } = body;

    // Get current item
    const item = await db.kitchenOrderItem.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!item) {
      return apiErrors.notFound("Kitchen item not found");
    }

    // Update to BUMPED status
    const updateData: any = {
      status: "BUMPED",
    };

    // Set completed time if not already set
    if (!item.completedAt) {
      updateData.completedAt = new Date();
    }

    const updatedItem = await db.kitchenOrderItem.update({
      where: { id: params.id },
      data: updateData,
      include: {
        posOrder: {
          select: {
            orderNumber: true,
            orderType: true,
          },
        },
      },
    });

    // Create prep log
    await db.prepLog.create({
      data: {
        kitchenItemId: params.id,
        action: "BUMPED" as any,
        previousStatus: item.status as any,
        newStatus: "BUMPED" as any,
        staffId,
        staffName,
        notes,
      },
    });

    // Check if all items in order are bumped
    const allItems = await db.kitchenOrderItem.findMany({
      where: { posOrderId: updatedItem.posOrderId },
    });

    const allBumped = allItems.every((i) => i.status === "BUMPED");

    if (allBumped) {
      await db.pOSOrder.update({
        where: { id: updatedItem.posOrderId },
        data: { status: "COMPLETED" },
      });
    }

    console.log(`✅ Kitchen item bumped: ${item.itemName}`);

    return NextResponse.json({
      success: true,
      item: updatedItem,
      orderCompleted: allBumped,
    });
  } catch (error) {
    console.error("❌ Kitchen item bump error:", error);
    return apiErrors.internal("Failed to bump item");
  }
}
