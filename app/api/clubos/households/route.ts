
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/clubos/households - Get household for current user
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
      include: {
        members: true,
        registrations: {
          include: {
            member: true,
            program: true,
            division: true,
          },
        },
        payments: true,
        invoices: true,
      },
    });

    return NextResponse.json({ 
      success: true, 
      households: household ? [household] : [] 
    });
  } catch (error) {
    console.error('Error fetching household:', error);
    return NextResponse.json(
      { error: 'Failed to fetch household' },
      { status: 500 }
    );
  }
}

// POST /api/clubos/households - Create a new household
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
    const {
      primaryContactName,
      primaryContactEmail,
      primaryContactPhone,
      address,
      city,
      state,
      zipCode,
      emergencyContact,
      emergencyPhone,
      notes,
    } = body;

    // Check if household already exists
    const existingHousehold = await prisma.clubOSHousehold.findUnique({
      where: { userId: user.id },
    });

    if (existingHousehold) {
      return NextResponse.json(
        { error: 'Household already exists for this user' },
        { status: 400 }
      );
    }

    const household = await prisma.clubOSHousehold.create({
      data: {
        userId: user.id,
        primaryContactName,
        primaryContactEmail,
        primaryContactPhone,
        address,
        city,
        state,
        zipCode,
        emergencyContact,
        emergencyPhone,
        notes,
      },
      include: {
        members: true,
      },
    });

    return NextResponse.json({ household }, { status: 201 });
  } catch (error) {
    console.error('Error creating household:', error);
    return NextResponse.json(
      { error: 'Failed to create household' },
      { status: 500 }
    );
  }
}

// PUT /api/clubos/households - Update household
export async function PUT(request: NextRequest) {
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
    const {
      primaryContactName,
      primaryContactEmail,
      primaryContactPhone,
      address,
      city,
      state,
      zipCode,
      emergencyContact,
      emergencyPhone,
      notes,
    } = body;

    const household = await prisma.clubOSHousehold.update({
      where: { userId: user.id },
      data: {
        primaryContactName,
        primaryContactEmail,
        primaryContactPhone,
        address,
        city,
        state,
        zipCode,
        emergencyContact,
        emergencyPhone,
        notes,
      },
      include: {
        members: true,
      },
    });

    return NextResponse.json({ household });
  } catch (error) {
    console.error('Error updating household:', error);
    return NextResponse.json(
      { error: 'Failed to update household' },
      { status: 500 }
    );
  }
}
