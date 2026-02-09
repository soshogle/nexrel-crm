/**
 * Individual Website Product API
 * Update or remove a product from a website
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; productId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { isVisible, displayOrder } = body;

    const websiteProduct = await prisma.websiteProduct.update({
      where: {
        websiteId_productId: {
          websiteId: params.id,
          productId: params.productId,
        },
      },
      data: {
        ...(isVisible !== undefined && { isVisible }),
        ...(displayOrder !== undefined && { displayOrder }),
      },
    });

    return NextResponse.json({
      success: true,
      websiteProduct,
    });
  } catch (error: any) {
    console.error('Error updating website product:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; productId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.websiteProduct.delete({
      where: {
        websiteId_productId: {
          websiteId: params.id,
          productId: params.productId,
        },
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error('Error removing product from website:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove product' },
      { status: 500 }
    );
  }
}
