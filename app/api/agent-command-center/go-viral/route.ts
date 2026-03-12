import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDalContextFromSession,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";
import {
  generateGoViralAsset,
  listGoViralAssets,
  recordGoViralPerformance,
  regenerateGoViralAsset,
  setGoViralAssetDecision,
  type GoViralKind,
  type GoViralModel,
} from "@/lib/go-viral";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isModel(value: string): value is GoViralModel {
  return value === "nanobanana" || value === "gemini_pro";
}

function isKind(value: string): value is GoViralKind {
  return value === "image" || value === "video";
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();
    const resolvedCtx = await resolveDalContext(session.user.id).catch(
      () => null,
    );
    const ctx = getDalContextFromSession(session) ?? resolvedCtx;
    if (!ctx) return apiErrors.unauthorized();

    const data = await listGoViralAssets(ctx);
    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    console.error("[go-viral] GET error", error);
    return apiErrors.internal(error?.message || "Failed to load Go Viral data");
  }
}

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
    const action = String(body?.action || "");

    if (action === "generate") {
      const model = String(body?.model || "nanobanana").toLowerCase();
      const kind = String(body?.kind || "image").toLowerCase();
      if (!isModel(model) || !isKind(kind)) {
        return NextResponse.json(
          {
            success: false,
            error: "model must be nanobanana/gemini_pro and kind image/video",
          },
          { status: 400 },
        );
      }
      const created = await generateGoViralAsset(ctx, {
        objective: String(body?.objective || "Generate viral lead-gen content"),
        product: String(body?.product || "core offer"),
        audience: String(body?.audience || "high-intent audience"),
        model,
        kind,
        tone: typeof body?.tone === "string" ? body.tone : undefined,
      });
      return NextResponse.json({ success: true, created });
    }

    if (action === "approve" || action === "reject") {
      const jobId = String(body?.jobId || "");
      if (!jobId) {
        return NextResponse.json(
          { success: false, error: "jobId is required" },
          { status: 400 },
        );
      }
      const result = await setGoViralAssetDecision(
        ctx,
        jobId,
        action,
        session.user.id,
      );
      return NextResponse.json({ success: true, result });
    }

    if (action === "regenerate") {
      const jobId = String(body?.jobId || "");
      const model = String(body?.model || "nanobanana").toLowerCase();
      if (!jobId || !isModel(model)) {
        return NextResponse.json(
          { success: false, error: "jobId and valid model are required" },
          { status: 400 },
        );
      }
      const created = await regenerateGoViralAsset(ctx, jobId, model);
      return NextResponse.json({ success: true, created });
    }

    if (action === "record_performance") {
      const jobId = String(body?.jobId || "");
      if (!jobId) {
        return NextResponse.json(
          { success: false, error: "jobId is required" },
          { status: 400 },
        );
      }
      const result = await recordGoViralPerformance(ctx, jobId, {
        views: Number(body?.views || 0),
        engagementRate: Number(body?.engagementRate || 0),
        leads: Number(body?.leads || 0),
      });
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json(
      { success: false, error: "Unsupported action" },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("[go-viral] POST error", error);
    return apiErrors.internal(error?.message || "Failed Go Viral action");
  }
}
