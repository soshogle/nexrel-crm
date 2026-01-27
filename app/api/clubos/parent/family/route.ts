
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/clubos/parent/family - Get family members

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get household for the user
    const household = await prisma.clubOSHousehold.findUnique({
      where: { userId: session.user.id },
    });

    if (!household) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 });
    }

    // Get all members with their registrations
    const members = await prisma.clubOSMember.findMany({
      where: { householdId: household.id },
      include: {
        registrations: {
          where: {
            status: { in: ['PENDING', 'APPROVED', 'ACTIVE', 'WAITLIST'] },
          },
          include: {
            program: {
              select: {
                name: true,
              },
            },
            division: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { firstName: 'asc' },
    });

    return NextResponse.json({ members });
  } catch (error: any) {
    console.error('Error fetching family members:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch family members' },
      { status: 500 }
    );
  }
}

// POST /api/clubos/parent/family - Add family member
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, lastName, dateOfBirth, gender } = body;

    if (!firstName || !lastName || !dateOfBirth || !gender) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, dateOfBirth, gender' },
        { status: 400 }
      );
    }

    // Get household for the user
    const household = await prisma.clubOSHousehold.findUnique({
      where: { userId: session.user.id },
    });

    if (!household) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 });
    }

    // Create member
    const member = await prisma.clubOSMember.create({
      data: {
        householdId: household.id,
        memberType: 'PLAYER',
        firstName,
        lastName,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        waiverSigned: false,
      },
      include: {
        registrations: {
          include: {
            program: {
              select: {
                name: true,
              },
            },
            division: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ member });
  } catch (error: any) {
    console.error('Error creating family member:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create family member' },
      { status: 500 }
    );
  }
}
