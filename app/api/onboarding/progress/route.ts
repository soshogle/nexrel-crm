import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
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

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        onboardingProgress: true,
        onboardingCompleted: true,
      },
    });

    return NextResponse.json({
      progress: user?.onboardingProgress || {},
      completed: user?.onboardingCompleted || false,
    });
  } catch (error) {
    console.error("Error fetching onboarding progress:", error);
    return apiErrors.internal("Failed to fetch progress");
  }
}

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
    const db = getCrmDb(ctx);

    const { progress, completed } = await req.json();

    await db.user.update({
      where: { id: session.user.id },
      data: {
        onboardingProgress: progress || {},
        onboardingCompleted: completed || false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving onboarding progress:", error);
    return apiErrors.internal("Failed to save progress");
  }
}
