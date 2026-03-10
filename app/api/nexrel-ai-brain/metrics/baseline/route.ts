import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDalContextFromSession,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";
import {
  parseMetricsWindowDays,
  writeGovernanceBaselineSnapshot,
} from "@/lib/nexrel-ai-brain/governance-analytics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
    const windowDays = parseMetricsWindowDays(body?.days, 30);
    const baseline = await writeGovernanceBaselineSnapshot({
      ctx,
      actorUserId: session.user.id,
      windowDays,
    });

    return NextResponse.json({ success: true, baseline });
  } catch (error: any) {
    console.error("[nexrel-ai-brain] baseline snapshot error", error);
    return apiErrors.internal(
      error?.message || "Failed to write baseline snapshot",
    );
  }
}
