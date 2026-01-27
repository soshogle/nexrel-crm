
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * ClubOS Registration Detail API
 * Update registration status, handle approval/waitlist transitions
 */

/**
 * GET /api/clubos/registrations/[id]
 * Get single registration details
 */

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const registration = await prisma.clubOSRegistration.findUnique({
      where: { id: params.id },
      include: {
        member: true,
        program: true,
        division: true,
        household: true,
        waitlistEntry: true,
      },
    });

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      registration,
    });
  } catch (error: unknown) {
    console.error('Registration fetch error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/clubos/registrations/[id]
 * Update registration status (approve, cancel, activate)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { status, notes } = body;

    // Validate status
    const validStatuses = [
      'PENDING',
      'APPROVED',
      'WAITLIST',
      'ACTIVE',
      'COMPLETED',
      'CANCELLED',
      'REFUNDED',
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Get current registration
    const currentRegistration = await prisma.clubOSRegistration.findUnique({
      where: { id: params.id },
      include: {
        program: true,
        waitlistEntry: true,
      },
    });

    if (!currentRegistration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      );
    }

    // Handle status transitions
    const updates: any = { status };

    // If approving from pending/waitlist
    if (
      status === 'APPROVED' &&
      ['PENDING', 'WAITLIST'].includes(currentRegistration.status)
    ) {
      // Check if we need to remove from waitlist
      if (currentRegistration.waitlistEntry) {
        await prisma.clubOSWaitlist.delete({
          where: { id: currentRegistration.waitlistEntry.id },
        });
      }

      // Increment participant count
      await prisma.clubOSProgram.update({
        where: { id: currentRegistration.programId },
        data: {
          currentParticipants: { increment: 1 },
        },
      });

      updates.waiverSignedDate = new Date();
    }

    // If cancelling an approved/active registration
    if (
      status === 'CANCELLED' &&
      ['APPROVED', 'ACTIVE'].includes(currentRegistration.status)
    ) {
      // Decrement participant count
      await prisma.clubOSProgram.update({
        where: { id: currentRegistration.programId },
        data: {
          currentParticipants: { decrement: 1 },
        },
      });

      // Check if we should promote someone from waitlist
      const nextWaitlist = await prisma.clubOSWaitlist.findFirst({
        where: {
          registration: {
            programId: currentRegistration.programId,
            status: 'WAITLIST',
          },
        },
        orderBy: {
          position: 'asc',
        },
        include: {
          registration: true,
        },
      });

      if (nextWaitlist) {
        // Notify them (would integrate with messaging system)
        await prisma.clubOSWaitlist.update({
          where: { id: nextWaitlist.id },
          data: {
            notifiedDate: new Date(),
            responseDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
          },
        });
      }
    }

    // Update registration
    const updatedRegistration = await prisma.clubOSRegistration.update({
      where: { id: params.id },
      data: updates,
      include: {
        member: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
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
    });

    return NextResponse.json({
      success: true,
      registration: updatedRegistration,
      message: `Registration status updated to ${status}`,
    });
  } catch (error: unknown) {
    console.error('Registration update error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/clubos/registrations/[id]
 * Delete registration (admin only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get registration to check if we need to decrement count
    const registration = await prisma.clubOSRegistration.findUnique({
      where: { id: params.id },
    });

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      );
    }

    // Delete registration (cascades to waitlist)
    await prisma.clubOSRegistration.delete({
      where: { id: params.id },
    });

    // Decrement count if it was approved/active
    if (['APPROVED', 'ACTIVE'].includes(registration.status)) {
      await prisma.clubOSProgram.update({
        where: { id: registration.programId },
        data: {
          currentParticipants: { decrement: 1 },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Registration deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Registration deletion error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
