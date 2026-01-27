
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { assignDriverToOrder, getDeliveryOrderById } from '@/lib/delivery-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.orderId || !body.driverId) {
      return NextResponse.json(
        { error: 'Missing orderId or driverId' },
        { status: 400 }
      );
    }

    // Verify user owns this order
    const orderResult = await getDeliveryOrderById(body.orderId);
    if (!orderResult.success || !orderResult.order) {
      return NextResponse.json({ error: orderResult.error || 'Order not found' }, { status: 404 });
    }

    if (orderResult.order.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await assignDriverToOrder(body.orderId, body.driverId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.order);
  } catch (error: any) {
    console.error('Error in POST /api/delivery/orders/assign:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
