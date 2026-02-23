
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  updateDriverLocation,
  getDriverCurrentLocation,
  DriverLocationInput,
} from '@/lib/delivery-service';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();

    // Validate required fields
    if (!body.driverId || body.lat === undefined || body.lng === undefined) {
      return apiErrors.badRequest('Missing required fields: driverId, lat, lng');
    }

    const input: DriverLocationInput = {
      driverId: body.driverId,
      deliveryOrderId: body.deliveryOrderId,
      lat: parseFloat(body.lat),
      lng: parseFloat(body.lng),
      heading: body.heading ? parseFloat(body.heading) : undefined,
      speed: body.speed ? parseFloat(body.speed) : undefined,
      accuracy: body.accuracy ? parseFloat(body.accuracy) : undefined,
    };

    const result = await updateDriverLocation(input);

    if (!result.success) {
      return apiErrors.internal(result.error);
    }

    return NextResponse.json(result.location, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/delivery/drivers/location:', error);
    return apiErrors.internal(error.message || 'Internal server error');
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const driverId = searchParams.get('driverId');

    if (!driverId) {
      return apiErrors.badRequest('Missing driverId');
    }

    const result = await getDriverCurrentLocation(driverId);

    if (!result.success) {
      return apiErrors.internal(result.error);
    }

    return NextResponse.json(result.location);
  } catch (error: any) {
    console.error('Error in GET /api/delivery/drivers/location:', error);
    return apiErrors.internal(error.message || 'Internal server error');
  }
}
