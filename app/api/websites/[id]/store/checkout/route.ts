/**
 * Public Store Checkout API
 * Creates Stripe payment intent for cart items (no auth - customer checkout)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { websiteStripeConnect } from '@/lib/website-builder/stripe-connect';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      items,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Cart items are required' },
        { status: 400 }
      );
    }

    if (!customerEmail) {
      return NextResponse.json(
        { error: 'Customer email is required' },
        { status: 400 }
      );
    }

    const website = await prisma.website.findUnique({
      where: { id: params.id },
      include: { user: true },
    });

    if (!website || !website.stripeConnectAccountId) {
      return NextResponse.json(
        { error: 'Store payment is not configured' },
        { status: 400 }
      );
    }

    // Validate items and get prices from DB
    const productIds = items.map((i: { productId: string }) => i.productId);
    const websiteProducts = await prisma.websiteProduct.findMany({
      where: {
        websiteId: params.id,
        productId: { in: productIds },
        isVisible: true,
      },
      include: { product: true },
    });

    const productMap = new Map(websiteProducts.map((wp) => [wp.productId, wp]));

    const orderItems: Array<{
      productId: string;
      name: string;
      sku: string;
      quantity: number;
      price: number;
    }> = [];
    let subtotalCents = 0;

    for (const item of items) {
      const wp = productMap.get(item.productId);
      if (!wp || !wp.product) continue;
      const qty = Math.max(1, parseInt(String(item.quantity), 10) || 1);
      const priceCents = wp.product.price ?? 0; // Product.price is stored in cents
      const available = wp.product.inventory ?? 0;
      if (qty > available) {
        return NextResponse.json(
          { error: `Insufficient stock for ${wp.product.name}` },
          { status: 400 }
        );
      }
      orderItems.push({
        productId: wp.productId,
        name: wp.product.name,
        sku: wp.product.sku ?? '',
        quantity: qty,
        price: priceCents / 100, // cents -> dollars for metadata
      });
      subtotalCents += priceCents * qty;
    }

    if (orderItems.length === 0) {
      return NextResponse.json(
        { error: 'No valid items in cart' },
        { status: 400 }
      );
    }

    const amountDollars = subtotalCents / 100;

    const result = await websiteStripeConnect.createPaymentIntent(params.id, {
      amount: amountDollars,
      currency: 'usd',
      customerEmail,
      customerName: customerName || 'Customer',
      description: `Order from ${website.name}`,
      metadata: {
        customerEmail,
        customerName: customerName || 'Customer',
        customerPhone: customerPhone || '',
        products: JSON.stringify(
          orderItems.map((p) => ({
            productId: p.productId,
            name: p.name,
            sku: p.sku,
            quantity: p.quantity,
            price: p.price,
          }))
        ),
        ...(shippingAddress && {
          shippingAddress: JSON.stringify(shippingAddress),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
      amount: amountDollars,
      orderNumber: null, // Assigned after payment
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Checkout failed' },
      { status: 500 }
    );
  }
}
