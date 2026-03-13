import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDalContextFromSession,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";
import { buildLearningReport } from "@/lib/nexrel-ai-brain/learning-report";

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

    const searchParams = new URL(request.url).searchParams;
    const days = Number(searchParams.get("days") || "14");
    const report = await buildLearningReport(ctx, days);

    return NextResponse.json({ success: true, ...report });
  } catch (error: any) {
    console.error("[nexrel-ai-brain] learning report error", error);
    return apiErrors.internal(error?.message || "Failed learning report");
  }
}
