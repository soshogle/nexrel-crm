
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/clubos/parent/schedules - Get family schedules
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get household for the user
    const household = await prisma.clubOSHousehold.findUnique({
      where: { userId: session.user.id },
      include: {
        members: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!household) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 });
    }

    // Get all teams for the family members
    const memberIds = household.members.map((m) => m.id);
    const teamMemberships = await prisma.clubOSTeamMember.findMany({
      where: {
        memberId: { in: memberIds },
      },
      select: {
        teamId: true,
      },
    });

    const teamIds = [...new Set(teamMemberships.map((tm) => tm.teamId))];

    // Get schedules where any of these teams are involved
    const schedules = await prisma.clubOSSchedule.findMany({
      where: {
        userId: session.user.id,
        OR: [
          { homeTeamId: { in: teamIds } },
          { awayTeamId: { in: teamIds } },
          { practiceTeamId: { in: teamIds } },
        ],
      },
      include: {
        venue: {
          select: {
            name: true,
            address: true,
          },
        },
        homeTeam: {
          select: {
            name: true,
          },
        },
        awayTeam: {
          select: {
            name: true,
          },
        },
        practiceTeam: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    return NextResponse.json({ schedules });
  } catch (error: any) {
    console.error('Error fetching parent schedules:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}
