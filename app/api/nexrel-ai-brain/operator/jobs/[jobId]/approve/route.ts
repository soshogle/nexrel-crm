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
import { approveNexrelAiBrainJob } from "@/lib/nexrel-ai-brain/operator";
import {
  NEXREL_AI_BRAIN_TRACE_HEADER,
  resolveNexrelAiBrainTraceId,
} from "@/lib/nexrel-ai-brain/controls";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } },
) {
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
    const notes = typeof body?.notes === "string" ? body.notes : undefined;
    const idempotencyKey =
      (typeof body?.idempotencyKey === "string" && body.idempotencyKey) ||
      request.headers.get("Idempotency-Key");

    if (idempotencyKey) {
      const cached = getIdempotentResponse(
        idempotencyKey,
        `nexrel-ai-brain-approve:${params.jobId}:${ctx.userId}`,
      );
      if (cached) {
        return NextResponse.json(cached.body, { status: cached.status });
      }
    }

    const result = await approveNexrelAiBrainJob(
      ctx,
      session.user.id,
      params.jobId,
      notes,
      traceId,
    );
    const responseBody = { success: true, result };

    if (idempotencyKey) {
      setIdempotentResponse(
        idempotencyKey,
        `nexrel-ai-brain-approve:${params.jobId}:${ctx.userId}`,
        200,
        responseBody,
      );
    }

    const response = NextResponse.json(responseBody);
    response.headers.set(NEXREL_AI_BRAIN_TRACE_HEADER, traceId);
    return response;
  } catch (error: any) {
    console.error("[nexrel-ai-brain] approve job error", error);
    return apiErrors.internal(
      error?.message || "Failed to approve operator job",
    );
  }
}
