
/**
 * Soshogle Pay - Confirm Payment Intent API
 * POST /api/payments/soshogle/intents/[id]/confirm
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { soshoglePay } from '@/lib/payments';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
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
    return apiErrors.internal(error.message || 'Failed to confirm payment');
  }
}
