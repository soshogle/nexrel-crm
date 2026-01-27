
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/general-inventory/items/[id] - Get item details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const item = await prisma.generalInventoryItem.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        category: true,
        supplier: true,
        location: true,
        adjustments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    console.error('Error fetching item:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/general-inventory/items/[id] - Update item
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      categoryId,
      supplierId,
      locationId,
      reorderLevel,
      reorderQuantity,
      unit,
      costPrice,
      sellingPrice,
      barcode,
      imageUrl,
      notes,
      isActive,
    } = body;

    // Verify ownership
    const existingItem = await prisma.generalInventoryItem.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const item = await prisma.generalInventoryItem.update({
      where: { id: params.id },
      data: {
        name,
        description,
        categoryId,
        supplierId,
        locationId,
        reorderLevel,
        reorderQuantity,
        unit,
        costPrice,
        sellingPrice,
        barcode,
        imageUrl,
        notes,
        isActive,
      },
      include: {
        category: true,
        supplier: true,
        location: true,
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    console.error('Error updating item:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/general-inventory/items/[id] - Delete item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const existingItem = await prisma.generalInventoryItem.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Soft delete by setting isActive to false
    await prisma.generalInventoryItem.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting item:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
