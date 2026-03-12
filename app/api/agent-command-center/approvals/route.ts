import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDalContextFromSession,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { getCrmDb } from "@/lib/dal";
import { apiErrors } from "@/lib/api-error";
import {
  approveNexrelAiBrainJob,
  rejectNexrelAiBrainJob,
} from "@/lib/nexrel-ai-brain/operator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const resolvedCtx = await resolveDalContext(session.user.id).catch(
      () => null,
    );
    const ctx = getDalContextFromSession(session) ?? resolvedCtx;
    if (!ctx) return apiErrors.unauthorized();

    const db = getCrmDb(ctx);
    const jobs = await db.aIJob.findMany({
      where: {
        userId: ctx.userId,
        status: "PENDING",
        input: { path: ["approvalRequired"], equals: true },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        jobType: true,
        priority: true,
        input: true,
        createdAt: true,
      },
    });

    const notifications = await db.hITLNotification.findMany({
      where: {
        userId: ctx.userId,
        isActioned: false,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        executionId: true,
        taskName: true,
        message: true,
        urgency: true,
        createdAt: true,
      },
    });

    const map = new Map(notifications.map((n) => [n.executionId, n]));
    const items = jobs.map((job) => ({
      ...job,
      hitl: map.get(job.id) || null,
    }));

    return NextResponse.json({ success: true, approvals: items });
  } catch (error: any) {
    console.error("[agent-command-center] approvals GET error", error);
    return apiErrors.internal(error?.message || "Failed to load approvals");
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
    const decision = String(body?.decision || "").toLowerCase();
    const jobId = String(body?.jobId || "");
    const notes =
      typeof body?.notes === "string" && body.notes.trim()
        ? body.notes
        : undefined;

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: "jobId is required" },
        { status: 400 },
      );
    }

    if (decision === "approve") {
      const result = await approveNexrelAiBrainJob(
        ctx,
        session.user.id,
        jobId,
        notes,
      );
      return NextResponse.json({ success: true, decision, result });
    }

    if (decision === "reject") {
      const result = await rejectNexrelAiBrainJob(
        ctx,
        session.user.id,
        jobId,
        notes,
      );
      return NextResponse.json({ success: true, decision, result });
    }

    return NextResponse.json(
      { success: false, error: "decision must be approve or reject" },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("[agent-command-center] approvals POST error", error);
    return apiErrors.internal(error?.message || "Failed to process approval");
  }
}
