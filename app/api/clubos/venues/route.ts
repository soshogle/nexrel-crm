
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

// GET /api/clubos/venues - List all venues

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiErrors.unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return apiErrors.notFound('User not found');
    }

    const venues = await prisma.clubOSVenue.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(venues);
  } catch (error) {
    console.error('Error fetching venues:', error);
    return apiErrors.internal('Failed to fetch venues');
  }
}

// POST /api/clubos/venues - Create a new venue
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiErrors.unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return apiErrors.notFound('User not found');
    }

    const body = await request.json();
    const { name, address, city, state, zipCode, venueType, capacity, hasLighting, hasParking, hasRestrooms, notes } = body;

    if (!name) {
      return apiErrors.badRequest('Venue name is required');
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
    return apiErrors.internal('Failed to create venue');
  }
}
