
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { grantPermission, getUserPermissions } from '@/lib/permissions';
import { PageResource } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/admin/permissions/[userId] - Get permissions for specific user
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify target user is a team member
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        id: params.userId,
        userId: session.user.id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      );
    }

    const permissions = await getUserPermissions(params.userId);

    return NextResponse.json({
      teamMember,
      permissions,
    });
  } catch (error: any) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/permissions/[userId] - Update specific permission
export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { resource, canRead, canWrite, canDelete } = body;

    if (!resource) {
      return NextResponse.json(
        { error: 'Missing required field: resource' },
        { status: 400 }
      );
    }

    // Verify target user is a team member
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        id: params.userId,
        userId: session.user.id,
      },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      );
    }

    // Grant/update permission
    await grantPermission(
      params.userId,
      resource as PageResource,
      { canRead, canWrite, canDelete },
      session.user.id
    );

    // Get updated permissions
    const permissions = await getUserPermissions(params.userId);

    return NextResponse.json({
      success: true,
      permissions,
    });
  } catch (error: any) {
    console.error('Error updating permission:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update permission' },
      { status: 500 }
    );
  }
}
