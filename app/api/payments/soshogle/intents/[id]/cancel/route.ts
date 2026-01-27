
/**
 * Soshogle Pay - Cancel Payment Intent API
 * POST /api/payments/soshogle/intents/[id]/cancel
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
    const { reason } = body;

    const paymentIntent = await soshoglePay.cancelPayment(params.id, reason);

    return NextResponse.json({ success: true, paymentIntent });
  } catch (error: any) {
    console.error('❌ Payment cancellation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel payment' },
      { status: 500 }
    );
  }
}
