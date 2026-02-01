
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * PROCESS PAYMENT FOR ORDER
 * Integrates with existing payment system (Soshogle Pay)
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
    const { paymentMethod, amountPaid, paymentDetails } = body;

    // Validate required fields
    if (!paymentMethod || !amountPaid) {
      return NextResponse.json(
        { error: 'Payment method and amount are required' },
        { status: 400 }
      );
    }

    // Get order
    const order = await prisma.pOSOrder.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if already paid
    if (order.paymentStatus === 'PAID') {
      return NextResponse.json(
        { error: 'Order is already paid' },
        { status: 400 }
      );
    }

    // Determine payment status
    let paymentStatus = 'PAID';
    const totalPaid = parseFloat(amountPaid.toString());
    const orderTotal = parseFloat(order.total.toString());

    if (totalPaid < orderTotal) {
      paymentStatus = 'PARTIALLY_PAID';
    }

    // Update order
    const updatedOrder = await prisma.pOSOrder.update({
      where: { id: params.id },
      data: {
        paymentMethod: paymentMethod,
        paymentStatus: paymentStatus as any,
        paidAt: paymentStatus === 'PAID' ? new Date() : undefined,
        status: paymentStatus === 'PAID' ? 'COMPLETED' : order.status,
      },
      include: {
        items: true,
        staff: {
          select: {
            employeeId: true,
            user: { select: { name: true } },
          },
        },
      },
    });

    // TODO: Integrate with Soshogle Pay for card/wallet payments
    // For now, we're just tracking the payment in the POS system

    console.log(`✅ Payment processed for order: ${updatedOrder.orderNumber}`);

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      paymentStatus,
      amountPaid: totalPaid,
      remainingBalance: orderTotal - totalPaid,
    });
  } catch (error) {
    console.error('❌ Payment processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}
