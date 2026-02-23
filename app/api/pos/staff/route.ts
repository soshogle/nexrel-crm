
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { apiErrors } from '@/lib/api-error';

/**
 * GET STAFF
 * List all staff members
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
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
    return apiErrors.internal('Failed to fetch staff');
  }
}

/**
 * CREATE STAFF
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
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
      return apiErrors.badRequest('Employee ID and PIN are required');
    }

    // Validate PIN (must be 4 digits)
    if (!/^\d{4}$/.test(pin)) {
      return apiErrors.badRequest('PIN must be 4 digits');
    }

    // Check if employee ID already exists
    const existing = await prisma.staff.findUnique({
      where: { employeeId },
    });

    if (existing) {
      return apiErrors.badRequest('Employee ID already exists');
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
    return apiErrors.internal('Failed to create staff');
  }
}
