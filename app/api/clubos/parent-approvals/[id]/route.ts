
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * Parent Approval Action API
 * PUT - Approve/reject/suspend parent household
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, notes } = body; // action: "approve", "reject", "suspend", "activate"

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    // Get household and verify ownership
    const household = await prisma.clubOSHousehold.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!household) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 });
    }

    // Verify this household belongs to the logged-in club owner
    if (household.clubOwnerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Determine new status based on action
    let newStatus: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE' = 'ACTIVE';
    let verifiedAt: Date | null = household.verifiedAt;

    switch (action) {
      case 'approve':
        newStatus = 'ACTIVE';
        verifiedAt = new Date();
        break;
      case 'reject':
        newStatus = 'INACTIVE';
        verifiedAt = null;
        break;
      case 'suspend':
        newStatus = 'SUSPENDED';
        break;
      case 'activate':
        newStatus = 'ACTIVE';
        if (!verifiedAt) {
          verifiedAt = new Date();
        }
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: approve, reject, suspend, or activate' },
          { status: 400 }
        );
    }

    // Update household status
    const updatedHousehold = await prisma.clubOSHousehold.update({
      where: { id: params.id },
      data: {
        status: newStatus,
        verifiedAt,
        notes: notes || household.notes,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Parent ${action}d successfully`,
      household: updatedHousehold,
    });
  } catch (error: any) {
    console.error('Error updating parent approval:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update parent approval' },
      { status: 500 }
    );
  }
}
