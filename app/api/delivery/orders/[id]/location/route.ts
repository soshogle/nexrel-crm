import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

/**
 * UPDATE DRIVER LOCATION
 * Records driver's current location for real-time tracking
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
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const { id } = params;
    const body = await req.json();
    const { lat, lng, heading, speed, accuracy } = body;

    // Validate coordinates
    if (!lat || !lng) {
      return apiErrors.badRequest("Latitude and longitude are required");
    }

    // Verify delivery exists and belongs to user
    const delivery = await db.deliveryOrder.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        driver: true,
      },
    });

    if (!delivery) {
      return apiErrors.notFound("Delivery order not found");
    }

    if (!delivery.driverId) {
      return apiErrors.badRequest("No driver assigned to this delivery");
    }

    // Record location
    const location = await db.driverLocation.create({
      data: {
        driverId: delivery.driverId,
        deliveryOrderId: delivery.id,
        lat,
        lng,
        heading,
        speed,
        accuracy,
      },
    });

    // Calculate updated ETA based on new location
    let updatedETA = delivery.estimatedDeliveryTime;
    if (delivery.deliveryLat && delivery.deliveryLng) {
      const distance = calculateDistance(
        parseFloat(lat.toString()),
        parseFloat(lng.toString()),
        parseFloat(delivery.deliveryLat.toString()),
        parseFloat(delivery.deliveryLng.toString()),
      );

      // Update ETA: assume avg speed of 30 km/h or use actual speed if available
      const avgSpeed = speed || 30;
      const minutesRemaining = Math.round((distance / avgSpeed) * 60);
      updatedETA = new Date(Date.now() + minutesRemaining * 60 * 1000);

      // Update delivery order with new ETA
      await db.deliveryOrder.update({
        where: { id },
        data: { estimatedDeliveryTime: updatedETA },
      });
    }

    return NextResponse.json({
      success: true,
      location: {
        ...location,
        lat: parseFloat(location.lat.toString()),
        lng: parseFloat(location.lng.toString()),
        heading: location.heading
          ? parseFloat(location.heading.toString())
          : null,
        speed: location.speed ? parseFloat(location.speed.toString()) : null,
      },
      estimatedDeliveryTime: updatedETA,
    });
  } catch (error) {
    console.error("❌ Location update error:", error);
    return apiErrors.internal("Failed to update location");
  }
}

/**
 * GET LOCATION HISTORY
 * Retrieve driver's location history for a delivery
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const { id } = params;

    // Verify delivery exists and belongs to user
    const delivery = await db.deliveryOrder.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!delivery) {
      return apiErrors.notFound("Delivery order not found");
    }

    // Get location history (last 50 points)
    const locations = await db.driverLocation.findMany({
      where: { deliveryOrderId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const formattedLocations = locations.map((loc) => ({
      lat: parseFloat(loc.lat.toString()),
      lng: parseFloat(loc.lng.toString()),
      heading: loc.heading ? parseFloat(loc.heading.toString()) : null,
      speed: loc.speed ? parseFloat(loc.speed.toString()) : null,
      timestamp: loc.createdAt,
    }));

    return NextResponse.json({ locations: formattedLocations });
  } catch (error) {
    console.error("❌ Location history error:", error);
    return apiErrors.internal("Failed to fetch location history");
  }
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
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
