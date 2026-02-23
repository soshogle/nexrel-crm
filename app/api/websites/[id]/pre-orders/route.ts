/**
 * Pre-Orders API
 * Handle pre-orders for out-of-stock products
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { websitePreOrderService } from '@/lib/website-builder/pre-order-service';
import { apiErrors } from '@/lib/api-error';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { productId, customerEmail, customerName, customerPhone, quantity, expectedRestockDate, notes } = body;

    if (!productId || !customerEmail || !customerName || !quantity) {
      return apiErrors.badRequest('productId, customerEmail, customerName, and quantity are required');
    }

    const preOrder = await websitePreOrderService.createPreOrder({
      websiteId: params.id,
      productId,
      customerEmail,
      customerName,
      customerPhone,
      quantity,
      expectedRestockDate: expectedRestockDate ? new Date(expectedRestockDate) : undefined,
      notes,
    });

    return NextResponse.json({
      success: true,
      preOrder,
    });
  } catch (error: any) {
    console.error('Error creating pre-order:', error);
    return apiErrors.internal(error.message || 'Failed to create pre-order');
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const preOrders = await websitePreOrderService.getWebsitePreOrders(params.id);

    return NextResponse.json({
      success: true,
      preOrders,
    });
  } catch (error: any) {
    console.error('Error fetching pre-orders:', error);
    return apiErrors.internal(error.message || 'Failed to fetch pre-orders');
  }
}
