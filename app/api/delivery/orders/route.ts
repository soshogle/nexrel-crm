
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createDeliveryOrder,
  getDeliveryOrders,
  CreateDeliveryOrderInput,
} from '@/lib/delivery-service';
import { DeliveryStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as DeliveryStatus | undefined;
    const driverId = searchParams.get('driverId') || undefined;
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined;

    const result = await getDeliveryOrders(session.user.id, {
      status,
      driverId,
      startDate,
      endDate,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.orders);
  } catch (error: any) {
    console.error('Error in GET /api/delivery/orders:', error);
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
      !body.orderValue ||
      !body.pickupAddress ||
      !body.deliveryAddress ||
      !body.customerName ||
      !body.customerPhone ||
      !body.deliveryFee
    ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const input: CreateDeliveryOrderInput = {
      userId: session.user.id,
      orderNumber: body.orderNumber,
      orderValue: parseFloat(body.orderValue),
      pickupAddress: body.pickupAddress,
      deliveryAddress: body.deliveryAddress,
      pickupLat: body.pickupLat ? parseFloat(body.pickupLat) : undefined,
      pickupLng: body.pickupLng ? parseFloat(body.pickupLng) : undefined,
      deliveryLat: body.deliveryLat ? parseFloat(body.deliveryLat) : undefined,
      deliveryLng: body.deliveryLng ? parseFloat(body.deliveryLng) : undefined,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerEmail: body.customerEmail,
      deliveryInstructions: body.deliveryInstructions,
      deliveryFee: parseFloat(body.deliveryFee),
      scheduledPickupTime: body.scheduledPickupTime
        ? new Date(body.scheduledPickupTime)
        : undefined,
    };

    const result = await createDeliveryOrder(input);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.order, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/delivery/orders:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
