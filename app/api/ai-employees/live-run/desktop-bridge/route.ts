import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDalContextFromSession,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";
import {
  workerAckCommand,
  workerHeartbeat,
  workerPullCommands,
} from "@/lib/ai-employees/live-run";

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
    const action = String(body?.action || "").toLowerCase();
    const sessionId = String(body?.sessionId || "").trim();
    const workerToken = String(body?.workerToken || "").trim();
    if (!sessionId || !workerToken) {
      return apiErrors.badRequest("sessionId and workerToken are required");
    }

    if (action === "heartbeat") {
      const data = await workerHeartbeat(ctx, sessionId, workerToken, {
        framePreview:
          typeof body?.framePreview === "string"
            ? body.framePreview
            : undefined,
        capabilities: Array.isArray(body?.capabilities)
          ? body.capabilities.map((v: any) => String(v))
          : ["owner_desktop_bridge"],
        status: typeof body?.status === "string" ? body.status : "online",
      });
      return NextResponse.json({ success: true, session: data });
    }

    if (action === "pull_commands") {
      const data = await workerPullCommands(ctx, sessionId, workerToken);
      return NextResponse.json({ success: true, ...data });
    }

    if (action === "ack_command") {
      const commandId = String(body?.commandId || "").trim();
      const status = String(body?.status || "").toLowerCase();
      if (!commandId || (status !== "completed" && status !== "failed")) {
        return apiErrors.badRequest(
          "commandId and status(completed|failed) are required",
        );
      }
      const data = await workerAckCommand(ctx, sessionId, workerToken, {
        commandId,
        status: status as "completed" | "failed",
        detail: typeof body?.detail === "string" ? body.detail : undefined,
      });
      return NextResponse.json({ success: true, session: data });
    }

    return apiErrors.badRequest(
      "action must be heartbeat, pull_commands, or ack_command",
    );
  } catch (error: any) {
    console.error("[live-run desktop-bridge] error", error);
    if (
      /token|Unauthorized|Invalid|expired/i.test(String(error?.message || ""))
    ) {
      return apiErrors.unauthorized();
    }
    return apiErrors.internal(error?.message || "Desktop worker bridge failed");
  }
}
