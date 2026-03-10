import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDalContextFromSession,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";
import {
  collectAIBrainOperationalMetrics,
  parseMetricsWindowDays,
} from "@/lib/nexrel-ai-brain/governance-analytics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const resolvedCtx = await resolveDalContext(session.user.id).catch(
      () => null,
    );
    const ctx = getDalContextFromSession(session) ?? resolvedCtx;
    if (!ctx) return apiErrors.unauthorized();

    const days = parseMetricsWindowDays(
      new URL(request.url).searchParams.get("days"),
    );
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const metrics = await collectAIBrainOperationalMetrics(ctx, since);

    return NextResponse.json({
      success: true,
      windowDays: days,
      since: since.toISOString(),
      metrics,
    });
  } catch (error: any) {
    console.error("[nexrel-ai-brain] metrics error", error);
    return apiErrors.internal(
      error?.message || "Failed to fetch AI Brain metrics",
    );
  }
}
