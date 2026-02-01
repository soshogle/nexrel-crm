
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * SIMULATE DRIVER LOCATION
 * For testing purposes - simulates driver movement from pickup to delivery
 * In production, this would be replaced by actual GPS data from driver's mobile app
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deliveryOrderId, progress } = await req.json();

    if (!deliveryOrderId) {
      return NextResponse.json(
        { error: 'Delivery order ID is required' },
        { status: 400 }
      );
    }

    // Get delivery order with coordinates
    const delivery = await prisma.deliveryOrder.findFirst({
      where: {
        id: deliveryOrderId,
        userId: session.user.id,
      },
    });

    if (!delivery) {
      return NextResponse.json(
        { error: 'Delivery order not found' },
        { status: 404 }
      );
    }

    if (!delivery.driverId || !delivery.pickupLat || !delivery.pickupLng || !delivery.deliveryLat || !delivery.deliveryLng) {
      return NextResponse.json(
        { error: 'Delivery order must have driver and coordinates assigned' },
        { status: 400 }
      );
    }

    // Calculate simulated location based on progress (0-1)
    const progressValue = progress !== undefined ? progress : Math.random();
    
    const pickupLat = parseFloat(delivery.pickupLat.toString());
    const pickupLng = parseFloat(delivery.pickupLng.toString());
    const deliveryLat = parseFloat(delivery.deliveryLat.toString());
    const deliveryLng = parseFloat(delivery.deliveryLng.toString());

    // Interpolate position
    const currentLat = pickupLat + (deliveryLat - pickupLat) * progressValue;
    const currentLng = pickupLng + (deliveryLng - pickupLng) * progressValue;

    // Calculate heading (direction of travel)
    const heading = calculateBearing(currentLat, currentLng, deliveryLat, deliveryLng);

    // Simulate speed (20-40 km/h)
    const speed = 25 + Math.random() * 15;

    // Record location
    const location = await prisma.driverLocation.create({
      data: {
        driverId: delivery.driverId,
        deliveryOrderId: delivery.id,
        lat: currentLat,
        lng: currentLng,
        heading,
        speed,
        accuracy: 10, // 10 meters accuracy
      },
    });

    // Calculate ETA based on remaining distance
    const remainingDistance = calculateDistance(
      currentLat,
      currentLng,
      deliveryLat,
      deliveryLng
    );
    const minutesRemaining = Math.round((remainingDistance / speed) * 60);
    const estimatedDeliveryTime = new Date(Date.now() + minutesRemaining * 60 * 1000);

    // Update delivery order
    await prisma.deliveryOrder.update({
      where: { id: deliveryOrderId },
      data: { estimatedDeliveryTime },
    });

    return NextResponse.json({
      success: true,
      location: {
        lat: currentLat,
        lng: currentLng,
        heading,
        speed,
      },
      progress: progressValue,
      minutesRemaining,
      estimatedDeliveryTime,
    });
  } catch (error) {
    console.error('❌ Simulate location error:', error);
    return NextResponse.json(
      { error: 'Failed to simulate location' },
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

function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  const bearing = Math.atan2(y, x);
  return (toDeg(bearing) + 360) % 360;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function toDeg(radians: number): number {
  return radians * (180 / Math.PI);
}
