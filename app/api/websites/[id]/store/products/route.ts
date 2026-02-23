/**
 * Public Store Products API
 * Returns visible products for a website (no auth - for customer-facing storefront)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createDalContext } from '@/lib/context/industry-context';
import { getCrmDb } from '@/lib/dal';
import { apiErrors } from '@/lib/api-error';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = createDalContext('bootstrap', null);
    const website = await getCrmDb(ctx).website.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true },
    });

    if (!website) {
      return apiErrors.notFound('Website not found');
    }

    const websiteProducts = await getCrmDb(ctx).websiteProduct.findMany({
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
    return apiErrors.internal(error.message || 'Failed to fetch products');
  }
}
