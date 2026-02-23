
/**
 * Soshogle Pay - Checkout API
 * Simplified checkout flow
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { soshogleCheckout } from '@/lib/payments';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await req.json();
    const { amount, currency, description, successUrl, cancelUrl, metadata } =
      body;

    if (!amount || amount <= 0) {
      return apiErrors.badRequest('Valid amount is required');
    }

    const checkout = await soshogleCheckout.createCheckout({
      userId: session.user.id,
      amount,
      currency,
      description,
      successUrl: successUrl || '/dashboard/payments/success',
      cancelUrl: cancelUrl || '/dashboard/payments/cancel',
      metadata,
    });

    return NextResponse.json({ success: true, checkout });
  } catch (error: any) {
    console.error('❌ Checkout creation error:', error);
    return apiErrors.internal(error.message || 'Failed to create checkout session');
  }
}
