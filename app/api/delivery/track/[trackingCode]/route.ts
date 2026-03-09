import { NextRequest, NextResponse } from "next/server";
import { resolveDalContext } from "@/lib/context/industry-context";
import { getCrmDb } from "@/lib/dal";
import { getMetaDb } from "@/lib/db/meta-db";
import { apiErrors } from "@/lib/api-error";

/**
 * PUBLIC TRACKING ENDPOINT
 * Get delivery tracking information by tracking code
 * No authentication required - customers use this to track deliveries
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { trackingCode: string } },
) {
  try {
    const { trackingCode } = params;

    if (!trackingCode) {
      return apiErrors.badRequest("Tracking code is required");
    }

    const seedDelivery = await getMetaDb().deliveryOrder.findUnique({
      where: { trackingCode },
      select: { userId: true, id: true },
    });

    if (!seedDelivery?.userId) {
      return apiErrors.notFound("Delivery not found");
    }

    const ctx = await resolveDalContext(seedDelivery.userId);
    const db = getCrmDb(ctx);

    // Find delivery with driver and latest location
    const delivery = await db.deliveryOrder.findFirst({
      where: { trackingCode, userId: seedDelivery.userId },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
            vehicleType: true,
            licensePlate: true,
            vehicleModel: true,
            vehicleColor: true,
          },
        },
        locations: {
          orderBy: { createdAt: "desc" },
          take: 1, // Only get latest location
        },
      },
    });

    if (!delivery) {
      return apiErrors.notFound("Delivery not found");
    }

    const merchant = await getMetaDb().user.findUnique({
      where: { id: seedDelivery.userId },
      select: {
        name: true,
        phone: true,
      },
    });

    // Calculate ETA if driver is on the way
    let estimatedMinutesRemaining = null;
    let driverLocation = null;

    if (delivery.locations[0]) {
      const latestLocation = delivery.locations[0];
      driverLocation = {
        lat: parseFloat(latestLocation.lat.toString()),
        lng: parseFloat(latestLocation.lng.toString()),
        heading: latestLocation.heading
          ? parseFloat(latestLocation.heading.toString())
          : null,
        speed: latestLocation.speed
          ? parseFloat(latestLocation.speed.toString())
          : null,
        updatedAt: latestLocation.createdAt,
      };

      // Calculate distance from driver to delivery location
      if (delivery.deliveryLat && delivery.deliveryLng) {
        const distance = calculateDistance(
          parseFloat(latestLocation.lat.toString()),
          parseFloat(latestLocation.lng.toString()),
          parseFloat(delivery.deliveryLat.toString()),
          parseFloat(delivery.deliveryLng.toString()),
        );

        // Estimate time: assume avg speed of 30 km/h in city traffic
        const avgSpeed = latestLocation.speed
          ? parseFloat(latestLocation.speed.toString())
          : 30;
        estimatedMinutesRemaining = Math.round((distance / avgSpeed) * 60);
      }
    }

    // Format response for customer tracking page
    const trackingInfo = {
      orderNumber: delivery.orderNumber,
      status: delivery.status,
      customerName: delivery.customerName,
      merchantName: merchant?.name || "Merchant",
      merchantPhone: merchant?.phone,

      // Addresses
      pickupAddress: delivery.pickupAddress,
      deliveryAddress: delivery.deliveryAddress,

      // Coordinates for map
      pickup:
        delivery.pickupLat && delivery.pickupLng
          ? {
              lat: parseFloat(delivery.pickupLat.toString()),
              lng: parseFloat(delivery.pickupLng.toString()),
            }
          : null,
      delivery:
        delivery.deliveryLat && delivery.deliveryLng
          ? {
              lat: parseFloat(delivery.deliveryLat.toString()),
              lng: parseFloat(delivery.deliveryLng.toString()),
            }
          : null,

      // Driver info
      driver: delivery.driver
        ? {
            name: delivery.driver.name,
            phone: delivery.driver.phone,
            vehicleType: delivery.driver.vehicleType,
            vehicleNumber:
              delivery.driver.licensePlate ||
              delivery.driver.vehicleModel ||
              "N/A",
            vehicleColor: delivery.driver.vehicleColor,
            currentLocation: driverLocation,
          }
        : null,

      // Time estimates
      scheduledPickupTime: delivery.scheduledPickupTime,
      actualPickupTime: delivery.actualPickupTime,
      estimatedDeliveryTime: delivery.estimatedDeliveryTime,
      actualDeliveryTime: delivery.actualDeliveryTime,
      estimatedMinutesRemaining,

      // Additional info
      deliveryInstructions: delivery.deliveryInstructions,
      orderValue: parseFloat(delivery.orderValue.toString()),
      deliveryFee: parseFloat(delivery.deliveryFee.toString()),

      createdAt: delivery.createdAt,
      updatedAt: delivery.updatedAt,
    };

    return NextResponse.json(trackingInfo);
  } catch (error) {
    console.error("❌ Delivery tracking error:", error);
    return apiErrors.internal("Failed to fetch tracking information");
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
