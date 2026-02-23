
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { assignDriverToOrder, getDeliveryOrderById } from '@/lib/delivery-service';
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

    if (!body.orderId || !body.driverId) {
      return apiErrors.badRequest('Missing orderId or driverId');
    }

    // Verify user owns this order
    const orderResult = await getDeliveryOrderById(body.orderId);
    if (!orderResult.success || !orderResult.order) {
      return apiErrors.notFound(orderResult.error || 'Order not found');
    }

    if (orderResult.order.userId !== session.user.id) {
      return apiErrors.forbidden();
    }

    const result = await assignDriverToOrder(body.orderId, body.driverId);

    if (!result.success) {
      return apiErrors.internal(result.error);
    }

    return NextResponse.json(result.order);
  } catch (error: any) {
    console.error('Error in POST /api/delivery/orders/assign:', error);
    return apiErrors.internal(error.message || 'Internal server error');
  }
}
