
/**
 * Admin User Detail API
 * Get, update individual business account details
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        subscription: true,
        featureToggles: true,
        agency: true,
        _count: {
          select: {
            leads: true,
            voiceAgents: true,
            campaigns: true,
            deals: true,
            appointments: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error('❌ Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { industry, accountStatus, suspendedReason, trialEndsAt } = body;

    // Update user
    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(industry && { industry }),
        ...(accountStatus && { 
          accountStatus,
          ...(accountStatus === 'SUSPENDED' && { suspendedAt: new Date() }),
          ...(accountStatus !== 'SUSPENDED' && { suspendedAt: null }),
        }),
        ...(suspendedReason !== undefined && { suspendedReason }),
        ...(trialEndsAt && { trialEndsAt: new Date(trialEndsAt) }),
      },
      include: {
        subscription: true,
        featureToggles: true,
      },
    });

    // Log admin action
    await prisma.adminAction.create({
      data: {
        adminId: session.user.id,
        adminEmail: session.user.email || '',
        targetUserId: params.id,
        targetUserEmail: user.email,
        action: 'UPDATE_USER',
        details: body,
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        userAgent: req.headers.get('user-agent'),
      },
    });

    return NextResponse.json({ user, message: 'User updated successfully' });
  } catch (error: any) {
    console.error('❌ Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user', details: error.message },
      { status: 500 }
    );
  }
}
