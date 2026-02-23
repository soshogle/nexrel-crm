
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/general-inventory/categories
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const categories = await prisma.generalInventoryCategory.findMany({
      where: { userId: session.user.id },
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return apiErrors.internal(error.message);
  }
}

// POST /api/general-inventory/categories
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { name, description, parentId } = body;

    if (!name) {
      return apiErrors.badRequest('Name is required');
    }

    const category = await prisma.generalInventoryCategory.create({
      data: {
        userId: session.user.id,
        name,
        description,
        parentId,
      },
    });

    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    console.error('Error creating category:', error);
    return apiErrors.internal(error.message);
  }
}
