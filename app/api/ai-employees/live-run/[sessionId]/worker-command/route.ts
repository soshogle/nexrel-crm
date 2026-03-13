import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDalContextFromSession,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";
import { enqueueWorkerCommand } from "@/lib/ai-employees/live-run";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
    const actionType = String(body?.actionType || "").trim() as any;
    if (
      ![
        "navigate",
        "click",
        "type",
        "extract",
        "verify",
        "open_app",
        "run_command",
      ].includes(actionType)
    ) {
      return apiErrors.badRequest("Invalid actionType");
    }

    const data = await enqueueWorkerCommand(ctx, params.sessionId, {
      actionType,
      target: typeof body?.target === "string" ? body.target : undefined,
      value: typeof body?.value === "string" ? body.value : undefined,
      meta: body?.meta && typeof body.meta === "object" ? body.meta : undefined,
      source: "owner_remote",
    });

    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    console.error("[live-run worker-command] error", error);
    return apiErrors.internal(
      error?.message || "Failed to queue worker command",
    );
  }
}
