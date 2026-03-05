import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiErrors } from "@/lib/api-error";

/**
 * Check if the current user is a parent (has a ClubOS household)
 * GET /api/clubos/parent/check-role
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    // Get user's role first - BUSINESS_OWNERS are NEVER parents
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, parentRole: true },
    });

    // Business/admin roles are never treated as parents, even if they have a test household
    if (
      user?.role === "BUSINESS_OWNER" ||
      user?.role === "SUPER_ADMIN" ||
      user?.role === "AGENCY_ADMIN"
    ) {
      return NextResponse.json({
        isParent: false,
        hasHousehold: false,
        role: user.role,
        parentRole: false,
      });
    }

    // For other users, check if they have a household and parent role
    const household = await prisma.clubOSHousehold.findUnique({
      where: { userId: session.user.id },
    });

    // User is a parent if:
    // 1. They have a household AND
    // 2. They have parentRole flag OR role is PARENT
    const isParent =
      !!household && (user?.parentRole || user?.role === "PARENT");

    return NextResponse.json({
      isParent,
      hasHousehold: !!household,
      role: user?.role,
      parentRole: user?.parentRole,
    });
  } catch (error: any) {
    console.error("Error checking parent role:", error);
    return apiErrors.internal(error.message || "Failed to check role");
  }
}
