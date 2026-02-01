
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { email, name, role, phone, status, permissions } = body;

    // Verify ownership
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingMember) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      );
    }

    const updatedMember = await prisma.teamMember.update({
      where: { id: params.id },
      data: {
        email,
        name,
        role,
        phone,
        status,
        permissions,
      },
    });

    return NextResponse.json(updatedMember);
  } catch (error: unknown) {
    console.error('Error updating team member:', error);
    return NextResponse.json(
      { error: 'Failed to update team member' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingMember) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      );
    }

    // Check if member has assigned tasks or deals
    const hasAssignments = await prisma.task.count({
      where: { assignedToId: params.id, status: { not: 'COMPLETED' } },
    });

    if (hasAssignments > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete team member with active task assignments. Please reassign their tasks first.',
        },
        { status: 400 }
      );
    }

    await prisma.teamMember.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting team member:', error);
    return NextResponse.json(
      { error: 'Failed to delete team member' },
      { status: 500 }
    );
  }
}
