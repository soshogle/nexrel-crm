/**
 * Switch Active Clinic API
 * Set user's active clinic context
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST - Switch active clinic
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const body = await request.json();
    const { clinicId } = body;

    if (!clinicId) {
      return apiErrors.badRequest("Clinic ID is required");
    }

    // Verify user has access to this clinic
    const userClinic = await db.userClinic.findFirst({
      where: {
        userId: session.user.id,
        clinicId,
      },
      include: {
        clinic: true,
      },
    });

    if (!userClinic) {
      return apiErrors.notFound("Clinic not found or access denied");
    }

    // Set as primary clinic (or create session-based active clinic)
    // For now, we'll just return success - frontend will handle context
    return NextResponse.json({
      success: true,
      clinic: {
        ...userClinic.clinic,
        role: userClinic.role,
        isPrimary: userClinic.isPrimary,
        membershipId: userClinic.id,
      },
    });
  } catch (error: any) {
    console.error("Error switching clinic:", error);
    return apiErrors.internal("Failed to switch clinic", error.message);
  }
}
