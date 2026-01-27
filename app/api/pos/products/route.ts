
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET POS PRODUCTS
 * List all products available for sale in POS
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const inStock = searchParams.get('inStock');

    const where: any = {
      userId: session.user.id,
      isActive: true,
    };

    if (category) {
      where.category = category;
    }

    // Get products from inventory that can be sold
    const products = await prisma.inventoryItem.findMany({
      where: {
        ...where,
        sellingPrice: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        description: true,
        category: true,
        unit: true,
        currentStock: true,
        minimumStock: true,
        sellingPrice: true,
        costPerUnit: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Filter by stock if requested
    const filteredProducts = inStock === 'true'
      ? products.filter(p => Number(p.currentStock) > 0)
      : products;

    return NextResponse.json(filteredProducts);
  } catch (error) {
    console.error('❌ POS products fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

/**
 * CREATE POS PRODUCT
 * Create a new product for POS (creates inventory item with selling price)
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
      initialStock,
      minimumStock,
      costPerUnit,
      sellingPrice,
    } = body;

    // Validate required fields
    if (!name || !sku || !category || !sellingPrice) {
      return NextResponse.json(
        { error: 'Name, SKU, category, and selling price are required' },
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

    // Create inventory item with selling price
    const product = await prisma.inventoryItem.create({
      data: {
        userId: session.user.id,
        name,
        sku,
        description,
        category: category || 'OTHER',
        unit: unit || 'PIECE',
        currentStock: initialStock || 0,
        minimumStock: minimumStock || 0,
        reorderQuantity: minimumStock || 10,
        costPerUnit: costPerUnit || 0,
        sellingPrice,
        isActive: true,
      },
    });

    console.log(`✅ POS product created: ${name} (${sku})`);

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('❌ POS product creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
