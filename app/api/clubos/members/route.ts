
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/clubos/members - Get all members for user's household

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const household = await prisma.clubOSHousehold.findUnique({
      where: { userId: user.id },
    });

    if (!household) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 });
    }

    const members = await prisma.clubOSMember.findMany({
      where: { householdId: household.id },
      include: {
        registrations: {
          include: {
            program: true,
            division: true,
          },
        },
        teamMemberships: {
          include: {
            team: true,
          },
        },
      },
    });

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

// POST /api/clubos/members - Create a new member
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const household = await prisma.clubOSHousehold.findUnique({
      where: { userId: user.id },
    });

    if (!household) {
      return NextResponse.json({ error: 'Household not found. Create a household first.' }, { status: 404 });
    }

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
    } = body;

    const member = await prisma.clubOSMember.create({
      data: {
        householdId: household.id,
        memberType,
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        photoUrl,
        medicalNotes,
        allergies,
        medications,
        shirtSize,
      },
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    console.error('Error creating member:', error);
    return NextResponse.json(
      { error: 'Failed to create member' },
      { status: 500 }
    );
  }
}
