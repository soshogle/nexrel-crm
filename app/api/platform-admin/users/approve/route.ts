import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/platform-admin/users/approve - Approve a pending user (SUPER_ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is SUPER_ADMIN
    const superAdmin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (superAdmin?.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: SUPER_ADMIN access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Check if user exists and is pending approval
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        accountStatus: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.accountStatus !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { error: `User account status is ${user.accountStatus}, not PENDING_APPROVAL` },
        { status: 400 }
      );
    }

    // Update user status to ACTIVE
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        accountStatus: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        accountStatus: true,
        role: true,
        createdAt: true,
      },
    });

    console.log('✅ User approved:', {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      accountStatus: updatedUser.accountStatus,
      approvedBy: session.user.email,
    });

    // TODO: Send email notification to user (optional)
    // You could integrate with an email service here to notify the user

    return NextResponse.json(
      {
        success: true,
        message: 'User approved successfully',
        user: updatedUser,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ User approval error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to approve user' },
      { status: 500 }
    );
  }
}
