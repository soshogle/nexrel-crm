
/**
 * Admin Users API
 * Manage all users in the system (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (user?.role !== 'SUPER_ADMIN') {
      return apiErrors.forbidden('Forbidden - Super Admin access required');
    }

    // Get all users with their subscriptions
    const users = await prisma.user.findMany({
      include: {
        subscription: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('❌ Admin users fetch error:', error);
    return apiErrors.internal(error.message || 'Failed to fetch users');
  }
}
