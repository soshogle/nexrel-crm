
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * BUMP KITCHEN ITEM
 * Mark item as complete and picked up
 */

export const dynamic = 'force-dynamic';

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
    const { staffId, staffName, notes } = body;

    // Get current item
    const item = await prisma.kitchenOrderItem.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Kitchen item not found' },
        { status: 404 }
      );
    }

    // Update to BUMPED status
    const updateData: any = {
      status: 'BUMPED',
    };

    // Set completed time if not already set
    if (!item.completedAt) {
      updateData.completedAt = new Date();
    }

    const updatedItem = await prisma.kitchenOrderItem.update({
      where: { id: params.id },
      data: updateData,
      include: {
        posOrder: {
          select: {
            orderNumber: true,
            orderType: true,
          },
        },
      },
    });

    // Create prep log
    await prisma.prepLog.create({
      data: {
        kitchenItemId: params.id,
        action: 'BUMPED' as any,
        previousStatus: item.status as any,
        newStatus: 'BUMPED' as any,
        staffId,
        staffName,
        notes,
      },
    });

    // Check if all items in order are bumped
    const allItems = await prisma.kitchenOrderItem.findMany({
      where: { posOrderId: updatedItem.posOrderId },
    });

    const allBumped = allItems.every((i) => i.status === 'BUMPED');

    if (allBumped) {
      await prisma.pOSOrder.update({
        where: { id: updatedItem.posOrderId },
        data: { status: 'COMPLETED' },
      });
    }

    console.log(`✅ Kitchen item bumped: ${item.itemName}`);

    return NextResponse.json({
      success: true,
      item: updatedItem,
      orderCompleted: allBumped,
    });
  } catch (error) {
    console.error('❌ Kitchen item bump error:', error);
    return NextResponse.json(
      { error: 'Failed to bump item' },
      { status: 500 }
    );
  }
}
