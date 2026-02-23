
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

//GET /api/clubos/divisions/[id] - Get specific division

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
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
      return apiErrors.notFound('Division not found');
    }

    // Verify ownership via program
    if (division.program.userId !== session.user.id) {
      return apiErrors.forbidden('Unauthorized');
    }

    return NextResponse.json({ division });
  } catch (error: any) {
    console.error('Error fetching division:', error);
    return apiErrors.internal(error.message || 'Failed to fetch division');
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
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { name, ageMin, ageMax, gender, skillLevel, maxTeams, maxPlayersPerTeam, practiceDay, practiceTime } = body;

    // Get division and verify ownership
    const existingDivision = await prisma.clubOSDivision.findUnique({
      where: { id: params.id },
      include: { program: true },
    });

    if (!existingDivision) {
      return apiErrors.notFound('Division not found');
    }

    if (existingDivision.program.userId !== session.user.id) {
      return apiErrors.forbidden('Unauthorized');
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
    return apiErrors.internal(error.message || 'Failed to update division');
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
      return apiErrors.unauthorized();
    }

    // Get division and verify ownership
    const division = await prisma.clubOSDivision.findUnique({
      where: { id: params.id },
      include: { program: true },
    });

    if (!division) {
      return apiErrors.notFound('Division not found');
    }

    if (division.program.userId !== session.user.id) {
      return apiErrors.forbidden('Unauthorized');
    }

    await prisma.clubOSDivision.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting division:', error);
    return apiErrors.internal(error.message || 'Failed to delete division');
  }
}
