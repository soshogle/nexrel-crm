
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createDeliveryZone,
  getDeliveryZones,
  CreateDeliveryZoneInput,
} from '@/lib/delivery-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getDeliveryZones(session.user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.zones);
  } catch (error: any) {
    console.error('Error in GET /api/delivery/zones:', error);
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
    if (
      !body.name ||
      !body.polygon ||
      body.deliveryFee === undefined ||
      body.minimumOrder === undefined ||
      !body.estimatedTimeMin
    ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const input: CreateDeliveryZoneInput = {
      userId: session.user.id,
      name: body.name,
      description: body.description,
      polygon: body.polygon,
      deliveryFee: parseFloat(body.deliveryFee),
      minimumOrder: parseFloat(body.minimumOrder),
      estimatedTimeMin: parseInt(body.estimatedTimeMin),
    };

    const result = await createDeliveryZone(input);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.zone, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/delivery/zones:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
