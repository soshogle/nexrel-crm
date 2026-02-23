
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getDeliveryOrderById,
  updateDeliveryOrder,
  UpdateDeliveryOrderInput,
} from '@/lib/delivery-service';
import { DeliveryStatus } from '@prisma/client';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const result = await getDeliveryOrderById(params.id);

    if (!result.success || !result.order) {
      return apiErrors.notFound(result.error || 'Order not found');
    }

    // Verify user owns this order
    if (result.order.userId !== session.user.id) {
      return apiErrors.forbidden();
    }

    return NextResponse.json(result.order);
  } catch (error: any) {
    console.error('Error in GET /api/delivery/orders/[id]:', error);
    return apiErrors.internal(error.message || 'Internal server error');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    // First check if order exists and user owns it
    const orderResult = await getDeliveryOrderById(params.id);
    if (!orderResult.success || !orderResult.order) {
      return apiErrors.notFound(orderResult.error || 'Order not found');
    }

    if (orderResult.order.userId !== session.user.id) {
      return apiErrors.forbidden();
    }

    const body = await request.json();

    const input: UpdateDeliveryOrderInput = {};

    if (body.status) {
      input.status = body.status as DeliveryStatus;
    }

    if (body.driverId) {
      input.driverId = body.driverId;
    }

    if (body.actualPickupTime) {
      input.actualPickupTime = new Date(body.actualPickupTime);
    }

    if (body.actualDeliveryTime) {
      input.actualDeliveryTime = new Date(body.actualDeliveryTime);
    }

    if (body.distanceKm) {
      input.distanceKm = parseFloat(body.distanceKm);
    }

    if (body.estimatedDurationMin) {
      input.estimatedDurationMin = parseInt(body.estimatedDurationMin);
    }

    const result = await updateDeliveryOrder(params.id, input);

    if (!result.success) {
      return apiErrors.internal(result.error);
    }

    return NextResponse.json(result.order);
  } catch (error: any) {
    console.error('Error in PATCH /api/delivery/orders/[id]:', error);
    return apiErrors.internal(error.message || 'Internal server error');
  }
}
