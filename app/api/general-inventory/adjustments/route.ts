
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/general-inventory/adjustments - Create stock adjustment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      itemId,
      type,
      quantity,
      fromLocationId,
      toLocationId,
      unitCost,
      reason,
      reference,
      notes,
    } = body;

    // Validation
    if (!itemId || !type || quantity === undefined) {
      return NextResponse.json(
        { error: 'Item ID, type, and quantity are required' },
        { status: 400 }
      );
    }

    // Get current item
    const item = await prisma.generalInventoryItem.findFirst({
      where: {
        id: itemId,
        userId: session.user.id,
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const quantityBefore = item.quantity;
    const quantityAfter = quantityBefore + quantity;

    // Check for negative stock
    if (quantityAfter < 0) {
      return NextResponse.json(
        { error: 'Insufficient stock for this adjustment' },
        { status: 400 }
      );
    }

    // Create adjustment and update item in a transaction
    const [adjustment, updatedItem] = await prisma.$transaction([
      prisma.generalInventoryAdjustment.create({
        data: {
          userId: session.user.id,
          itemId,
          type,
          quantity,
          quantityBefore,
          quantityAfter,
          fromLocationId,
          toLocationId,
          unitCost,
          totalCost: unitCost ? unitCost * Math.abs(quantity) : null,
          reason,
          reference,
          notes,
          createdBy: session.user.email || undefined,
        },
        include: {
          item: true,
          fromLocation: true,
          toLocation: true,
        },
      }),
      prisma.generalInventoryItem.update({
        where: { id: itemId },
        data: {
          quantity: quantityAfter,
          // Update location if it's a transfer
          ...(type === 'TRANSFER' && toLocationId
            ? { locationId: toLocationId }
            : {}),
        },
      }),
    ]);

    // Trigger external sync if autoSync is enabled
    try {
      const syncSettings = await prisma.ecommerceSyncSettings.findUnique({
        where: { userId: session.user.id },
      });

      if (syncSettings && syncSettings.autoSync && syncSettings.syncInventory) {
        // Trigger async sync (fire and forget - don't wait)
        fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/general-inventory/ecommerce-sync/push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || '',
          },
          body: JSON.stringify({
            itemId,
            action: 'update_inventory',
          }),
        }).catch((err) => {
          console.error('Failed to sync with external platform:', err);
          // Don't fail the request if sync fails
        });
      }
    } catch (syncError) {
      console.error('Error checking sync settings:', syncError);
      // Don't fail the request if sync check fails
    }

    return NextResponse.json({ success: true, adjustment, item: updatedItem });
  } catch (error: any) {
    console.error('Error creating adjustment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/general-inventory/adjustments - Get adjustment history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {
      userId: session.user.id,
    };

    if (itemId) {
      where.itemId = itemId;
    }

    const adjustments = await prisma.generalInventoryAdjustment.findMany({
      where,
      include: {
        item: true,
        fromLocation: true,
        toLocation: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ success: true, adjustments });
  } catch (error: any) {
    console.error('Error fetching adjustments:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
