
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createDriver,
  getDrivers,
  CreateDriverInput,
} from '@/lib/delivery-service';
import { DriverStatus } from '@prisma/client';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
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
      return apiErrors.internal(result.error);
    }

    return NextResponse.json(result.drivers);
  } catch (error: any) {
    console.error('Error in GET /api/delivery/drivers:', error);
    return apiErrors.internal(error.message || 'Internal server error');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.phone) {
      return apiErrors.badRequest('Missing required fields: name and phone');
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
      return apiErrors.badRequest(result.error);
    }

    return NextResponse.json(result.driver, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/delivery/drivers:', error);
    return apiErrors.internal(error.message || 'Internal server error');
  }
}
