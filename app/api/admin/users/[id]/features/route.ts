
/**
 * Admin Feature Toggle API
 * Update feature toggles for a specific user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(
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
    const { features } = body; // Array of { feature: string, enabled: boolean }

    if (!Array.isArray(features)) {
      return NextResponse.json(
        { error: 'Features must be an array' },
        { status: 400 }
      );
    }

    // Get user to verify existence
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { email: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update feature toggles (upsert for each feature)
    const updatePromises = features.map((item: { feature: string; enabled: boolean }) =>
      prisma.userFeatureToggle.upsert({
        where: {
          userId_feature: {
            userId: params.id,
            feature: item.feature,
          },
        },
        create: {
          userId: params.id,
          feature: item.feature,
          enabled: item.enabled,
        },
        update: {
          enabled: item.enabled,
        },
      })
    );

    await Promise.all(updatePromises);

    // Get updated feature toggles
    const featureToggles = await prisma.userFeatureToggle.findMany({
      where: { userId: params.id },
    });

    // Log admin action
    await prisma.adminAction.create({
      data: {
        adminId: session.user.id,
        adminEmail: session.user.email || '',
        targetUserId: params.id,
        targetUserEmail: user.email,
        action: 'UPDATE_FEATURES',
        details: { features },
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        userAgent: req.headers.get('user-agent'),
      },
    });

    return NextResponse.json({
      featureToggles,
      message: 'Feature toggles updated successfully',
    });
  } catch (error: any) {
    console.error('❌ Error updating feature toggles:', error);
    return NextResponse.json(
      { error: 'Failed to update feature toggles', details: error.message },
      { status: 500 }
    );
  }
}

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

    const featureToggles = await prisma.userFeatureToggle.findMany({
      where: { userId: params.id },
      orderBy: { feature: 'asc' },
    });

    return NextResponse.json({ featureToggles });
  } catch (error: any) {
    console.error('❌ Error fetching feature toggles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feature toggles', details: error.message },
      { status: 500 }
    );
  }
}
