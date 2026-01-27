
/**
 * Soshogle Pay - Capture Payment Intent API
 * POST /api/payments/soshogle/intents/[id]/capture
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
    const { amount } = body;

    const paymentIntent = await soshoglePay.capturePayment(params.id, amount);

    return NextResponse.json({ success: true, paymentIntent });
  } catch (error: any) {
    console.error('❌ Payment capture error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to capture payment' },
      { status: 500 }
    );
  }
}
