/**
 * Website Orders API
 * Get orders for a website with customer tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { websiteOrderService } from '@/lib/website-builder/order-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customerEmail = searchParams.get('customerEmail');
    const limit = parseInt(searchParams.get('limit') || '50');

    const orders = await websiteOrderService.getWebsiteOrders(params.id);

    // Filter orders
    let filteredOrders = orders;
    if (status) {
      filteredOrders = filteredOrders.filter((o) => o.status === status);
    }
    if (customerEmail) {
      filteredOrders = filteredOrders.filter((o) => o.customerEmail === customerEmail);
    }

    // Limit results
    filteredOrders = filteredOrders.slice(0, limit);

    return NextResponse.json({
      success: true,
      orders: filteredOrders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.total,
        items: order.items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
        })),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching website orders:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
