
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET INVENTORY ITEM BY ID
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const item = await prisma.inventoryItem.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        supplier: true,
        adjustments: {
          orderBy: {
            timestamp: 'desc',
          },
          take: 10,
        },
        alerts: {
          where: {
            isResolved: false,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            adjustments: true,
            recipeIngredients: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('❌ Inventory item fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory item' },
      { status: 500 }
    );
  }
}

/**
 * UPDATE INVENTORY ITEM
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
    const {
      name,
      description,
      minimumStock,
      maximumStock,
      reorderQuantity,
      costPerUnit,
      sellingPrice,
      supplierId,
      expirationDate,
      location,
      barcode,
      trackExpiration,
      autoReorder,
      isActive,
    } = body;

    // Verify item exists
    const existing = await prisma.inventoryItem.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (minimumStock !== undefined) updateData.minimumStock = minimumStock;
    if (maximumStock !== undefined) updateData.maximumStock = maximumStock;
    if (reorderQuantity !== undefined) updateData.reorderQuantity = reorderQuantity;
    if (costPerUnit !== undefined) updateData.costPerUnit = costPerUnit;
    if (sellingPrice !== undefined) updateData.sellingPrice = sellingPrice;
    if (supplierId !== undefined) updateData.supplierId = supplierId;
    if (expirationDate !== undefined) {
      updateData.expirationDate = expirationDate ? new Date(expirationDate) : null;
    }
    if (location !== undefined) updateData.location = location;
    if (barcode !== undefined) updateData.barcode = barcode;
    if (trackExpiration !== undefined) updateData.trackExpiration = trackExpiration;
    if (autoReorder !== undefined) updateData.autoReorder = autoReorder;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedItem = await prisma.inventoryItem.update({
      where: { id: params.id },
      data: updateData,
      include: {
        supplier: true,
      },
    });

    console.log(`✅ Inventory item updated: ${updatedItem.name}`);

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('❌ Inventory item update error:', error);
    return NextResponse.json(
      { error: 'Failed to update inventory item' },
      { status: 500 }
    );
  }
}

/**
 * DELETE INVENTORY ITEM
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

    // Verify item exists
    const item = await prisma.inventoryItem.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        _count: {
          select: {
            recipeIngredients: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Check if item is used in recipes
    if (item._count.recipeIngredients > 0) {
      return NextResponse.json(
        { error: 'Cannot delete item that is used in recipes' },
        { status: 400 }
      );
    }

    // Soft delete by marking as inactive
    await prisma.inventoryItem.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    console.log(`✅ Inventory item deactivated: ${item.name}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Inventory item delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete inventory item' },
      { status: 500 }
    );
  }
}
