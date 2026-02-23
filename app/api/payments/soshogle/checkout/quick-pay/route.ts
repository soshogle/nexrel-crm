
/**
 * Soshogle Pay - Quick Pay API
 * POST /api/payments/soshogle/checkout/quick-pay
 * Process quick payments with saved payment methods
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
    const { amount, paymentMethodId } = body;

    if (!amount || amount <= 0) {
      return apiErrors.badRequest('Valid amount is required');
    }

    const paymentIntent = await soshogleCheckout.quickPay(
      session.user.id,
      amount,
      paymentMethodId
    );

    return NextResponse.json({ success: true, paymentIntent });
  } catch (error: any) {
    console.error('❌ Quick pay error:', error);
    return apiErrors.internal(error.message || 'Failed to process quick payment');
  }
}
