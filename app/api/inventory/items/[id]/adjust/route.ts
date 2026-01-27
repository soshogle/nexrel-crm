
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * ADJUST INVENTORY STOCK
 * Manually adjust stock levels with reason tracking
 */
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
    const { type, quantity, reason, notes, staffName } = body;

    // Validate required fields
    if (!type || !quantity || !reason) {
      return NextResponse.json(
        { error: 'Type, quantity, and reason are required' },
        { status: 400 }
      );
    }

    // Get current item
    const item = await prisma.inventoryItem.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const currentStock = Number(item.currentStock);
    const quantityChange = Number(quantity);

    // Calculate new stock
    let newStock = currentStock;
    if (type === 'MANUAL_ADD') {
      newStock = currentStock + quantityChange;
    } else {
      newStock = currentStock - quantityChange;
    }

    // Prevent negative stock
    if (newStock < 0) {
      return NextResponse.json(
        { error: 'Cannot reduce stock below zero' },
        { status: 400 }
      );
    }

    // Update item stock
    const updatedItem = await prisma.inventoryItem.update({
      where: { id: params.id },
      data: {
        currentStock: newStock,
      },
    });

    // Create adjustment record
    await prisma.inventoryAdjustment.create({
      data: {
        userId: session.user.id,
        inventoryItemId: params.id,
        type,
        quantityChange: type === 'MANUAL_ADD' ? quantityChange : -quantityChange,
        previousStock: currentStock,
        newStock,
        reason,
        notes,
        staffName,
      },
    });

    // Check for low stock alerts
    if (newStock <= Number(item.minimumStock)) {
      // Check if alert already exists
      const existingAlert = await prisma.stockAlert.findFirst({
        where: {
          userId: session.user.id,
          inventoryItemId: params.id,
          alertType: newStock <= 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
          isResolved: false,
        },
      });

      if (!existingAlert) {
        await prisma.stockAlert.create({
          data: {
            userId: session.user.id,
            inventoryItemId: params.id,
            alertType: newStock <= 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
            message: `${item.name} is ${newStock <= 0 ? 'out of stock' : 'low on stock'} (${newStock} ${item.unit})`,
            severity: newStock <= 0 ? 'CRITICAL' : 'HIGH',
          },
        });
      }
    }

    console.log(`✅ Stock adjusted: ${item.name} from ${currentStock} to ${newStock}`);

    return NextResponse.json({
      success: true,
      item: updatedItem,
      previousStock: currentStock,
      newStock,
    });
  } catch (error) {
    console.error('❌ Stock adjustment error:', error);
    return NextResponse.json(
      { error: 'Failed to adjust stock' },
      { status: 500 }
    );
  }
}
