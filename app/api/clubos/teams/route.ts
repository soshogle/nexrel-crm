
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/clubos/teams - List all teams

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const divisionId = searchParams.get('divisionId');
    const programId = searchParams.get('programId');

    const where: any = {
      userId: session.user.id,
    };

    if (divisionId) where.divisionId = divisionId;

    const teams = await prisma.clubOSTeam.findMany({
      where,
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
      orderBy: {
        name: 'asc',
      },
    });

    // Filter by program if provided
    let filteredTeams = teams;
    if (programId) {
      filteredTeams = teams.filter((team) => team.division.programId === programId);
    }

    return NextResponse.json({ teams: filteredTeams });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}

// POST /api/clubos/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { divisionId, name, ageGroup, coachName, coachEmail, coachPhone, maxPlayers } = body;

    if (!divisionId || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: divisionId, name' },
        { status: 400 }
      );
    }

    const team = await prisma.clubOSTeam.create({
      data: {
        divisionId,
        name,
        maxPlayers,
        status: 'FORMING',
      },
      include: {
        division: {
          include: {
            program: true,
          },
        },
      },
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json(
      { error: 'Failed to create team' },
      { status: 500 }
    );
  }
}
