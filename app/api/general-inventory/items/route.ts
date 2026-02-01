
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/general-inventory/items - List all inventory items
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const supplierId = searchParams.get('supplierId');
    const locationId = searchParams.get('locationId');
    const lowStock = searchParams.get('lowStock') === 'true';
    const search = searchParams.get('search');

    const where: any = {
      userId: session.user.id,
      isActive: true,
    };

    if (categoryId) where.categoryId = categoryId;
    if (supplierId) where.supplierId = supplierId;
    if (locationId) where.locationId = locationId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const items = await prisma.generalInventoryItem.findMany({
      where,
      include: {
        category: true,
        supplier: true,
        location: true,
      },
      orderBy: { name: 'asc' },
    });

    // Filter for low stock if requested
    let filteredItems = items;
    if (lowStock) {
      filteredItems = items.filter(item => item.quantity <= item.reorderLevel);
    }

    return NextResponse.json({ success: true, items: filteredItems });
  } catch (error: any) {
    console.error('Error fetching inventory items:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/general-inventory/items - Create new inventory item
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      sku,
      name,
      description,
      categoryId,
      supplierId,
      locationId,
      quantity,
      reorderLevel,
      reorderQuantity,
      unit,
      costPrice,
      sellingPrice,
      barcode,
      imageUrl,
      notes,
    } = body;

    // Validation
    if (!sku || !name) {
      return NextResponse.json(
        { error: 'SKU and name are required' },
        { status: 400 }
      );
    }

    // Check for duplicate SKU
    const existingItem = await prisma.generalInventoryItem.findFirst({
      where: {
        userId: session.user.id,
        sku,
      },
    });

    if (existingItem) {
      return NextResponse.json(
        { error: 'An item with this SKU already exists' },
        { status: 400 }
      );
    }

    const item = await prisma.generalInventoryItem.create({
      data: {
        userId: session.user.id,
        sku,
        name,
        description,
        categoryId,
        supplierId,
        locationId,
        quantity: quantity || 0,
        reorderLevel: reorderLevel || 0,
        reorderQuantity: reorderQuantity || 0,
        unit,
        costPrice,
        sellingPrice,
        barcode,
        imageUrl,
        notes,
      },
      include: {
        category: true,
        supplier: true,
        location: true,
      },
    });

    // Create initial adjustment if quantity > 0
    if (quantity > 0) {
      await prisma.generalInventoryAdjustment.create({
        data: {
          userId: session.user.id,
          itemId: item.id,
          type: 'INITIAL',
          quantity,
          quantityBefore: 0,
          quantityAfter: quantity,
          toLocationId: locationId,
          reason: 'Initial stock count',
        },
      });
    }

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    console.error('Error creating inventory item:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
