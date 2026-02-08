/**
 * Switch Active Clinic API
 * Set user's active clinic context
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST - Switch active clinic
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clinicId } = body;

    if (!clinicId) {
      return NextResponse.json(
        { error: 'Clinic ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this clinic
    const userClinic = await prisma.userClinic.findFirst({
      where: {
        userId: session.user.id,
        clinicId,
      },
      include: {
        clinic: true,
      },
    });

    if (!userClinic) {
      return NextResponse.json(
        { error: 'Clinic not found or access denied' },
        { status: 404 }
      );
    }

    // Set as primary clinic (or create session-based active clinic)
    // For now, we'll just return success - frontend will handle context
    return NextResponse.json({
      success: true,
      clinic: {
        ...userClinic.clinic,
        role: userClinic.role,
        isPrimary: userClinic.isPrimary,
        membershipId: userClinic.id,
      },
    });
  } catch (error: any) {
    console.error('Error switching clinic:', error);
    return NextResponse.json(
      { error: 'Failed to switch clinic', details: error.message },
      { status: 500 }
    );
  }
}
