
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { apiErrors } from '@/lib/api-error';

/**
 * GET STAFF BY ID
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const staff = await prisma.staff.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
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
    });

    if (!staff) {
      return apiErrors.notFound('Staff not found');
    }

    const { pin, ...sanitizedStaff } = staff;

    return NextResponse.json(sanitizedStaff);
  } catch (error) {
    console.error('❌ Staff fetch error:', error);
    return apiErrors.internal('Failed to fetch staff');
  }
}

/**
 * UPDATE STAFF
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await req.json();
    const {
      pin,
      role,
      isActive,
      canVoidOrders,
      canGiveDiscounts,
      canAccessReports,
    } = body;

    // Verify staff exists and belongs to user
    const existingStaff = await prisma.staff.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingStaff) {
      return apiErrors.notFound('Staff not found');
    }

    // Build update data
    const updateData: any = {};
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (canVoidOrders !== undefined) updateData.canVoidOrders = canVoidOrders;
    if (canGiveDiscounts !== undefined) updateData.canGiveDiscounts = canGiveDiscounts;
    if (canAccessReports !== undefined) updateData.canAccessReports = canAccessReports;

    // Update PIN if provided
    if (pin) {
      if (!/^\d{4}$/.test(pin)) {
        return apiErrors.badRequest('PIN must be 4 digits');
      }
      updateData.pin = await bcrypt.hash(pin, 10);
    }

    const updatedStaff = await prisma.staff.update({
      where: { id: params.id },
      data: updateData,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    const { pin: _pin, ...sanitizedStaff } = updatedStaff;

    console.log(`✅ Staff updated: ${updatedStaff.employeeId}`);

    return NextResponse.json(sanitizedStaff);
  } catch (error) {
    console.error('❌ Staff update error:', error);
    return apiErrors.internal('Failed to update staff');
  }
}

/**
 * DELETE STAFF
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    // Verify staff exists and belongs to user
    const staff = await prisma.staff.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!staff) {
      return apiErrors.notFound('Staff not found');
    }

    // Mark as inactive instead of deleting
    await prisma.staff.update({
      where: { id: params.id },
      data: {
        isActive: false,
        terminationDate: new Date(),
      },
    });

    console.log(`✅ Staff deactivated: ${staff.employeeId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Staff delete error:', error);
    return apiErrors.internal('Failed to deactivate staff');
  }
}
