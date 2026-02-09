/**
 * Order Tracking API
 * Get order tracking information for customers
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; orderId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email'); // Customer email for verification

    const order = await prisma.order.findUnique({
      where: { id: params.orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify customer email if provided
    if (email && order.customerEmail !== email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get website order link
    const websiteOrder = await prisma.websiteOrder.findFirst({
      where: { orderId: params.orderId },
      select: { websiteId: true },
    });

    const trackingInfo = {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: order.total,
      items: order.items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
      })),
      shippingAddress: order.shippingAddress,
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      estimatedDelivery: order.trackingNumber
        ? new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days from now
        : null,
    };

    return NextResponse.json({
      success: true,
      tracking: trackingInfo,
    });
  } catch (error: any) {
    console.error('Error fetching order tracking:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tracking' },
      { status: 500 }
    );
  }
}
