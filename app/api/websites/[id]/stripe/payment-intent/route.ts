/**
 * Create Payment Intent for Website
 */

import { NextRequest, NextResponse } from 'next/server';
import { websiteStripeConnect } from '@/lib/website-builder/stripe-connect';
import { apiErrors } from '@/lib/api-error';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      amount,
      currency = 'usd',
      customerEmail,
      customerName,
      description,
      metadata,
    } = body;

    if (!amount || amount <= 0) {
      return apiErrors.badRequest('Amount is required and must be greater than 0');
    }

    const result = await websiteStripeConnect.createPaymentIntent(params.id, {
      amount,
      currency,
      customerEmail,
      customerName,
      description,
      metadata: {
        ...metadata,
        websiteId: params.id,
      },
    });

    return NextResponse.json({
      success: true,
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
    });
  } catch (error: any) {
    console.error('Payment intent error:', error);
    return apiErrors.internal(error.message || 'Failed to create payment intent');
  }
}
