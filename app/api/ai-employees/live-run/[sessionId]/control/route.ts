import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDalContextFromSession,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";
import { controlLiveRun } from "@/lib/ai-employees/live-run";
import { isAgentVoiceDuplexEnabled } from "@/lib/ai-employees/feature-flags";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ACTIONS = new Set([
  "pause",
  "resume",
  "approve",
  "reject",
  "takeover",
  "interrupt",
  "stop",
]);

export async function POST(
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

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || "").toLowerCase();
    if (!ALLOWED_ACTIONS.has(action)) {
      return apiErrors.badRequest("Invalid control action");
    }

    if (action === "interrupt" && !isAgentVoiceDuplexEnabled()) {
      return apiErrors.conflict(
        "Voice duplex interrupt is disabled. Enable NEXREL_AGENT_VOICE_DUPLEX_ENABLED.",
      );
    }

    const updated = await controlLiveRun(ctx, params.sessionId, action as any);
    return NextResponse.json({ success: true, session: updated });
  } catch (error: any) {
    console.error("[live-run] control error", error);
    return apiErrors.internal(error?.message || "Failed to control live run");
  }
}
