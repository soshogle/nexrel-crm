
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/general-inventory/locations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const locations = await prisma.generalInventoryLocation.findMany({
      where: { userId: session.user.id },
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json({ success: true, locations });
  } catch (error: any) {
    console.error('Error fetching locations:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/general-inventory/locations
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, address, type, isDefault } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.generalInventoryLocation.updateMany({
        where: { userId: session.user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const location = await prisma.generalInventoryLocation.create({
      data: {
        userId: session.user.id,
        name,
        address,
        type,
        isDefault: isDefault || false,
      },
    });

    return NextResponse.json({ success: true, location });
  } catch (error: any) {
    console.error('Error creating location:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
