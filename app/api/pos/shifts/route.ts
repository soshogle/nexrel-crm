
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET SHIFTS
 * List all shifts with filtering
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const staffId = searchParams.get('staffId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = { userId: session.user.id };

    if (status) where.status = status;
    if (staffId) where.staffId = staffId;
    if (startDate || endDate) {
      where.clockIn = {};
      if (startDate) where.clockIn.gte = new Date(startDate);
      if (endDate) where.clockIn.lte = new Date(endDate);
    }

    const shifts = await prisma.shift.findMany({
      where,
      include: {
        staff: {
          select: {
            employeeId: true,
            user: {
              select: {
                name: true,
              },
            },
            role: true,
          },
        },
      },
      orderBy: { clockIn: 'desc' },
      take: 100,
    });

    return NextResponse.json(shifts);
  } catch (error) {
    console.error('❌ Shifts fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shifts' },
      { status: 500 }
    );
  }
}

/**
 * CREATE SHIFT (CLOCK IN)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { staffId, startingCash } = body;

    // Validate required fields
    if (!staffId || startingCash === undefined) {
      return NextResponse.json(
        { error: 'Staff ID and starting cash are required' },
        { status: 400 }
      );
    }

    // Check if staff has an active shift
    const activeShift = await prisma.shift.findFirst({
      where: {
        staffId,
        status: 'ACTIVE',
      },
    });

    if (activeShift) {
      return NextResponse.json(
        { error: 'Staff already has an active shift' },
        { status: 400 }
      );
    }

    // Create new shift
    const shift = await prisma.shift.create({
      data: {
        userId: session.user.id,
        staffId,
        clockIn: new Date(),
        startingCash,
        status: 'ACTIVE',
      },
      include: {
        staff: {
          select: {
            employeeId: true,
            user: { select: { name: true } },
          },
        },
      },
    });

    console.log(`✅ Shift started for staff: ${shift.staff.employeeId}`);

    return NextResponse.json(shift, { status: 201 });
  } catch (error) {
    console.error('❌ Shift creation error:', error);
    return NextResponse.json(
      { error: 'Failed to start shift' },
      { status: 500 }
    );
  }
}
