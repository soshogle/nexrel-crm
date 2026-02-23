
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

/**
 * UPDATE KITCHEN ITEM STATUS
 * Handles status transitions (PENDING → PREPARING → READY → BUMPED)
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await req.json();
    const { status, staffId, staffName, notes } = body;

    // Validate required fields
    if (!status) {
      return apiErrors.badRequest('Status is required');
    }

    // Get current item
    const item = await prisma.kitchenOrderItem.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!item) {
      return apiErrors.notFound('Kitchen item not found');
    }

    // Build update data
    const updateData: any = {
      status,
    };

    // Set timestamps based on status
    if (status === 'PREPARING' && !item.startedAt) {
      updateData.startedAt = new Date();
      if (staffId) updateData.assignedTo = staffId;
    } else if (status === 'READY' && !item.completedAt) {
      updateData.completedAt = new Date();
    }

    // Update item
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
        station: {
          select: {
            displayName: true,
          },
        },
      },
    });

    // Create prep log
    const action = getActionFromStatus(item.status, status) as any;
    await prisma.prepLog.create({
      data: {
        kitchenItemId: params.id,
        action,
        previousStatus: item.status as any,
        newStatus: status as any,
        staffId,
        staffName,
        notes,
      },
    });

    // Check if all items in the order are ready
    if (status === 'READY' || status === 'BUMPED') {
      await checkAndUpdateOrderStatus(updatedItem.posOrderId);
    }

    console.log(`✅ Kitchen item status updated: ${item.itemName} → ${status}`);

    return NextResponse.json({
      success: true,
      item: updatedItem,
    });
  } catch (error) {
    console.error('❌ Kitchen item status update error:', error);
    return apiErrors.internal('Failed to update status');
  }
}

/**
 * Helper to determine prep action from status transition
 */
function getActionFromStatus(
  previousStatus: string,
  newStatus: string
): string {
  if (previousStatus === 'PENDING' && newStatus === 'PREPARING') {
    return 'STARTED';
  }
  if (newStatus === 'READY') {
    return 'READY';
  }
  if (newStatus === 'BUMPED') {
    return 'BUMPED';
  }
  if (newStatus === 'CANCELLED') {
    return 'CANCELLED';
  }
  return 'MODIFIED';
}

/**
 * Helper to update POS order status based on kitchen items
 */
async function checkAndUpdateOrderStatus(posOrderId: string) {
  const kitchenItems = await prisma.kitchenOrderItem.findMany({
    where: { posOrderId },
  });

  const allReady = kitchenItems.every(
    (item) => item.status === 'READY' || item.status === 'BUMPED'
  );

  const allBumped = kitchenItems.every((item) => item.status === 'BUMPED');

  if (allBumped) {
    await prisma.pOSOrder.update({
      where: { id: posOrderId },
      data: { status: 'COMPLETED' },
    });
  } else if (allReady) {
    await prisma.pOSOrder.update({
      where: { id: posOrderId },
      data: { status: 'READY' },
    });
  } else {
    await prisma.pOSOrder.update({
      where: { id: posOrderId },
      data: { status: 'PREPARING' },
    });
  }
}
