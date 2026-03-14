import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDalContextFromSession,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";
import { startLiveRun } from "@/lib/ai-employees/live-run";
import { assertAgentRunAllowed } from "@/lib/ai-employees/feature-flags";
import { parseLiveRunPayload } from "@/lib/ai-employees/live-run-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();
    const resolvedCtx = await resolveDalContext(session.user.id).catch(
      () => null,
    );
    const ctx = getDalContextFromSession(session) ?? resolvedCtx;
    if (!ctx) return apiErrors.unauthorized();

    try {
      assertAgentRunAllowed(ctx.userId);
    } catch (error: any) {
      return apiErrors.forbidden(
        error?.message || "Agent run is currently disabled",
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = parseLiveRunPayload(body);
    if (!parsed.ok) {
      return apiErrors.badRequest(parsed.error);
    }

    const created = await startLiveRun(ctx, params.id, {
      ...parsed.payload,
    });

    return NextResponse.json({ success: true, session: created });
  } catch (error: any) {
    console.error("[live-run] start error", error);
    return apiErrors.internal(error?.message || "Failed to start live run");
  }
}
