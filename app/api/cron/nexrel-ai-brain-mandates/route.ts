import { NextRequest, NextResponse } from "next/server";
import { getMetaDb } from "@/lib/db/meta-db";
import { apiErrors } from "@/lib/api-error";
import { resolveDalContext } from "@/lib/context/industry-context";
import { autoHealMandates } from "@/lib/nexrel-ai-brain/mandate-freshness";

function isAuthorizedCron(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  return !!cronSecret && authHeader === `Bearer ${cronSecret}`;
}

async function runMandateCron(request: NextRequest) {
  try {
    if (!isAuthorizedCron(request)) {
      return apiErrors.unauthorized();
    }

    const url = new URL(request.url);
    const limit = Math.max(
      1,
      Math.min(200, Number(url.searchParams.get("limit") || "50")),
    );
    const singleUserId = url.searchParams.get("userId") || null;

    const owners = singleUserId
      ? await getMetaDb().user.findMany({
          where: { id: singleUserId, deletedAt: null },
          select: { id: true, email: true },
          take: 1,
        })
      : await getMetaDb().user.findMany({
          where: { role: "BUSINESS_OWNER", deletedAt: null },
          select: { id: true, email: true },
          orderBy: { createdAt: "desc" },
          take: limit,
        });

    let processed = 0;
    let failed = 0;
    let totalDue = 0;
    let totalTasksCreated = 0;
    const results: Array<{
      userId: string;
      email: string | null;
      dueCount?: number;
      tasksCreated?: number;
      error?: string;
    }> = [];

    for (const owner of owners) {
      try {
        const ctx = await resolveDalContext(owner.id);
        const result = await autoHealMandates(ctx);
        processed += 1;
        totalDue += result.dueCount;
        totalTasksCreated += result.tasksCreated;
        results.push({
          userId: owner.id,
          email: owner.email,
          dueCount: result.dueCount,
          tasksCreated: result.tasksCreated,
        });
      } catch (error: any) {
        failed += 1;
        results.push({
          userId: owner.id,
          email: owner.email,
          error: error?.message || "Failed mandate run",
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalOwners: owners.length,
      processed,
      failed,
      totalDue,
      totalTasksCreated,
      results,
    });
  } catch (error: any) {
    console.error("[nexrel-ai-brain] mandate cron error", error);
    return apiErrors.internal(error?.message || "Failed mandate cron run");
  }
}

export async function GET(request: NextRequest) {
  return runMandateCron(request);
}

export async function POST(request: NextRequest) {
  return runMandateCron(request);
}
