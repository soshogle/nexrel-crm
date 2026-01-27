
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

/**
 * GET STAFF
 * List all staff members
 */

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get('isActive');

    const where: any = { userId: session.user.id };
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const staff = await prisma.staff.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        _count: {
          select: {
            shifts: true,
            orders: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Remove PIN from response
    const sanitizedStaff = staff.map((s) => {
      const { pin, ...rest } = s;
      return rest;
    });

    return NextResponse.json(sanitizedStaff);
  } catch (error) {
    console.error('❌ Staff fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staff' },
      { status: 500 }
    );
  }
}

/**
 * CREATE STAFF
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      employeeId,
      pin,
      role,
      canVoidOrders = false,
      canGiveDiscounts = false,
      canAccessReports = false,
    } = body;

    // Validate required fields
    if (!employeeId || !pin) {
      return NextResponse.json(
        { error: 'Employee ID and PIN are required' },
        { status: 400 }
      );
    }

    // Validate PIN (must be 4 digits)
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN must be 4 digits' },
        { status: 400 }
      );
    }

    // Check if employee ID already exists
    const existing = await prisma.staff.findUnique({
      where: { employeeId },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Employee ID already exists' },
        { status: 400 }
      );
    }

    // Hash PIN
    const hashedPin = await bcrypt.hash(pin, 10);

    // Create staff
    const staff = await prisma.staff.create({
      data: {
        userId: session.user.id,
        employeeId,
        pin: hashedPin,
        role: role || 'CASHIER',
        canVoidOrders,
        canGiveDiscounts,
        canAccessReports,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    const { pin: _pin, ...sanitizedStaff } = staff;

    console.log(`✅ Staff created: ${employeeId}`);

    return NextResponse.json(sanitizedStaff, { status: 201 });
  } catch (error) {
    console.error('❌ Staff creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create staff' },
      { status: 500 }
    );
  }
}
