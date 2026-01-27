
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

/**
 * STAFF LOGIN FOR POS
 * Authenticates staff using employee ID and PIN
 */

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { employeeId, pin } = body;

    // Validate required fields
    if (!employeeId || !pin) {
      return NextResponse.json(
        { error: 'Employee ID and PIN are required' },
        { status: 400 }
      );
    }

    // Find staff
    const staff = await prisma.staff.findFirst({
      where: {
        employeeId,
        userId: session.user.id,
        isActive: true,
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

    if (!staff) {
      return NextResponse.json(
        { error: 'Invalid employee ID or PIN' },
        { status: 401 }
      );
    }

    // Verify PIN
    const isValidPin = await bcrypt.compare(pin, staff.pin);

    if (!isValidPin) {
      return NextResponse.json(
        { error: 'Invalid employee ID or PIN' },
        { status: 401 }
      );
    }

    // Remove PIN from response
    const { pin: _pin, ...sanitizedStaff } = staff;

    console.log(`✅ Staff logged in: ${employeeId}`);

    return NextResponse.json({
      success: true,
      staff: sanitizedStaff,
    });
  } catch (error) {
    console.error('❌ Staff login error:', error);
    return NextResponse.json(
      { error: 'Failed to log in' },
      { status: 500 }
    );
  }
}
