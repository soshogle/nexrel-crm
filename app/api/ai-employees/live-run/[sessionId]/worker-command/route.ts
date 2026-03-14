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
    const idempotencyKey = String(
      request.headers.get("x-idempotency-key") || body?.idempotencyKey || "",
    ).trim();
    const correlationId = String(
      request.headers.get("x-correlation-id") || body?.correlationId || "",
    ).trim();
    const riskTierRaw = String(body?.riskTier || "MEDIUM").toUpperCase();
    const riskTier = ["LOW", "MEDIUM", "HIGH"].includes(riskTierRaw)
      ? (riskTierRaw as "LOW" | "MEDIUM" | "HIGH")
      : "MEDIUM";
    const requiresApproval = body?.requiresApproval === true;

    if (riskTier === "HIGH" && !requiresApproval) {
      return apiErrors.conflict(
        "HIGH risk commands must set requiresApproval=true",
      );
    }
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
      source: "owner_remote",
      idempotencyKey: idempotencyKey || undefined,
      correlationId: correlationId || undefined,
      riskTier,
      requiresApproval,
      meta:
        body?.meta && typeof body.meta === "object"
          ? {
              ...body.meta,
              reliabilityHook: {
                phase: "phase_4",
                gate: "command_bus_risk_policy",
                enforcedAt: new Date().toISOString(),
              },
            }
          : {
              reliabilityHook: {
                phase: "phase_4",
                gate: "command_bus_risk_policy",
                enforcedAt: new Date().toISOString(),
              },
            },
    });

    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    console.error("[live-run worker-command] error", error);
    if (
      /blocked by policy|approval required/i.test(String(error?.message || ""))
    ) {
      return apiErrors.conflict(error?.message || "Command blocked by policy");
    }
    return apiErrors.internal(
      error?.message || "Failed to queue worker command",
    );
  }
}
