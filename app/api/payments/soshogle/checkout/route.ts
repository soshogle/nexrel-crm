
/**
 * Soshogle Pay - Checkout API
 * Simplified checkout flow
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { soshogleCheckout } from '@/lib/payments';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { amount, currency, description, successUrl, cancelUrl, metadata } =
      body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
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
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
