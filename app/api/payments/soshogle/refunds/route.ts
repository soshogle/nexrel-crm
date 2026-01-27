
/**
 * Soshogle Pay - Refunds API
 * POST /api/payments/soshogle/refunds - Create a refund
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { soshoglePay } from '@/lib/payments';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { paymentIntentId, amount, reason } = body;

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment intent ID is required' },
        { status: 400 }
      );
    }

    const refund = await soshoglePay.refundPayment(
      paymentIntentId,
      amount,
      reason
    );

    return NextResponse.json({ success: true, refund });
  } catch (error: any) {
    console.error('❌ Refund creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create refund' },
      { status: 500 }
    );
  }
}
