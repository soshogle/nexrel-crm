import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDalContextFromSession,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";
import { startLiveRun } from "@/lib/ai-employees/live-run";

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

    const body = await request.json().catch(() => ({}));
    const goal = String(body?.goal || "Run owner mission").trim();
    const targetApps = Array.isArray(body?.targetApps)
      ? body.targetApps.map((v: any) => String(v)).filter(Boolean)
      : [];
    const trustMode = String(body?.trustMode || "crawl").toLowerCase();
    const autonomyLevel = String(
      body?.autonomyLevel ||
        (trustMode === "crawl"
          ? "observe"
          : trustMode === "walk"
            ? "assist"
            : "autonomous_low_risk"),
    ).toLowerCase();
    const executionTarget = String(
      body?.executionTarget || "cloud_browser",
    ).toLowerCase();

    if (!goal) {
      return apiErrors.badRequest("goal is required");
    }

    if (!["crawl", "walk", "run"].includes(trustMode)) {
      return apiErrors.badRequest("trustMode must be crawl, walk, or run");
    }

    if (!["cloud_browser", "owner_desktop"].includes(executionTarget)) {
      return apiErrors.badRequest(
        "executionTarget must be cloud_browser or owner_desktop",
      );
    }

    if (
      !["observe", "assist", "autonomous_low_risk", "autonomous_full"].includes(
        autonomyLevel,
      )
    ) {
      return apiErrors.badRequest(
        "autonomyLevel must be observe, assist, autonomous_low_risk, or autonomous_full",
      );
    }

    const created = await startLiveRun(ctx, params.id, {
      goal,
      targetApps,
      trustMode: trustMode as any,
      autonomyLevel: autonomyLevel as any,
      executionTarget: executionTarget as any,
      deviceId: body?.deviceId ? String(body.deviceId) : null,
      employeeType: body?.employeeType ? String(body.employeeType) : undefined,
      employeeName: body?.employeeName ? String(body.employeeName) : undefined,
    });

    return NextResponse.json({ success: true, session: created });
  } catch (error: any) {
    console.error("[live-run] start error", error);
    return apiErrors.internal(error?.message || "Failed to start live run");
  }
}
