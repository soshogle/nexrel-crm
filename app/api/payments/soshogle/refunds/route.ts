
/**
 * Soshogle Pay - Refunds API
 * POST /api/payments/soshogle/refunds - Create a refund
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { soshoglePay } from '@/lib/payments';
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
    const { paymentIntentId, amount, reason } = body;

    if (!paymentIntentId) {
      return apiErrors.badRequest('Payment intent ID is required');
    }

    const refund = await soshoglePay.refundPayment(
      paymentIntentId,
      amount,
      reason
    );

    return NextResponse.json({ success: true, refund });
  } catch (error: any) {
    console.error('❌ Refund creation error:', error);
    return apiErrors.internal(error.message || 'Failed to create refund');
  }
}
