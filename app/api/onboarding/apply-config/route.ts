import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { onboardingConfigService } from "@/lib/onboarding-config-service";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }
    const db = getCrmDb(ctx);

    // Get user's collected data
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { onboardingProgress: true },
    });

    if (!user?.onboardingProgress) {
      return apiErrors.badRequest("No onboarding data found");
    }

    let data;
    try {
      data = JSON.parse(user.onboardingProgress as string);
    } catch (e) {
      return apiErrors.badRequest("Invalid onboarding data");
    }

    // Apply configuration
    const success = await onboardingConfigService.applyConfiguration(
      session.user.id,
      data,
    );

    if (!success) {
      return apiErrors.internal("Failed to apply configuration");
    }

    return NextResponse.json({
      success: true,
      message: "Configuration applied successfully",
    });
  } catch (error: any) {
    console.error("Configuration error:", error);
    return apiErrors.internal(error.message || "Failed to apply configuration");
  }
}
