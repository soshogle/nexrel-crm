/**
 * Website Products API
 * Manage products on a website
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const websiteProducts = await prisma.websiteProduct.findMany({
      where: { websiteId: params.id },
      include: {
        product: true,
      },
    });

    return NextResponse.json({
      success: true,
      products: websiteProducts.map((wp) => ({
        id: wp.productId,
        websiteProductId: wp.id,
        name: wp.product.name,
        sku: wp.product.sku,
        price: wp.product.price,
        inventory: wp.product.inventory,
        isVisible: wp.isVisible,
        displayOrder: wp.displayOrder,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching website products:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { productId, displayOrder } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'productId is required' },
        { status: 400 }
      );
    }

    // Verify website ownership
    const website = await prisma.website.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });

    if (!website || website.userId !== session.user.id) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    // Create website product link
    const websiteProduct = await prisma.websiteProduct.upsert({
      where: {
        websiteId_productId: {
          websiteId: params.id,
          productId,
        },
      },
      create: {
        websiteId: params.id,
        productId,
        displayOrder: displayOrder || 0,
        isVisible: true,
      },
      update: {
        isVisible: true,
        ...(displayOrder !== undefined && { displayOrder }),
      },
    });

    return NextResponse.json({
      success: true,
      websiteProduct,
    });
  } catch (error: any) {
    console.error('Error adding product to website:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add product' },
      { status: 500 }
    );
  }
}
