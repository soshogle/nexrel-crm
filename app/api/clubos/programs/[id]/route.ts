import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

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
      return apiErrors.unauthorized();
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
      return apiErrors.notFound('Program not found');
    }

    return NextResponse.json({ program });
  } catch (error) {
    console.error('Error fetching program:', error);
    return apiErrors.internal('Failed to fetch program');
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
      return apiErrors.unauthorized();
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
    return apiErrors.internal('Failed to update program');
  }
}
