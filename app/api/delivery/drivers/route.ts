
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createDriver,
  getDrivers,
  CreateDriverInput,
} from '@/lib/delivery-service';
import { DriverStatus } from '@prisma/client';


export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get('isActive');
    const isAvailable = searchParams.get('isAvailable');
    const status = searchParams.get('status') as DriverStatus | undefined;

    const result = await getDrivers({
      isActive: isActive !== null ? isActive === 'true' : undefined,
      isAvailable: isAvailable !== null ? isAvailable === 'true' : undefined,
      status,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.drivers);
  } catch (error: any) {
    console.error('Error in GET /api/delivery/drivers:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.phone) {
      return NextResponse.json(
        { error: 'Missing required fields: name and phone' },
        { status: 400 }
      );
    }

    const input: CreateDriverInput = {
      name: body.name,
      phone: body.phone,
      email: body.email,
      vehicleType: body.vehicleType,
      licensePlate: body.licensePlate,
      vehicleColor: body.vehicleColor,
      vehicleModel: body.vehicleModel,
      userId: session.user.id,
    };

    const result = await createDriver(input);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.driver, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/delivery/drivers:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
