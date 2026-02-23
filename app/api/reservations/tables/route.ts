
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma as db } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

// GET /api/reservations/tables - List all restaurant tables

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
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
    return apiErrors.internal('Failed to fetch tables');
  }
}

// POST /api/reservations/tables - Create a new table
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
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
      return apiErrors.badRequest('Table name and capacity are required');
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
    return apiErrors.internal('Failed to create table');
  }
}
