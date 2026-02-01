
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getDriverById,
  updateDriver,
  UpdateDriverInput,
} from '@/lib/delivery-service';
import { DriverStatus } from '@prisma/client';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getDriverById(params.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json(result.driver);
  } catch (error: any) {
    console.error('Error in GET /api/delivery/drivers/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const input: UpdateDriverInput = {};

    if (body.name) input.name = body.name;
    if (body.email !== undefined) input.email = body.email;
    if (body.vehicleType) input.vehicleType = body.vehicleType;
    if (body.licensePlate !== undefined) input.licensePlate = body.licensePlate;
    if (body.vehicleColor !== undefined) input.vehicleColor = body.vehicleColor;
    if (body.vehicleModel !== undefined) input.vehicleModel = body.vehicleModel;
    if (body.status) input.status = body.status as DriverStatus;
    if (body.isAvailable !== undefined) input.isAvailable = body.isAvailable;
    if (body.isActive !== undefined) input.isActive = body.isActive;

    const result = await updateDriver(params.id, input);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.driver);
  } catch (error: any) {
    console.error('Error in PATCH /api/delivery/drivers/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
