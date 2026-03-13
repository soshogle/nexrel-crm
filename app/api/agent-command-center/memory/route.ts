import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDalContextFromSession,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";
import { buildNexrelAIMemoryContext } from "@/lib/nexrel-ai-brain/memory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const resolvedCtx = await resolveDalContext(session.user.id).catch(
      () => null,
    );
    const ctx = getDalContextFromSession(session) ?? resolvedCtx;
    if (!ctx) return apiErrors.unauthorized();

    const windowDays = Number(
      new URL(request.url).searchParams.get("windowDays") || "30",
    );
    const memory = await buildNexrelAIMemoryContext({ ctx, windowDays });
    return NextResponse.json({ success: true, memory });
  } catch (error: any) {
    console.error("[agent-command-center] memory GET error", error);
    return apiErrors.internal(
      error?.message || "Failed to build memory context",
    );
  }
}
