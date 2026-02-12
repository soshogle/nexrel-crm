/**
 * Public Store Products API
 * Returns visible products for a website (no auth - for customer-facing storefront)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const website = await prisma.website.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true },
    });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    const websiteProducts = await prisma.websiteProduct.findMany({
      where: {
        websiteId: params.id,
        isVisible: true,
      },
      include: {
        product: true,
      },
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    const products = websiteProducts
      .filter((wp) => wp.product && (wp.product.inventory ?? 0) > 0)
      .map((wp) => ({
        id: wp.productId,
        name: wp.product.name,
        sku: wp.product.sku,
        price: (wp.product.price ?? 0) / 100, // cents -> dollars for display
        inventory: wp.product.inventory,
        imageUrl: wp.product.imageUrl ?? null,
      }));

    return NextResponse.json({
      success: true,
      products,
    });
  } catch (error: any) {
    console.error('Error fetching store products:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
