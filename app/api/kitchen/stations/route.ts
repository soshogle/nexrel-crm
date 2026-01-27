
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET KITCHEN STATIONS
 * List all kitchen stations
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get('isActive');

    const where: any = { userId: session.user.id };
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const stations = await prisma.kitchenStation.findMany({
      where,
      include: {
        _count: {
          select: {
            kitchenItems: {
              where: {
                status: {
                  in: ['PENDING', 'PREPARING'],
                },
              },
            },
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json(stations);
  } catch (error) {
    console.error('❌ Kitchen stations fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stations' },
      { status: 500 }
    );
  }
}

/**
 * CREATE KITCHEN STATION
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      displayName,
      color,
      icon,
      priority = 0,
      maxCapacity,
      defaultPrepTime = 15,
    } = body;

    // Validate required fields
    if (!name || !displayName) {
      return NextResponse.json(
        { error: 'Station name and display name are required' },
        { status: 400 }
      );
    }

    // Create station
    const station = await prisma.kitchenStation.create({
      data: {
        userId: session.user.id,
        name,
        displayName,
        color,
        icon,
        priority,
        maxCapacity,
        defaultPrepTime,
      },
    });

    console.log(`✅ Kitchen station created: ${name}`);

    return NextResponse.json(station, { status: 201 });
  } catch (error) {
    console.error('❌ Kitchen station creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create station' },
      { status: 500 }
    );
  }
}
