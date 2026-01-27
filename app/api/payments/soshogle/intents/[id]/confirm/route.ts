
/**
 * Soshogle Pay - Confirm Payment Intent API
 * POST /api/payments/soshogle/intents/[id]/confirm
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { soshoglePay } from '@/lib/payments';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { paymentMethodId, confirmationToken } = body;

    const paymentIntent = await soshoglePay.confirmPayment({
      paymentIntentId: params.id,
      paymentMethodId,
      confirmationToken,
    });

    return NextResponse.json({ success: true, paymentIntent });
  } catch (error: any) {
    console.error('❌ Payment confirmation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}
