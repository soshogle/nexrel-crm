import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getMetaDb } from "@/lib/db/meta-db";
import { grantPermission, getUserPermissions } from "@/lib/permissions";
import { PageResource } from "@prisma/client";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/admin/permissions/[userId] - Get permissions for specific user
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    // Verify target user is a team member
    const teamMember = await getMetaDb().teamMember.findFirst({
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
      return apiErrors.notFound("Team member not found");
    }

    const permissions = await getUserPermissions(params.userId);

    return NextResponse.json({
      teamMember,
      permissions,
    });
  } catch (error: any) {
    console.error("Error fetching permissions:", error);
    return apiErrors.internal(error.message || "Failed to fetch permissions");
  }
}

// PATCH /api/admin/permissions/[userId] - Update specific permission
export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { resource, canRead, canWrite, canDelete } = body;

    if (!resource) {
      return apiErrors.badRequest("Missing required field: resource");
    }

    // Verify target user is a team member
    const teamMember = await getMetaDb().teamMember.findFirst({
      where: {
        id: params.userId,
        userId: session.user.id,
      },
    });

    if (!teamMember) {
      return apiErrors.notFound("Team member not found");
    }

    // Grant/update permission
    await grantPermission(
      params.userId,
      resource as PageResource,
      { canRead, canWrite, canDelete },
      session.user.id,
    );

    // Get updated permissions
    const permissions = await getUserPermissions(params.userId);

    return NextResponse.json({
      success: true,
      permissions,
    });
  } catch (error: any) {
    console.error("Error updating permission:", error);
    return apiErrors.internal(error.message || "Failed to update permission");
  }
}
