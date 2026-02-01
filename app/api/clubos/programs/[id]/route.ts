import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/clubos/programs/[id]

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const program = await prisma.clubOSProgram.findUnique({
      where: { id },
      include: {
        divisions: {
          include: {
            teams: {
              include: {
                members: {
                  include: {
                    member: true,
                  },
                },
              },
            },
          },
        },
        registrations: {
          include: {
            member: true,
            household: true,
          },
        },
        waivers: true,
      },
    });

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    return NextResponse.json({ program });
  } catch (error) {
    console.error('Error fetching program:', error);
    return NextResponse.json(
      { error: 'Failed to fetch program' },
      { status: 500 }
    );
  }
}

// PUT /api/clubos/programs/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const program = await prisma.clubOSProgram.update({
      where: { id },
      data: {
        ...body,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        registrationOpenDate: body.registrationOpenDate ? new Date(body.registrationOpenDate) : undefined,
        registrationCloseDate: body.registrationCloseDate ? new Date(body.registrationCloseDate) : undefined,
        earlyBirdDeadline: body.earlyBirdDeadline ? new Date(body.earlyBirdDeadline) : undefined,
      },
      include: {
        divisions: true,
      },
    });

    return NextResponse.json({ program });
  } catch (error) {
    console.error('Error updating program:', error);
    return NextResponse.json(
      { error: 'Failed to update program' },
      { status: 500 }
    );
  }
}
