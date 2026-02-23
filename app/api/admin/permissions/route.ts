
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserPermissions, applyRolePreset, ROLE_PRESETS } from '@/lib/permissions';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/admin/permissions - Get all team members with their permissions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    // Get all team members for this user
    const teamMembers = await prisma.teamMember.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    // Get permissions for each team member
    const membersWithPermissions = await Promise.all(
      teamMembers.map(async (member) => {
        const permissions = await getUserPermissions(member.id);
        return {
          ...member,
          permissions,
        };
      })
    );

    return NextResponse.json({
      teamMembers: membersWithPermissions,
      rolePresets: Object.entries(ROLE_PRESETS).map(([key, value]) => ({
        key,
        name: value.name,
        description: value.description,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching permissions:', error);
    return apiErrors.internal(error.message || 'Failed to fetch permissions');
  }
}

// POST /api/admin/permissions - Apply role preset to a user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { targetUserId, rolePreset } = body;

    if (!targetUserId || !rolePreset) {
      return apiErrors.badRequest('Missing required fields: targetUserId, rolePreset');
    }

    // Verify target user is a team member
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        id: targetUserId,
        userId: session.user.id,
      },
    });

    if (!teamMember) {
      return apiErrors.notFound('Team member not found');
    }

    // Apply role preset
    await applyRolePreset(targetUserId, rolePreset, session.user.id);

    // Get updated permissions
    const permissions = await getUserPermissions(targetUserId);

    return NextResponse.json({
      success: true,
      permissions,
    });
  } catch (error: any) {
    console.error('Error applying role preset:', error);
    return apiErrors.internal(error.message || 'Failed to apply role preset');
  }
}
