
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma as db } from '@/lib/db';

// GET /api/reservations/[id] - Get reservation details

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reservation = await db.reservation.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        table: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        activities: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        reminders: true,
        preferences: true,
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ reservation });
  } catch (error) {
    console.error('Error fetching reservation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reservation' },
      { status: 500 }
    );
  }
}

// PATCH /api/reservations/[id] - Update reservation
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      reservationDate,
      reservationTime,
      partySize,
      tableId,
      section,
      status,
      specialRequests,
      dietaryRestrictions,
      internalNotes,
    } = body;

    const updateData: any = {};
    const changes: string[] = [];

    if (reservationDate !== undefined) {
      updateData.reservationDate = new Date(reservationDate);
      changes.push(`Date changed to ${reservationDate}`);
    }
    if (reservationTime !== undefined) {
      updateData.reservationTime = reservationTime;
      changes.push(`Time changed to ${reservationTime}`);
    }
    if (partySize !== undefined) {
      updateData.partySize = parseInt(partySize);
      changes.push(`Party size changed to ${partySize}`);
    }
    if (tableId !== undefined) {
      updateData.tableId = tableId;
      changes.push(`Table assignment changed`);
    }
    if (section !== undefined) {
      updateData.section = section;
      changes.push(`Section changed to ${section}`);
    }
    if (status !== undefined) {
      updateData.status = status;
      changes.push(`Status changed to ${status}`);
    }
    if (specialRequests !== undefined) {
      updateData.specialRequests = specialRequests;
    }
    if (dietaryRestrictions !== undefined) {
      updateData.dietaryRestrictions = dietaryRestrictions;
    }
    if (internalNotes !== undefined) {
      updateData.internalNotes = internalNotes;
    }

    const reservation = await db.reservation.update({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      data: {
        ...updateData,
        activities: {
          create: {
            type: 'MODIFIED',
            description: `Reservation modified: ${changes.join(', ')}`,
            performedBy: session.user.id,
          },
        },
      },
      include: {
        table: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        activities: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
      },
    });

    return NextResponse.json({
      success: true,
      reservation,
    });
  } catch (error) {
    console.error('Error updating reservation:', error);
    return NextResponse.json(
      { error: 'Failed to update reservation' },
      { status: 500 }
    );
  }
}

// DELETE /api/reservations/[id] - Cancel reservation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reservation = await db.reservation.update({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      data: {
        status: 'CANCELLED',
        activities: {
          create: {
            type: 'CANCELLED',
            description: 'Reservation cancelled by user',
            performedBy: session.user.id,
          },
        },
      },
      include: {
        customer: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    // TODO: Send cancellation email to customer

    return NextResponse.json({
      success: true,
      message: 'Reservation cancelled',
      reservation,
    });
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    return NextResponse.json(
      { error: 'Failed to cancel reservation' },
      { status: 500 }
    );
  }
}
