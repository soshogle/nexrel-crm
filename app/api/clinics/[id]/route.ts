/**
 * Clinic Detail API
 * Get, update, delete specific clinic
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Get clinic details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify user has access to this clinic
    const userClinic = await prisma.userClinic.findFirst({
      where: {
        userId: session.user.id,
        clinicId: id,
      },
      include: {
        clinic: true,
      },
    });

    if (!userClinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }

    return NextResponse.json({
      clinic: {
        ...userClinic.clinic,
        role: userClinic.role,
        isPrimary: userClinic.isPrimary,
        membershipId: userClinic.id,
      },
    });
  } catch (error: any) {
    console.error('Error fetching clinic:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clinic', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Update clinic
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verify user has admin/owner access
    const userClinic = await prisma.userClinic.findFirst({
      where: {
        userId: session.user.id,
        clinicId: id,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!userClinic) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const clinic = await prisma.clinic.update({
      where: { id },
      data: body,
    });

    return NextResponse.json({ success: true, clinic });
  } catch (error: any) {
    console.error('Error updating clinic:', error);
    return NextResponse.json(
      { error: 'Failed to update clinic', details: error.message },
      { status: 500 }
    );
  }
}
