
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/clubos/teams/[id] - Get specific team

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

    const team = await prisma.clubOSTeam.findUnique({
      where: { id: params.id },
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
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Verify ownership via division -> program
    if (team.division.program.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ team });
  } catch (error: any) {
    console.error('Error fetching team:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch team' },
      { status: 500 }
    );
  }
}

// PUT /api/clubos/teams/[id] - Update team
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
    const { name, colorPrimary, colorSecondary, status, maxPlayers } = body;

    // Get team and verify ownership
    const existingTeam = await prisma.clubOSTeam.findUnique({
      where: { id: params.id },
      include: {
        division: {
          include: { program: true },
        },
      },
    });

    if (!existingTeam) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    if (existingTeam.division.program.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const team = await prisma.clubOSTeam.update({
      where: { id: params.id },
      data: {
        name,
        colorPrimary,
        colorSecondary,
        status,
        maxPlayers,
      },
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
    });

    return NextResponse.json({ team });
  } catch (error: any) {
    console.error('Error updating team:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update team' },
      { status: 500 }
    );
  }
}

// DELETE /api/clubos/teams/[id] - Delete team
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get team and verify ownership
    const team = await prisma.clubOSTeam.findUnique({
      where: { id: params.id },
      include: {
        division: {
          include: { program: true },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    if (team.division.program.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await prisma.clubOSTeam.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting team:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete team' },
      { status: 500 }
    );
  }
}
