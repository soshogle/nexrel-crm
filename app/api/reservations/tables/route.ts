
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma as db } from '@/lib/db';

// GET /api/reservations/tables - List all restaurant tables

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');

    const where: any = {
      userId: session.user.id,
    };

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const tables = await db.restaurantTable.findMany({
      where,
      orderBy: [
        { section: 'asc' },
        { tableName: 'asc' },
      ],
    });

    return NextResponse.json({ tables });
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tables' },
      { status: 500 }
    );
  }
}

// POST /api/reservations/tables - Create a new table
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      tableName,
      capacity,
      minCapacity,
      maxCapacity,
      section,
      position,
      isPremium,
      features,
    } = body;

    if (!tableName || !capacity) {
      return NextResponse.json(
        { error: 'Table name and capacity are required' },
        { status: 400 }
      );
    }

    const table = await db.restaurantTable.create({
      data: {
        userId: session.user.id,
        tableName,
        capacity: parseInt(capacity),
        minCapacity: minCapacity ? parseInt(minCapacity) : null,
        maxCapacity: maxCapacity ? parseInt(maxCapacity) : null,
        section,
        position,
        isPremium: isPremium || false,
        features: features || [],
      },
    });

    return NextResponse.json({
      success: true,
      table,
    });
  } catch (error) {
    console.error('Error creating table:', error);
    return NextResponse.json(
      { error: 'Failed to create table' },
      { status: 500 }
    );
  }
}
