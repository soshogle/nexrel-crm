
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

/**
 * GET POS PRODUCT CATEGORIES
 * Get distinct categories with product counts
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    // Get products grouped by category
    const categories = await prisma.inventoryItem.groupBy({
      by: ['category'],
      where: {
        userId: session.user.id,
        isActive: true,
        sellingPrice: {
          not: null,
        },
      },
      _count: {
        id: true,
      },
    });

    // Transform to include category names
    const formattedCategories = categories.map((cat) => ({
      category: cat.category,
      name: cat.category.replace('_', ' '),
      count: cat._count.id,
    }));

    return NextResponse.json(formattedCategories);
  } catch (error) {
    console.error('❌ Categories fetch error:', error);
    return apiErrors.internal('Failed to fetch categories');
  }
}
