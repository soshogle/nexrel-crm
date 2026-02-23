
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

/**
 * GET STATION BY ID
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const station = await prisma.kitchenStation.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        _count: {
          select: {
            kitchenItems: true,
          },
        },
      },
    });

    if (!station) {
      return apiErrors.notFound('Station not found');
    }

    return NextResponse.json(station);
  } catch (error) {
    console.error('❌ Station fetch error:', error);
    return apiErrors.internal('Failed to fetch station');
  }
}

/**
 * UPDATE STATION
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await req.json();
    const {
      displayName,
      color,
      icon,
      isActive,
      priority,
      maxCapacity,
      defaultPrepTime,
    } = body;

    // Verify station exists
    const existing = await prisma.kitchenStation.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return apiErrors.notFound('Station not found');
    }

    // Build update data
    const updateData: any = {};
    if (displayName) updateData.displayName = displayName;
    if (color) updateData.color = color;
    if (icon) updateData.icon = icon;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (priority !== undefined) updateData.priority = priority;
    if (maxCapacity !== undefined) updateData.maxCapacity = maxCapacity;
    if (defaultPrepTime !== undefined) updateData.defaultPrepTime = defaultPrepTime;

    const updatedStation = await prisma.kitchenStation.update({
      where: { id: params.id },
      data: updateData,
    });

    console.log(`✅ Station updated: ${updatedStation.name}`);

    return NextResponse.json(updatedStation);
  } catch (error) {
    console.error('❌ Station update error:', error);
    return apiErrors.internal('Failed to update station');
  }
}

/**
 * DELETE STATION
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    // Verify station exists
    const station = await prisma.kitchenStation.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
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
    });

    if (!station) {
      return apiErrors.notFound('Station not found');
    }

    // Check if station has active items
    if (station._count.kitchenItems > 0) {
      return apiErrors.badRequest('Cannot delete station with active orders');
    }

    // Mark as inactive instead of deleting
    await prisma.kitchenStation.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    console.log(`✅ Station deactivated: ${station.name}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Station delete error:', error);
    return apiErrors.internal('Failed to deactivate station');
  }
}
