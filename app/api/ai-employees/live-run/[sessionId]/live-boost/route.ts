import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDalContextFromSession,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";
import { setWorkerLiveBoost } from "@/lib/ai-employees/live-run";

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
    const enabled = Boolean(body?.enabled);
    const data = await setWorkerLiveBoost(ctx, params.sessionId, enabled);

    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    console.error("[live-run live-boost] error", error);
    return apiErrors.internal(error?.message || "Failed to update live boost");
  }
}
