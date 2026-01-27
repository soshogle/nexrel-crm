
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma as db } from '@/lib/db';

// PATCH /api/reservations/tables/[id] - Update table details

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updateData: any = {};

    if (body.tableName !== undefined) updateData.tableName = body.tableName;
    if (body.capacity !== undefined) updateData.capacity = parseInt(body.capacity);
    if (body.minCapacity !== undefined) updateData.minCapacity = parseInt(body.minCapacity);
    if (body.maxCapacity !== undefined) updateData.maxCapacity = parseInt(body.maxCapacity);
    if (body.section !== undefined) updateData.section = body.section;
    if (body.position !== undefined) updateData.position = body.position;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.isPremium !== undefined) updateData.isPremium = body.isPremium;
    if (body.features !== undefined) updateData.features = body.features;

    const table = await db.restaurantTable.update({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      table,
    });
  } catch (error) {
    console.error('Error updating table:', error);
    return NextResponse.json(
      { error: 'Failed to update table' },
      { status: 500 }
    );
  }
}

// DELETE /api/reservations/tables/[id] - Delete table
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db.restaurantTable.delete({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Table deleted',
    });
  } catch (error) {
    console.error('Error deleting table:', error);
    return NextResponse.json(
      { error: 'Failed to delete table' },
      { status: 500 }
    );
  }
}
