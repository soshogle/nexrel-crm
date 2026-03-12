import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDalContextFromSession,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";
import { runAgentCommandCenterCycle } from "@/lib/agent-command-center-runner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const OWNER_ROLES = new Set([
  "BUSINESS_OWNER",
  "ADMIN",
  "AGENCY_ADMIN",
  "SUPER_ADMIN",
]);

export async function POST(request: NextRequest) {
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

    const body = await request.json().catch(() => ({}));
    const result = await runAgentCommandCenterCycle(ctx, {
      enableExternal: Boolean(body?.enableExternal),
      allowPaidLaunch: Boolean(body?.allowPaidLaunch),
      apolloQuery:
        typeof body?.apolloQuery === "string" ? body.apolloQuery : undefined,
      socialMessage:
        typeof body?.socialMessage === "string"
          ? body.socialMessage
          : undefined,
      source: "manual",
    });

    return NextResponse.json(result, { status: result.success ? 200 : 409 });
  } catch (error: any) {
    console.error("[agent-command-center] scheduler run error", error);
    return apiErrors.internal(error?.message || "Failed scheduled cycle run");
  }
}
