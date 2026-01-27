
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET ORDER BY ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const order = await prisma.pOSOrder.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        items: true,
        staff: {
          select: {
            employeeId: true,
            user: { select: { name: true } },
            role: true,
          },
        },
        receipts: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('❌ Order fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

/**
 * UPDATE ORDER
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { status, paymentStatus, paymentMethod, discount, tip, notes } = body;

    // Verify order exists and belongs to user
    const existingOrder = await prisma.pOSOrder.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Build update data
    const updateData: any = {};
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (discount !== undefined) {
      updateData.discount = discount;
      // Recalculate total
      const newTotal =
        parseFloat(existingOrder.subtotal.toString()) +
        parseFloat(existingOrder.tax.toString()) -
        discount +
        (tip !== undefined ? tip : parseFloat(existingOrder.tip.toString()));
      updateData.total = newTotal;
    }
    if (tip !== undefined) {
      updateData.tip = tip;
      // Recalculate total
      const newTotal =
        parseFloat(existingOrder.subtotal.toString()) +
        parseFloat(existingOrder.tax.toString()) -
        (discount !== undefined ? discount : parseFloat(existingOrder.discount.toString())) +
        tip;
      updateData.total = newTotal;
    }
    if (notes) updateData.notes = notes;

    // If payment is completed, set paidAt timestamp
    if (paymentStatus === 'PAID' && !existingOrder.paidAt) {
      updateData.paidAt = new Date();
    }

    const updatedOrder = await prisma.pOSOrder.update({
      where: { id: params.id },
      data: updateData,
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

    console.log(`✅ Order updated: ${updatedOrder.orderNumber}`);

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('❌ Order update error:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

/**
 * DELETE ORDER (VOID)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify order exists and belongs to user
    const order = await prisma.pOSOrder.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Mark as void instead of deleting
    await prisma.pOSOrder.update({
      where: { id: params.id },
      data: { status: 'VOID' },
    });

    console.log(`✅ Order voided: ${order.orderNumber}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Order void error:', error);
    return NextResponse.json(
      { error: 'Failed to void order' },
      { status: 500 }
    );
  }
}
