import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDalContextFromSession,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";
import { getLiveRun } from "@/lib/ai-employees/live-run";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();
    const resolvedCtx = await resolveDalContext(session.user.id).catch(
      () => null,
    );
    const ctx = getDalContextFromSession(session) ?? resolvedCtx;
    if (!ctx) return apiErrors.unauthorized();

    const run = await getLiveRun(ctx, params.sessionId);
    if (!run) return apiErrors.notFound("Live run session not found");

    return NextResponse.json({ success: true, session: run });
  } catch (error: any) {
    console.error("[live-run] fetch error", error);
    return apiErrors.internal(error?.message || "Failed to load live run");
  }
}
