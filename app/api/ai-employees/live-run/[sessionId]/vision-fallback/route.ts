import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDalContextFromSession,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";
import { enqueueWorkerCommand } from "@/lib/ai-employees/live-run";
import { isAgentVisionFallbackEnabled } from "@/lib/ai-employees/feature-flags";
import { normalizeVisionFallbackRequest } from "@/lib/ai-employees/vision-fallback";

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

    if (!isAgentVisionFallbackEnabled()) {
      return apiErrors.conflict(
        "Vision fallback is disabled. Enable NEXREL_AGENT_VISION_FALLBACK_ENABLED.",
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = normalizeVisionFallbackRequest(body);
    if (!Number.isFinite(parsed.x) || !Number.isFinite(parsed.y)) {
      return apiErrors.badRequest("x and y are required numeric coordinates");
    }

    if (parsed.actionType === "type" && !parsed.text) {
      return apiErrors.badRequest("text is required for type action");
    }

    const idempotencyKey = String(
      request.headers.get("x-idempotency-key") || body?.idempotencyKey || "",
    ).trim();
    const correlationId = String(
      request.headers.get("x-correlation-id") || body?.correlationId || "",
    ).trim();

    const data = await enqueueWorkerCommand(ctx, params.sessionId, {
      actionType: parsed.actionType,
      value: parsed.actionType === "type" ? parsed.text : undefined,
      meta: {
        x: parsed.x,
        y: parsed.y,
        visionFallback: {
          enabled: true,
          targetHint: parsed.targetHint || null,
          confidence: parsed.confidence ?? null,
          source: "operator_frame",
        },
      },
      source: "owner_remote",
      idempotencyKey: idempotencyKey || undefined,
      correlationId: correlationId || undefined,
      riskTier: "LOW",
      requiresApproval: false,
    });

    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    console.error("[live-run vision-fallback] error", error);
    return apiErrors.internal(
      error?.message || "Failed to queue vision fallback command",
    );
  }
}
