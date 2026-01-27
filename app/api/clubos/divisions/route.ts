
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/clubos/divisions - List divisions

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get('programId');

    const where: any = {
      program: {
        userId: session.user.id,
      },
    };
    if (programId) where.programId = programId;

    const divisions = await prisma.clubOSDivision.findMany({
      where,
      include: {
        program: true,
        teams: true,
        _count: {
          select: { teams: true, registrations: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ divisions });
  } catch (error: any) {
    console.error('Error fetching divisions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch divisions' },
      { status: 500 }
    );
  }
}

// POST /api/clubos/divisions - Create division
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { programId, name, ageMin, ageMax, gender, skillLevel } = body;

    if (!programId || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: programId, name' },
        { status: 400 }
      );
    }

    const division = await prisma.clubOSDivision.create({
      data: {
        programId,
        name,
        ageMin,
        ageMax,
        gender: gender || 'COED',
        skillLevel,
      },
      include: {
        program: true,
      },
    });

    return NextResponse.json({ division });
  } catch (error: any) {
    console.error('Error creating division:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create division' },
      { status: 500 }
    );
  }
}
