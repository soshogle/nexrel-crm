
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Helper function to sync with inventory

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function syncWithInventory(userId: string, productData: any, action: 'create' | 'update') {
  try {
    // Find inventory item for this product
    const inventoryItem = await prisma.generalInventoryItem.findFirst({
      where: {
        userId,
        sku: productData.sku,
      },
    });

    if (action === 'update' && inventoryItem) {
      // Update existing inventory item
      await prisma.generalInventoryItem.update({
        where: { id: inventoryItem.id },
        data: {
          name: productData.name || inventoryItem.name,
          description: productData.description !== undefined ? productData.description : inventoryItem.description,
          quantity: productData.stockQuantity !== undefined ? productData.stockQuantity : inventoryItem.quantity,
          sellingPrice: productData.price ? Math.round(productData.price * 100) : inventoryItem.sellingPrice,
          imageUrl: productData.imageUrl !== undefined ? productData.imageUrl : inventoryItem.imageUrl,
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

// GET /api/ecommerce/products/[id] - Get a single product
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const product = await prisma.product.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        category: true,
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

// PATCH /api/ecommerce/products/[id] - Update a product
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // Check if product exists and belongs to user
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // If SKU is being updated, check if it's already in use
    if (body.sku && body.sku !== existingProduct.sku) {
      const skuExists = await prisma.product.findUnique({
        where: { sku: body.sku },
      })

      if (skuExists) {
        return NextResponse.json(
          { error: 'A product with this SKU already exists' },
          { status: 400 }
        )
      }
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.price && { price: parseInt(body.price) }),
        ...(body.compareAtPrice !== undefined && {
          compareAtPrice: body.compareAtPrice ? parseInt(body.compareAtPrice) : null,
        }),
        ...(body.sku && { sku: body.sku }),
        ...(body.inventory !== undefined && { inventory: parseInt(body.inventory) }),
        ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
        ...(body.images && { images: body.images }),
        ...(body.active !== undefined && { active: body.active }),
        ...(body.featured !== undefined && { featured: body.featured }),
        ...(body.weight !== undefined && {
          weight: body.weight ? parseFloat(body.weight) : null,
        }),
        ...(body.dimensions !== undefined && { dimensions: body.dimensions }),
        ...(body.tags && { tags: body.tags }),
        ...(body.metaTitle !== undefined && { metaTitle: body.metaTitle }),
        ...(body.metaDescription !== undefined && {
          metaDescription: body.metaDescription,
        }),
      },
      include: {
        category: true,
      },
    })

    // Sync with inventory system
    await syncWithInventory(session.user.id, {
      sku: product.sku,
      name: body.name,
      description: body.description,
      stockQuantity: body.inventory !== undefined ? product.inventory : undefined,
      price: body.price ? product.price / 100 : undefined, // Convert from cents to dollars
      imageUrl: body.imageUrl,
    }, 'update');

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

// DELETE /api/ecommerce/products/[id] - Delete a product
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if product exists and belongs to user
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    await prisma.product.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}
