import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import bcrypt from "bcryptjs";
import { apiErrors } from "@/lib/api-error";

/**
 * STAFF LOGIN FOR POS
 * Authenticates staff using employee ID and PIN
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const body = await req.json();
    const { employeeId, pin } = body;

    // Validate required fields
    if (!employeeId || !pin) {
      return apiErrors.badRequest("Employee ID and PIN are required");
    }

    // Find staff
    const staff = await getCrmDb(ctx).staff.findFirst({
      where: {
        employeeId,
        userId: session.user.id,
        isActive: true,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!staff) {
      return apiErrors.unauthorized("Invalid employee ID or PIN");
    }

    // Verify PIN
    const isValidPin = await bcrypt.compare(pin, staff.pin);

    if (!isValidPin) {
      return apiErrors.unauthorized("Invalid employee ID or PIN");
    }

    // Remove PIN from response
    const { pin: _pin, ...sanitizedStaff } = staff;

    console.log(`✅ Staff logged in: ${employeeId}`);

    return NextResponse.json({
      success: true,
      staff: sanitizedStaff,
    });
  } catch (error) {
    console.error("❌ Staff login error:", error);
    return apiErrors.internal("Failed to log in");
  }
}
