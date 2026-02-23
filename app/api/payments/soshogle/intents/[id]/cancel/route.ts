
/**
 * Soshogle Pay - Cancel Payment Intent API
 * POST /api/payments/soshogle/intents/[id]/cancel
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
    const { reason } = body;

    const paymentIntent = await soshoglePay.cancelPayment(params.id, reason);

    return NextResponse.json({ success: true, paymentIntent });
  } catch (error: any) {
    console.error('❌ Payment cancellation error:', error);
    return apiErrors.internal(error.message || 'Failed to cancel payment');
  }
}
