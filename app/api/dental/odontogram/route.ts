/**
 * Dental Odontogram API
 * Handles odontogram (tooth chart) CRUD operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Get odontogram for a patient
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');

    if (!leadId) {
      return NextResponse.json({ error: 'Patient ID (leadId) is required' }, { status: 400 });
    }

    // Get most recent odontogram
    const odontogram = await prisma.dentalOdontogram.findFirst({
      where: {
        leadId,
        userId: session.user.id,
      },
      orderBy: { chartDate: 'desc' },
    });

    return NextResponse.json({
      success: true,
      odontogram: odontogram || null,
    });
  } catch (error: any) {
    console.error('Error fetching odontogram:', error);
    return NextResponse.json(
      { error: 'Failed to fetch odontogram' },
      { status: 500 }
    );
  }
}

// POST - Create or update odontogram
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { leadId, toothData, notes } = body;

    if (!leadId || !toothData) {
      return NextResponse.json(
        { error: 'Patient ID (leadId) and toothData are required' },
        { status: 400 }
      );
    }

    // Check if odontogram exists
    const existing = await prisma.dentalOdontogram.findFirst({
      where: {
        leadId,
        userId: session.user.id,
      },
      orderBy: { chartDate: 'desc' },
    });

    let odontogram;
    if (existing) {
      // Update existing
      odontogram = await prisma.dentalOdontogram.update({
        where: { id: existing.id },
        data: {
          toothData,
          notes: notes || null,
          chartedBy: session.user.id,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new
      odontogram = await prisma.dentalOdontogram.create({
        data: {
          leadId,
          userId: session.user.id,
          toothData,
          notes: notes || null,
          chartedBy: session.user.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      odontogram,
    });
  } catch (error: any) {
    console.error('Error saving odontogram:', error);
    return NextResponse.json(
      { error: 'Failed to save odontogram', details: error.message },
      { status: 500 }
    );
  }
}
