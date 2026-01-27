
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

//GET /api/clubos/divisions/[id] - Get specific division
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const division = await prisma.clubOSDivision.findUnique({
      where: { id: params.id },
      include: {
        program: true,
        teams: {
          include: {
            members: true,
          },
        },
        registrations: true,
      },
    });

    if (!division) {
      return NextResponse.json({ error: 'Division not found' }, { status: 404 });
    }

    // Verify ownership via program
    if (division.program.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ division });
  } catch (error: any) {
    console.error('Error fetching division:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch division' },
      { status: 500 }
    );
  }
}

// PUT /api/clubos/divisions/[id] - Update division
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
    const { name, ageMin, ageMax, gender, skillLevel, maxTeams, maxPlayersPerTeam, practiceDay, practiceTime } = body;

    // Get division and verify ownership
    const existingDivision = await prisma.clubOSDivision.findUnique({
      where: { id: params.id },
      include: { program: true },
    });

    if (!existingDivision) {
      return NextResponse.json({ error: 'Division not found' }, { status: 404 });
    }

    if (existingDivision.program.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const division = await prisma.clubOSDivision.update({
      where: { id: params.id },
      data: {
        name,
        ageMin,
        ageMax,
        gender,
        skillLevel,
        maxTeams,
        maxPlayersPerTeam,
        practiceDay,
        practiceTime,
      },
      include: {
        program: true,
        teams: true,
        registrations: true,
      },
    });

    return NextResponse.json({ division });
  } catch (error: any) {
    console.error('Error updating division:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update division' },
      { status: 500 }
    );
  }
}

// DELETE /api/clubos/divisions/[id] - Delete division
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get division and verify ownership
    const division = await prisma.clubOSDivision.findUnique({
      where: { id: params.id },
      include: { program: true },
    });

    if (!division) {
      return NextResponse.json({ error: 'Division not found' }, { status: 404 });
    }

    if (division.program.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await prisma.clubOSDivision.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting division:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete division' },
      { status: 500 }
    );
  }
}
