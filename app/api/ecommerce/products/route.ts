
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Helper function to sync with inventory
async function syncWithInventory(userId: string, productData: any, action: 'create' | 'update') {
  try {
    // Find or create inventory item for this product
    const inventoryItem = await prisma.generalInventoryItem.findFirst({
      where: {
        userId,
        sku: productData.sku,
      },
    });

    if (action === 'create' && !inventoryItem) {
      // Create new inventory item
      const newItem = await prisma.generalInventoryItem.create({
        data: {
          userId,
          sku: productData.sku,
          name: productData.name,
          description: productData.description || '',
          quantity: productData.stockQuantity || 0,
          sellingPrice: Math.round((productData.price || 0) * 100), // Convert to cents
          imageUrl: productData.imageUrl || '',
          notes: 'Auto-synced from CRM E-commerce store',
        },
      });

      // Create initial stock adjustment
      if (productData.stockQuantity && productData.stockQuantity > 0) {
        await prisma.generalInventoryAdjustment.create({
          data: {
            userId,
            itemId: newItem.id,
            type: 'INITIAL',
            quantity: productData.stockQuantity,
            quantityBefore: 0,
            quantityAfter: productData.stockQuantity,
            reason: 'Initial stock from e-commerce product creation',
          },
        });
      }
    } else if (action === 'update' && inventoryItem) {
      // Update existing inventory item
      await prisma.generalInventoryItem.update({
        where: { id: inventoryItem.id },
        data: {
          name: productData.name,
          description: productData.description || inventoryItem.description,
          quantity: productData.stockQuantity !== undefined ? productData.stockQuantity : inventoryItem.quantity,
          sellingPrice: productData.price ? Math.round(productData.price * 100) : inventoryItem.sellingPrice,
          imageUrl: productData.imageUrl || inventoryItem.imageUrl,
        },
      });

      // Create stock adjustment if quantity changed
      if (productData.stockQuantity !== undefined && productData.stockQuantity !== inventoryItem.quantity) {
        await prisma.generalInventoryAdjustment.create({
          data: {
            userId,
            itemId: inventoryItem.id,
            type: productData.stockQuantity > inventoryItem.quantity ? 'ADJUSTMENT' : 'ADJUSTMENT',
            quantity: Math.abs(productData.stockQuantity - inventoryItem.quantity),
            quantityBefore: inventoryItem.quantity,
            quantityAfter: productData.stockQuantity,
            reason: 'Stock adjusted from e-commerce product update',
          },
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Inventory sync error:', error);
    return { success: false, error };
  }
}

// GET /api/ecommerce/products - List all products for the authenticated user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get('categoryId')
    const active = searchParams.get('active')

    const products = await prisma.product.findMany({
      where: {
        userId: session.user.id,
        ...(categoryId && { categoryId }),
        ...(active && { active: active === 'true' }),
      },
      include: {
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

// POST /api/ecommerce/products - Create a new product
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      name,
      description,
      price,
      compareAtPrice,
      sku,
      inventory,
      categoryId,
      imageUrl,
      images,
      active,
      featured,
      weight,
      dimensions,
      tags,
      metaTitle,
      metaDescription,
    } = body

    // Validate required fields
    if (!name || !price || !sku) {
      return NextResponse.json(
        { error: 'Name, price, and SKU are required' },
        { status: 400 }
      )
    }

    // Check if SKU already exists
    const existingProduct = await prisma.product.findUnique({
      where: { sku },
    })

    if (existingProduct) {
      return NextResponse.json(
        { error: 'A product with this SKU already exists' },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
      data: {
        userId: session.user.id,
        name,
        description,
        price: parseInt(price),
        compareAtPrice: compareAtPrice ? parseInt(compareAtPrice) : null,
        sku,
        inventory: parseInt(inventory) || 0,
        categoryId: categoryId || null,
        imageUrl,
        images: images || [],
        active: active !== undefined ? active : true,
        featured: featured !== undefined ? featured : false,
        weight: weight ? parseFloat(weight) : null,
        dimensions,
        tags: tags || [],
        metaTitle,
        metaDescription,
      },
      include: {
        category: true,
      },
    })

    // Sync with inventory system
    await syncWithInventory(session.user.id, {
      sku: product.sku,
      name: product.name,
      description: product.description,
      stockQuantity: product.inventory,
      price: product.price / 100, // Convert from cents to dollars
      imageUrl: product.imageUrl,
    }, 'create');

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}
