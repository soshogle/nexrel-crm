import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDalContextFromSession,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";
import {
  ensureBusinessBrainProfile,
  saveBusinessBrainProfile,
} from "@/lib/nexrel-ai-brain/business-profile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const resolvedCtx = await resolveDalContext(session.user.id).catch(
      () => null,
    );
    const ctx = getDalContextFromSession(session) ?? resolvedCtx;
    if (!ctx) return apiErrors.unauthorized();

    const profile = await ensureBusinessBrainProfile({
      ctx,
      actorUserId: session.user.id,
      maxAgeHours: 24,
    });
    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    console.error("[agent-command-center] business-profile GET error", error);
    return apiErrors.internal(
      error?.message || "Failed to load business profile",
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const resolvedCtx = await resolveDalContext(session.user.id).catch(
      () => null,
    );
    const ctx = getDalContextFromSession(session) ?? resolvedCtx;
    if (!ctx) return apiErrors.unauthorized();

    const body = await request.json().catch(() => ({}));
    const reason =
      typeof body?.reason === "string" && body.reason.trim()
        ? body.reason
        : "owner_profile_update";

    const profile = await saveBusinessBrainProfile({
      ctx,
      actorUserId: session.user.id,
      patch: body?.profile || {},
      reason,
    });
    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    console.error("[agent-command-center] business-profile POST error", error);
    return apiErrors.internal(
      error?.message || "Failed to save business profile",
    );
  }
}
