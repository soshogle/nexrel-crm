import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDalContextFromSession,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";
import {
  getAutonomyControlPolicy,
  mergeAutonomyPolicy,
  saveAutonomyControlPolicy,
} from "@/lib/agent-command-center-control";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const OWNER_ROLES = new Set([
  "BUSINESS_OWNER",
  "ADMIN",
  "AGENCY_ADMIN",
  "SUPER_ADMIN",
]);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const resolvedCtx = await resolveDalContext(session.user.id).catch(
      () => null,
    );
    const ctx = getDalContextFromSession(session) ?? resolvedCtx;
    if (!ctx) return apiErrors.unauthorized();

    const { policy, updatedAt } = await getAutonomyControlPolicy(ctx);
    return NextResponse.json({ success: true, policy, updatedAt });
  } catch (error: any) {
    console.error("[agent-command-center] control GET error", error);
    return apiErrors.internal(
      error?.message || "Failed to load control policy",
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();
    const role = String(session.user.role || "");
    if (role && !OWNER_ROLES.has(role)) {
      return NextResponse.json(
        { success: false, error: "Owner/admin role required." },
        { status: 403 },
      );
    }

    const resolvedCtx = await resolveDalContext(session.user.id).catch(
      () => null,
    );
    const ctx = getDalContextFromSession(session) ?? resolvedCtx;
    if (!ctx) return apiErrors.unauthorized();

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "patch");
    const reason =
      typeof body?.reason === "string" && body.reason.trim()
        ? body.reason
        : `owner_action:${action}`;

    const current = await getAutonomyControlPolicy(ctx);
    let next = current.policy;

    if (action === "pause") {
      next = mergeAutonomyPolicy(next, { status: "paused" });
    } else if (action === "resume") {
      next = mergeAutonomyPolicy(next, { status: "running" });
    } else if (action === "stop") {
      next = mergeAutonomyPolicy(next, { status: "stopped" });
    } else if (action === "patch") {
      next = mergeAutonomyPolicy(next, body?.policy || {});
    } else {
      return NextResponse.json(
        { success: false, error: "Unsupported action" },
        { status: 400 },
      );
    }

    await saveAutonomyControlPolicy(ctx, next, reason);
    return NextResponse.json({ success: true, policy: next });
  } catch (error: any) {
    console.error("[agent-command-center] control POST error", error);
    return apiErrors.internal(
      error?.message || "Failed to update control policy",
    );
  }
}
