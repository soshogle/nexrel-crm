
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * Parent Approvals API
 * GET - List all pending parent signups for club admin
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING';

    // Get all households for this club owner
    const households = await prisma.clubOSHousehold.findMany({
      where: {
        clubOwnerId: session.user.id,
        ...(status !== 'ALL' && { status: status as any }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
          },
        },
        _count: {
          select: {
            members: true,
            registrations: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get summary statistics
    const stats = {
      pending: await prisma.clubOSHousehold.count({
        where: { clubOwnerId: session.user.id, status: 'PENDING' },
      }),
      active: await prisma.clubOSHousehold.count({
        where: { clubOwnerId: session.user.id, status: 'ACTIVE' },
      }),
      suspended: await prisma.clubOSHousehold.count({
        where: { clubOwnerId: session.user.id, status: 'SUSPENDED' },
      }),
      total: await prisma.clubOSHousehold.count({
        where: { clubOwnerId: session.user.id },
      }),
    };

    return NextResponse.json({
      households,
      stats,
    });
  } catch (error: any) {
    console.error('Error fetching parent approvals:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch parent approvals' },
      { status: 500 }
    );
  }
}
