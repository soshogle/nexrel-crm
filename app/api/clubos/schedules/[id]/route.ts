
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/clubos/schedules/[id] - Get single schedule

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schedule = await prisma.clubOSSchedule.findUnique({
      where: { id: params.id },
      include: {
        venue: true,
        homeTeam: {
          include: {
            division: {
              include: {
                program: true,
              },
            },
            members: {
              include: {
                member: true,
              },
            },
          },
        },
        awayTeam: {
          include: {
            division: {
              include: {
                program: true,
              },
            },
            members: {
              include: {
                member: true,
              },
            },
          },
        },
        practiceTeam: {
          include: {
            division: {
              include: {
                program: true,
              },
            },
            members: {
              include: {
                member: true,
              },
            },
          },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    if (schedule.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}

// PUT /api/clubos/schedules/[id] - Update schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      eventType,
      status,
      title,
      description,
      startTime,
      endTime,
      venueId,
      homeTeamId,
      awayTeamId,
      practiceTeamId,
      homeScore,
      awayScore,
      notes,
    } = body;

    const existing = await prisma.clubOSSchedule.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const schedule = await prisma.clubOSSchedule.update({
      where: { id: params.id },
      data: {
        eventType,
        status,
        title,
        description,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        venueId,
        homeTeamId,
        awayTeamId,
        practiceTeamId,
        homeScore,
        awayScore,
        notes,
      },
      include: {
        venue: true,
        homeTeam: {
          include: {
            division: true,
          },
        },
        awayTeam: {
          include: {
            division: true,
          },
        },
        practiceTeam: {
          include: {
            division: true,
          },
        },
      },
    });

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    );
  }
}

// DELETE /api/clubos/schedules/[id] - Delete (cancel) schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.clubOSSchedule.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft delete by setting status to CANCELLED
    await prisma.clubOSSchedule.update({
      where: { id: params.id },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json({ message: 'Schedule cancelled successfully' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete schedule' },
      { status: 500 }
    );
  }
}
