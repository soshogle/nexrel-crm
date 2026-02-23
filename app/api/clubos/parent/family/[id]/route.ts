
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

// PUT /api/clubos/parent/family/[id] - Update family member

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { firstName, lastName, dateOfBirth, gender } = body;

    // Get household for the user
    const household = await prisma.clubOSHousehold.findUnique({
      where: { userId: session.user.id },
    });

    if (!household) {
      return apiErrors.notFound('Household not found');
    }

    // Verify member belongs to household
    const member = await prisma.clubOSMember.findUnique({
      where: { id: params.id },
    });

    if (!member || member.householdId !== household.id) {
      return apiErrors.forbidden('Member not found or unauthorized');
    }

    // Update member
    const updatedMember = await prisma.clubOSMember.update({
      where: { id: params.id },
      data: {
        firstName,
        lastName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender,
      },
      include: {
        registrations: {
          include: {
            program: {
              select: {
                name: true,
              },
            },
            division: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ member: updatedMember });
  } catch (error: any) {
    console.error('Error updating family member:', error);
    return apiErrors.internal(error.message || 'Failed to update family member');
  }
}

// DELETE /api/clubos/parent/family/[id] - Delete family member
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    // Get household for the user
    const household = await prisma.clubOSHousehold.findUnique({
      where: { userId: session.user.id },
    });

    if (!household) {
      return apiErrors.notFound('Household not found');
    }

    // Verify member belongs to household
    const member = await prisma.clubOSMember.findUnique({
      where: { id: params.id },
      include: {
        registrations: true,
      },
    });

    if (!member || member.householdId !== household.id) {
      return apiErrors.forbidden('Member not found or unauthorized');
    }

    // Check if member has active registrations
    const hasActiveRegistrations = member.registrations.some((reg) =>
      ['ACTIVE', 'APPROVED'].includes(reg.status)
    );

    if (hasActiveRegistrations) {
      return apiErrors.badRequest('Cannot delete member with active registrations');
    }

    // Delete member
    await prisma.clubOSMember.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting family member:', error);
    return apiErrors.internal(error.message || 'Failed to delete family member');
  }
}
