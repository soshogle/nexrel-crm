
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  updateDriverLocation,
  getDriverCurrentLocation,
  DriverLocationInput,
} from '@/lib/delivery-service';


export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.driverId || body.lat === undefined || body.lng === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: driverId, lat, lng' },
        { status: 400 }
      );
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
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.location, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/delivery/drivers/location:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const driverId = searchParams.get('driverId');

    if (!driverId) {
      return NextResponse.json({ error: 'Missing driverId' }, { status: 400 });
    }

    const result = await getDriverCurrentLocation(driverId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.location);
  } catch (error: any) {
    console.error('Error in GET /api/delivery/drivers/location:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
