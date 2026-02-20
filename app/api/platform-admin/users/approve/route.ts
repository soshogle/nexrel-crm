import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    if (updatedUser.email) {
      const { emailService } = await import('@/lib/email-service');
      await emailService.sendEmail({
        to: updatedUser.email,
        subject: `Welcome — Your account has been approved!`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:30px;border-radius:8px 8px 0 0;text-align:center;">
              <h1 style="margin:0;font-size:24px;">🎉 You're Approved!</h1>
            </div>
            <div style="padding:24px 30px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
              <p>Hi ${updatedUser.name || 'there'},</p>
              <p>Your account has been approved. You now have full access to the platform.</p>
              <p style="margin-top:20px;"><a href="${process.env.NEXTAUTH_URL || ''}/dashboard" style="background:#667eea;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Go to Dashboard</a></p>
            </div>
          </div>
        `,
      });
    }

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
