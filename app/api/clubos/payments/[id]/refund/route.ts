
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { clubOSPaymentService } from '@/lib/clubos-payment-service';
import { apiErrors } from '@/lib/api-error';

// POST /api/clubos/payments/[id]/refund - Process refund

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { amount, reason } = body;

    // Get payment and verify ownership
    const payment = await prisma.clubOSPayment.findUnique({
      where: { id: params.id },
      include: { household: true },
    });

    if (!payment) {
      return apiErrors.notFound('Payment not found');
    }

    // Verify access - only the business owner can process refunds
    if (payment.household.userId !== session.user.id) {
      return apiErrors.forbidden('Unauthorized');
    }

    // Process refund
    const result = await clubOSPaymentService.processRefund({
      paymentId: params.id,
      amount,
      reason,
    });

    return NextResponse.json({
      success: true,
      refund: result.refund,
      payment: result.payment,
    });
  } catch (error: any) {
    console.error('Error processing refund:', error);
    return apiErrors.internal(error.message || 'Failed to process refund');
  }
}
