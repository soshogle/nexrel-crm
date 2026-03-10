import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDalContextFromSession,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";
import {
  getIdempotentResponse,
  setIdempotentResponse,
} from "@/lib/idempotency";
import {
  runNexrelAiBrainOperator,
  type OperatorAction,
} from "@/lib/nexrel-ai-brain/operator";
import {
  NEXREL_AI_BRAIN_RUN_HEADER,
  NEXREL_AI_BRAIN_TRACE_HEADER,
  resolveNexrelAiBrainTraceId,
} from "@/lib/nexrel-ai-brain/controls";

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
    const traceId = resolveNexrelAiBrainTraceId(request);

    const body = await request.json().catch(() => ({}));
    const objective = String(body?.objective || body?.message || "").trim();
    if (!objective) return apiErrors.badRequest("objective is required");

    const surface = String(body?.surface || "assistant");
    const actions = Array.isArray(body?.actions)
      ? (body.actions as OperatorAction[])
      : undefined;
    const actorRole =
      typeof body?.actorRole === "string" ? body.actorRole : undefined;
    const dryRun = Boolean(body?.dryRun);
    const idempotencyKey =
      (typeof body?.idempotencyKey === "string" && body.idempotencyKey) ||
      request.headers.get("Idempotency-Key");

    if (idempotencyKey) {
      const cached = getIdempotentResponse(
        idempotencyKey,
        `nexrel-ai-brain-operator-run:${ctx.userId}:${session.user.id}`,
      );
      if (cached) {
        return NextResponse.json(cached.body, { status: cached.status });
      }
    }

    const result = await runNexrelAiBrainOperator({
      tenantId: ctx.userId,
      userId: session.user.id,
      surface,
      objective,
      ctx,
      actorRole,
      traceId,
      requestedActions: actions,
      dryRun,
    });

    const responseBody = { success: true, result };
    if (idempotencyKey) {
      setIdempotentResponse(
        idempotencyKey,
        `nexrel-ai-brain-operator-run:${ctx.userId}:${session.user.id}`,
        200,
        responseBody,
      );
    }

    const response = NextResponse.json(responseBody);
    response.headers.set(NEXREL_AI_BRAIN_TRACE_HEADER, traceId);
    response.headers.set(NEXREL_AI_BRAIN_RUN_HEADER, result.runId);
    return response;
  } catch (error: any) {
    console.error("[nexrel-ai-brain] operator run error", error);
    return apiErrors.internal(error?.message || "Failed operator run");
  }
}
