/**
 * Dental Periodontal Chart API
 * Handles periodontal chart CRUD operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Get periodontal charts for a patient
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

    // Get all periodontal charts for this patient, ordered by date
    const charts = await prisma.dentalPeriodontalChart.findMany({
      where: {
        leadId,
        userId: session.user.id,
      },
      orderBy: { chartDate: 'desc' },
    });

    return NextResponse.json({
      success: true,
      charts,
    });
  } catch (error: any) {
    console.error('Error fetching periodontal charts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch periodontal charts' },
      { status: 500 }
    );
  }
}

// POST - Create new periodontal chart
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { leadId, measurements, notes, chartDate } = body;

    if (!leadId || !measurements) {
      return NextResponse.json(
        { error: 'Patient ID (leadId) and measurements are required' },
        { status: 400 }
      );
    }

    const chart = await prisma.dentalPeriodontalChart.create({
      data: {
        leadId,
        userId: session.user.id,
        measurements,
        notes: notes || null,
        chartDate: chartDate ? new Date(chartDate) : new Date(),
        chartedBy: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      chart,
    });
  } catch (error: any) {
    console.error('Error creating periodontal chart:', error);
    return NextResponse.json(
      { error: 'Failed to create periodontal chart', details: error.message },
      { status: 500 }
    );
  }
}
