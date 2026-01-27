
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { clubOSPaymentService } from '@/lib/clubos-payment-service';

// POST /api/clubos/payments/[id]/refund - Process refund
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, reason } = body;

    // Get payment and verify ownership
    const payment = await prisma.clubOSPayment.findUnique({
      where: { id: params.id },
      include: { household: true },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Verify access - only the business owner can process refunds
    if (payment.household.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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
    return NextResponse.json(
      { error: error.message || 'Failed to process refund' },
      { status: 500 }
    );
  }
}
