import { NextRequest, NextResponse } from "next/server";
import { resolveDalContext } from "@/lib/context/industry-context";
import { getCrmDb } from "@/lib/dal";
import { getMetaDb } from "@/lib/db/meta-db";
import { apiErrors } from "@/lib/api-error";

/**
 * GET ORDER STATUS (PUBLIC)
 * Get order status by order number - no authentication required
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { orderNumber: string } },
) {
  try {
    const seedOrder = await getMetaDb().pOSOrder.findFirst({
      where: { orderNumber: params.orderNumber },
      select: { userId: true },
    });

    if (!seedOrder?.userId) {
      return apiErrors.notFound("Order not found");
    }

    const ctx = await resolveDalContext(seedOrder.userId);
    const db = getCrmDb(ctx);

    // Find POS order
    const posOrder = await db.pOSOrder.findFirst({
      where: {
        orderNumber: params.orderNumber,
        userId: seedOrder.userId,
      },
      include: {
        items: true,
        staff: {
          select: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!posOrder) {
      return apiErrors.notFound("Order not found");
    }

    // Get kitchen items for this order
    const kitchenItems = await db.kitchenOrderItem.findMany({
      where: {
        posOrderId: posOrder.id,
      },
      include: {
        station: {
          select: {
            name: true,
          },
        },
      },
    });

    // Get delivery order if exists
    const deliveryOrder = await db.deliveryOrder.findFirst({
      where: {
        orderNumber: params.orderNumber,
        userId: seedOrder.userId,
      },
      include: {
        driver: {
          select: {
            name: true,
            phone: true,
            vehicleType: true,
            vehicleModel: true,
            licensePlate: true,
            vehicleColor: true,
          },
        },
      },
    });

    // Calculate progress
    let progress = 0;
    let statusMessage = "Order received";
    let estimatedTime = "";

    if (posOrder.status === "COMPLETED") {
      progress = 100;
      statusMessage = "Order completed";
    } else if (deliveryOrder) {
      if (deliveryOrder.status === "DELIVERED") {
        progress = 100;
        statusMessage = "Delivered";
      } else if (deliveryOrder.status === "IN_TRANSIT") {
        progress = 75;
        statusMessage = "Out for delivery";
        if (deliveryOrder.estimatedDeliveryTime) {
          const eta = Math.round(
            (deliveryOrder.estimatedDeliveryTime.getTime() - Date.now()) /
              60000,
          );
          estimatedTime = `${eta} mins`;
        }
      } else if (deliveryOrder.status === "PICKED_UP") {
        progress = 60;
        statusMessage = "Driver on the way";
      } else if (deliveryOrder.status === "ASSIGNED") {
        progress = 40;
        statusMessage = "Driver assigned";
      }
    } else if (kitchenItems.length > 0) {
      const completedItems = kitchenItems.filter(
        (i) => i.status === "BUMPED",
      ).length;
      const totalItems = kitchenItems.length;

      if (completedItems === totalItems) {
        progress = 50;
        statusMessage = "Ready for pickup/delivery";
      } else if (completedItems > 0) {
        progress = 30 + (completedItems / totalItems) * 20;
        statusMessage = `Preparing (${completedItems}/${totalItems} items ready)`;
      } else if (kitchenItems.some((i) => i.status === "PREPARING")) {
        progress = 25;
        statusMessage = "Being prepared";

        // Calculate average prep time
        const preparingItems = kitchenItems.filter(
          (i) => i.status === "PREPARING",
        );
        if (preparingItems.length > 0 && preparingItems[0].startedAt) {
          const avgPrepTime = 15; // minutes (should be calculated from historical data)
          const elapsed = Math.round(
            (Date.now() - preparingItems[0].startedAt.getTime()) / 60000,
          );
          estimatedTime = `${Math.max(0, avgPrepTime - elapsed)} mins`;
        }
      } else {
        progress = 10;
        statusMessage = "In queue";
      }
    }

    // Get merchant info
    const merchant = await getMetaDb().user.findUnique({
      where: { id: posOrder.userId },
      select: {
        name: true,
        phone: true,
        address: true,
      },
    });

    return NextResponse.json({
      orderNumber: posOrder.orderNumber,
      status: posOrder.status,
      progress,
      statusMessage,
      estimatedTime,
      createdAt: posOrder.createdAt,
      orderType: posOrder.orderType,
      customerName: posOrder.customerName,
      total: Number(posOrder.total).toFixed(2),
      items: posOrder.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: Number(item.unitPrice).toFixed(2),
      })),
      kitchenItems: kitchenItems.map((item) => ({
        name: item.itemName,
        quantity: item.quantity,
        status: item.status,
        station: item.station?.name,
        startedAt: item.startedAt,
        completedAt: item.completedAt,
      })),
      delivery: deliveryOrder
        ? {
            status: deliveryOrder.status,
            trackingCode: deliveryOrder.trackingCode,
            driverName: deliveryOrder.driver?.name,
            driverPhone: deliveryOrder.driver?.phone,
            vehicle: deliveryOrder.driver?.vehicleModel
              ? `${deliveryOrder.driver.vehicleType} - ${deliveryOrder.driver.vehicleModel}`
              : deliveryOrder.driver?.vehicleType,
            vehicleColor: deliveryOrder.driver?.vehicleColor,
            licensePlate: deliveryOrder.driver?.licensePlate,
            pickupAddress: deliveryOrder.pickupAddress,
            deliveryAddress: deliveryOrder.deliveryAddress,
            estimatedDeliveryTime: deliveryOrder.estimatedDeliveryTime,
          }
        : null,
      merchant: {
        name: merchant?.name,
        phone: merchant?.phone,
        address: merchant?.address,
      },
    });
  } catch (error) {
    console.error("❌ Order status fetch error:", error);
    return apiErrors.internal("Failed to fetch order status");
  }
}
