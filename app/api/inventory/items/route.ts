
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET INVENTORY ITEMS
 * List all inventory items with filtering and search
 */

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const lowStock = searchParams.get('lowStock');
    const search = searchParams.get('search');
    const isActive = searchParams.get('isActive');

    const where: any = { userId: session.user.id };

    if (category) {
      where.category = category;
    }

    if (lowStock === 'true') {
      where.currentStock = {
        lte: prisma.inventoryItem.fields.minimumStock,
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            contactPerson: true,
          },
        },
        _count: {
          select: {
            adjustments: true,
            alerts: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Calculate stock status for each item
    const itemsWithStatus = items.map((item) => {
      const currentStock = Number(item.currentStock);
      const minimumStock = Number(item.minimumStock);
      const stockPercentage = currentStock / minimumStock;
      let stockStatus = 'OK';
      
      if (currentStock <= 0) {
        stockStatus = 'OUT_OF_STOCK';
      } else if (currentStock <= minimumStock) {
        stockStatus = 'LOW_STOCK';
      } else if (item.maximumStock && currentStock >= Number(item.maximumStock)) {
        stockStatus = 'OVERSTOCKED';
      }

      return {
        ...item,
        stockStatus,
        stockPercentage: Math.round(stockPercentage * 100),
      };
    });

    return NextResponse.json(itemsWithStatus);
  } catch (error) {
    console.error('❌ Inventory items fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory items' },
      { status: 500 }
    );
  }
}

/**
 * CREATE INVENTORY ITEM
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      sku,
      description,
      category,
      unit,
      currentStock,
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
    } = body;

    // Validate required fields
    if (!name || !sku || !category || !unit) {
      return NextResponse.json(
        { error: 'Name, SKU, category, and unit are required' },
        { status: 400 }
      );
    }

    // Check if SKU already exists
    const existingSku = await prisma.inventoryItem.findUnique({
      where: { sku },
    });

    if (existingSku) {
      return NextResponse.json(
        { error: 'SKU already exists' },
        { status: 400 }
      );
    }

    // Create inventory item
    const item = await prisma.inventoryItem.create({
      data: {
        userId: session.user.id,
        name,
        sku,
        description,
        category,
        unit,
        currentStock: currentStock || 0,
        minimumStock: minimumStock || 0,
        maximumStock,
        reorderQuantity: reorderQuantity || minimumStock || 10,
        costPerUnit: costPerUnit || 0,
        sellingPrice,
        supplierId,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        location,
        barcode,
        trackExpiration: trackExpiration || false,
        autoReorder: autoReorder || false,
      },
      include: {
        supplier: true,
      },
    });

    // Create low stock alert if needed
    const currentStockNum = Number(item.currentStock);
    const minimumStockNum = Number(item.minimumStock);
    
    if (currentStockNum <= minimumStockNum) {
      await prisma.stockAlert.create({
        data: {
          userId: session.user.id,
          inventoryItemId: item.id,
          alertType: currentStockNum <= 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
          message: `${item.name} is ${currentStockNum <= 0 ? 'out of stock' : 'low on stock'}`,
          severity: currentStockNum <= 0 ? 'CRITICAL' : 'HIGH',
        },
      });
    }

    console.log(`✅ Inventory item created: ${name} (SKU: ${sku})`);

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('❌ Inventory item creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create inventory item' },
      { status: 500 }
    );
  }
}
