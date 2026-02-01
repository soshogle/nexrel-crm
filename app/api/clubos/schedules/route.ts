
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/clubos/schedules - List all schedules with filters

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get('venueId');
    const eventType = searchParams.get('eventType');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const divisionId = searchParams.get('divisionId');

    const where: any = {
      userId: session.user.id,
    };

    if (venueId) where.venueId = venueId;
    if (eventType) where.eventType = eventType;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate);
      if (endDate) where.startTime.lte = new Date(endDate);
    }

    const schedules = await prisma.clubOSSchedule.findMany({
      where,
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
      orderBy: {
        startTime: 'asc',
      },
    });

    // Filter by division if provided
    let filteredSchedules = schedules;
    if (divisionId) {
      filteredSchedules = schedules.filter((schedule) => {
        const teamDivisionIds = [
          schedule.homeTeam?.divisionId,
          schedule.awayTeam?.divisionId,
          schedule.practiceTeam?.divisionId,
        ].filter(Boolean);
        return teamDivisionIds.includes(divisionId);
      });
    }

    return NextResponse.json(filteredSchedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}

// POST /api/clubos/schedules - Create a new schedule
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      eventType,
      title,
      description,
      startTime,
      endTime,
      venueId,
      homeTeamId,
      awayTeamId,
      practiceTeamId,
      notes,
    } = body;

    // Validation
    if (!eventType || !title || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields: eventType, title, startTime, endTime' },
        { status: 400 }
      );
    }

    // Check for venue conflicts
    if (venueId) {
      const conflictingEvents = await prisma.clubOSSchedule.findMany({
        where: {
          venueId,
          status: { not: 'CANCELLED' },
          OR: [
            {
              AND: [
                { startTime: { lte: new Date(startTime) } },
                { endTime: { gt: new Date(startTime) } },
              ],
            },
            {
              AND: [
                { startTime: { lt: new Date(endTime) } },
                { endTime: { gte: new Date(endTime) } },
              ],
            },
          ],
        },
      });

      if (conflictingEvents.length > 0) {
        return NextResponse.json(
          {
            error: 'Venue conflict detected',
            conflicts: conflictingEvents.map((e) => ({
              id: e.id,
              title: e.title,
              startTime: e.startTime,
              endTime: e.endTime,
            })),
          },
          { status: 409 }
        );
      }
    }

    // Check for team conflicts (team can't have two events at same time)
    const teamIds = [homeTeamId, awayTeamId, practiceTeamId].filter(Boolean);
    if (teamIds.length > 0) {
      const teamConflicts = await prisma.clubOSSchedule.findMany({
        where: {
          status: { not: 'CANCELLED' },
          OR: [
            { homeTeamId: { in: teamIds } },
            { awayTeamId: { in: teamIds } },
            { practiceTeamId: { in: teamIds } },
          ],
          AND: [
            {
              OR: [
                {
                  AND: [
                    { startTime: { lte: new Date(startTime) } },
                    { endTime: { gt: new Date(startTime) } },
                  ],
                },
                {
                  AND: [
                    { startTime: { lt: new Date(endTime) } },
                    { endTime: { gte: new Date(endTime) } },
                  ],
                },
              ],
            },
          ],
        },
      });

      if (teamConflicts.length > 0) {
        return NextResponse.json(
          {
            error: 'Team scheduling conflict detected',
            conflicts: teamConflicts.map((e) => ({
              id: e.id,
              title: e.title,
              startTime: e.startTime,
              endTime: e.endTime,
            })),
          },
          { status: 409 }
        );
      }
    }

    const schedule = await prisma.clubOSSchedule.create({
      data: {
        userId: session.user.id,
        eventType,
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        venueId,
        homeTeamId,
        awayTeamId,
        practiceTeamId,
        notes,
        status: 'SCHEDULED',
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

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error('Error creating schedule:', error);
    return NextResponse.json(
      { error: 'Failed to create schedule' },
      { status: 500 }
    );
  }
}
