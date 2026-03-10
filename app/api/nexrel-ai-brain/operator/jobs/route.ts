import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDalContextFromSession,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { getCrmDb } from "@/lib/dal";
import { apiErrors } from "@/lib/api-error";

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
    const db = getCrmDb(ctx);

    const status =
      new URL(request.url).searchParams.get("status") || "pending_approval";
    const where =
      status === "pending_approval"
        ? {
            userId: ctx.userId,
            status: "PENDING" as const,
            input: { path: ["approvalRequired"], equals: true },
          }
        : {
            userId: ctx.userId,
          };

    const jobs = await db.aIJob.findMany({
      where,
      include: {
        logs: { take: 5, orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ success: true, jobs });
  } catch (error: any) {
    console.error("[nexrel-ai-brain] operator jobs error", error);
    return apiErrors.internal(
      error?.message || "Failed to fetch operator jobs",
    );
  }
}
