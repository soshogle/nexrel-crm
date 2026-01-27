
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// PUT /api/clubos/parent/family/[id] - Update family member

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, lastName, dateOfBirth, gender } = body;

    // Get household for the user
    const household = await prisma.clubOSHousehold.findUnique({
      where: { userId: session.user.id },
    });

    if (!household) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 });
    }

    // Verify member belongs to household
    const member = await prisma.clubOSMember.findUnique({
      where: { id: params.id },
    });

    if (!member || member.householdId !== household.id) {
      return NextResponse.json({ error: 'Member not found or unauthorized' }, { status: 403 });
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
    return NextResponse.json(
      { error: error.message || 'Failed to update family member' },
      { status: 500 }
    );
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get household for the user
    const household = await prisma.clubOSHousehold.findUnique({
      where: { userId: session.user.id },
    });

    if (!household) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 });
    }

    // Verify member belongs to household
    const member = await prisma.clubOSMember.findUnique({
      where: { id: params.id },
      include: {
        registrations: true,
      },
    });

    if (!member || member.householdId !== household.id) {
      return NextResponse.json({ error: 'Member not found or unauthorized' }, { status: 403 });
    }

    // Check if member has active registrations
    const hasActiveRegistrations = member.registrations.some((reg) =>
      ['ACTIVE', 'APPROVED'].includes(reg.status)
    );

    if (hasActiveRegistrations) {
      return NextResponse.json(
        { error: 'Cannot delete member with active registrations' },
        { status: 400 }
      );
    }

    // Delete member
    await prisma.clubOSMember.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting family member:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete family member' },
      { status: 500 }
    );
  }
}
