import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/platform-admin/users - List all users (SUPER_ADMIN only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    // Verify user is SUPER_ADMIN
    const superAdmin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (superAdmin?.role !== 'SUPER_ADMIN') {
      return apiErrors.forbidden('Forbidden: SUPER_ADMIN access required');
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role');
    const industry = searchParams.get('industry');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const skip = (page - 1) * limit;

    // Build where clause - exclude deleted users
    const where: any = {
      role: { not: 'SUPER_ADMIN' }, // Don't show other super admins
      deletedAt: null, // Exclude soft-deleted users
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { businessCategory: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (industry) {
      where.industry = industry;
    }

    // Fetch users with pagination
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          industry: true,
          phone: true,
          businessCategory: true,
          businessDescription: true,
          createdAt: true,
          onboardingCompleted: true,
          accountStatus: true,
          _count: {
            select: {
              leads: true,
              deals: true,
              voiceAgents: true,
              appointments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return apiErrors.internal(error.message || 'Failed to fetch users');
  }
}
