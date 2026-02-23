
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiErrors } from '@/lib/api-error';

// GET /api/ecommerce/categories - List all categories

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiErrors.unauthorized()
    }

    const categories = await prisma.productCategory.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        parent: true,
        _count: {
          select: { products: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return apiErrors.internal('Failed to fetch categories')
  }
}

// POST /api/ecommerce/categories - Create a new category
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiErrors.unauthorized()
    }

    const body = await req.json()
    const { name, description, slug, parentId, active } = body

    // Validate required fields
    if (!name || !slug) {
      return apiErrors.badRequest('Name and slug are required')
    }

    // Check if slug already exists
    const existingCategory = await prisma.productCategory.findUnique({
      where: { slug },
    })

    if (existingCategory) {
      return apiErrors.badRequest('A category with this slug already exists')
    }

    const category = await prisma.productCategory.create({
      data: {
        userId: session.user.id,
        name,
        description,
        slug,
        parentId: parentId || null,
        active: active !== undefined ? active : true,
      },
      include: {
        parent: true,
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)
    return apiErrors.internal('Failed to create category')
  }
}
