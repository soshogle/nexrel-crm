
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/clubos/members/[id] - Get specific member

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

    const member = await prisma.clubOSMember.findUnique({
      where: { id },
      include: {
        household: true,
        registrations: {
          include: {
            program: true,
            division: true,
          },
        },
        teamMemberships: {
          include: {
            team: {
              include: {
                division: {
                  include: {
                    program: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json({ member });
  } catch (error) {
    console.error('Error fetching member:', error);
    return NextResponse.json(
      { error: 'Failed to fetch member' },
      { status: 500 }
    );
  }
}

// PUT /api/clubos/members/[id] - Update member
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
    const {
      memberType,
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      photoUrl,
      medicalNotes,
      allergies,
      medications,
      shirtSize,
      waiverSigned,
      waiverSignedDate,
      backgroundCheckStatus,
      backgroundCheckDate,
      backgroundCheckExpiry,
    } = body;

    const member = await prisma.clubOSMember.update({
      where: { id },
      data: {
        memberType,
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender,
        photoUrl,
        medicalNotes,
        allergies,
        medications,
        shirtSize,
        waiverSigned,
        waiverSignedDate: waiverSignedDate ? new Date(waiverSignedDate) : undefined,
        backgroundCheckStatus,
        backgroundCheckDate: backgroundCheckDate ? new Date(backgroundCheckDate) : undefined,
        backgroundCheckExpiry: backgroundCheckExpiry ? new Date(backgroundCheckExpiry) : undefined,
      },
    });

    return NextResponse.json({ member });
  } catch (error) {
    console.error('Error updating member:', error);
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    );
  }
}
