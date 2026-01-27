
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * UPDATE DRIVER LOCATION
 * Records driver's current location for real-time tracking
 */

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { lat, lng, heading, speed, accuracy } = body;

    // Validate coordinates
    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Verify delivery exists and belongs to user
    const delivery = await prisma.deliveryOrder.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        driver: true,
      },
    });

    if (!delivery) {
      return NextResponse.json(
        { error: 'Delivery order not found' },
        { status: 404 }
      );
    }

    if (!delivery.driverId) {
      return NextResponse.json(
        { error: 'No driver assigned to this delivery' },
        { status: 400 }
      );
    }

    // Record location
    const location = await prisma.driverLocation.create({
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
        parseFloat(delivery.deliveryLng.toString())
      );

      // Update ETA: assume avg speed of 30 km/h or use actual speed if available
      const avgSpeed = speed || 30;
      const minutesRemaining = Math.round((distance / avgSpeed) * 60);
      updatedETA = new Date(Date.now() + minutesRemaining * 60 * 1000);

      // Update delivery order with new ETA
      await prisma.deliveryOrder.update({
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
        heading: location.heading ? parseFloat(location.heading.toString()) : null,
        speed: location.speed ? parseFloat(location.speed.toString()) : null,
      },
      estimatedDeliveryTime: updatedETA,
    });
  } catch (error) {
    console.error('❌ Location update error:', error);
    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    );
  }
}

/**
 * GET LOCATION HISTORY
 * Retrieve driver's location history for a delivery
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Verify delivery exists and belongs to user
    const delivery = await prisma.deliveryOrder.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!delivery) {
      return NextResponse.json(
        { error: 'Delivery order not found' },
        { status: 404 }
      );
    }

    // Get location history (last 50 points)
    const locations = await prisma.driverLocation.findMany({
      where: { deliveryOrderId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const formattedLocations = locations.map(loc => ({
      lat: parseFloat(loc.lat.toString()),
      lng: parseFloat(loc.lng.toString()),
      heading: loc.heading ? parseFloat(loc.heading.toString()) : null,
      speed: loc.speed ? parseFloat(loc.speed.toString()) : null,
      timestamp: loc.createdAt,
    }));

    return NextResponse.json({ locations: formattedLocations });
  } catch (error) {
    console.error('❌ Location history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch location history' },
      { status: 500 }
    );
  }
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
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
