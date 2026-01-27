
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/clubos/venues - List all venues
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

    const venues = await prisma.clubOSVenue.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(venues);
  } catch (error) {
    console.error('Error fetching venues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch venues' },
      { status: 500 }
    );
  }
}

// POST /api/clubos/venues - Create a new venue
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

    const body = await request.json();
    const { name, address, city, state, zipCode, venueType, capacity, hasLighting, hasParking, hasRestrooms, notes } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Venue name is required' },
        { status: 400 }
      );
    }

    const venue = await prisma.clubOSVenue.create({
      data: {
        userId: user.id,
        name,
        address,
        city,
        state,
        zipCode,
        venueType: venueType || 'FIELD',
        capacity,
        hasLighting: hasLighting || false,
        hasParking: hasParking || false,
        hasRestrooms: hasRestrooms || false,
        notes,
      },
    });

    return NextResponse.json(venue, { status: 201 });
  } catch (error) {
    console.error('Error creating venue:', error);
    return NextResponse.json(
      { error: 'Failed to create venue' },
      { status: 500 }
    );
  }
}
