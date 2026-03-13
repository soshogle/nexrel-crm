import { NextRequest, NextResponse } from "next/server";
import {
  createDalContext,
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

function getWorkerAuthToken(request: NextRequest): string {
  const auth = request.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return "";
}

async function getWorkerContext(userId: string) {
  const resolved = await resolveDalContext(userId).catch(() => null);
  if (!resolved) return null;
  return createDalContext(resolved.userId, resolved.industry);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || "").toLowerCase();
    const userId = String(body?.userId || "").trim();
    const token = getWorkerAuthToken(request);
    if (!token) return apiErrors.unauthorized();
    if (!userId) return apiErrors.badRequest("userId is required");

    const ctx = await getWorkerContext(userId);
    if (!ctx) return apiErrors.unauthorized();

    if (action === "heartbeat") {
      const session = await workerHeartbeat(ctx, params.sessionId, token, {
        framePreview:
          typeof body?.framePreview === "string"
            ? body.framePreview
            : undefined,
        frameImageDataUrl:
          typeof body?.frameImageDataUrl === "string"
            ? body.frameImageDataUrl
            : undefined,
        capabilities: Array.isArray(body?.capabilities)
          ? body.capabilities.map((v: any) => String(v))
          : undefined,
        status: typeof body?.status === "string" ? body.status : undefined,
      });
      return NextResponse.json({ success: true, session });
    }

    if (action === "pull_commands") {
      const data = await workerPullCommands(ctx, params.sessionId, token);
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
      const session = await workerAckCommand(ctx, params.sessionId, token, {
        commandId,
        status: status as any,
        detail: typeof body?.detail === "string" ? body.detail : undefined,
      });
      return NextResponse.json({ success: true, session });
    }

    return apiErrors.badRequest(
      "action must be heartbeat, pull_commands, or ack_command",
    );
  } catch (error: any) {
    console.error("[live-run worker-open] error", error);
    if (
      /token|Unauthorized|Invalid|expired/i.test(String(error?.message || ""))
    ) {
      return apiErrors.unauthorized();
    }
    return apiErrors.internal(error?.message || "Worker open operation failed");
  }
}
