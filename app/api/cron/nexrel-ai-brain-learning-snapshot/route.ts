import { NextRequest, NextResponse } from "next/server";
import { getMetaDb } from "@/lib/db/meta-db";
import { apiErrors } from "@/lib/api-error";
import { resolveDalContext } from "@/lib/context/industry-context";
import { getCrmDb } from "@/lib/dal";
import { buildLearningReport } from "@/lib/nexrel-ai-brain/learning-report";

function isAuthorizedCron(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  return !!cronSecret && authHeader === `Bearer ${cronSecret}`;
}

async function runSnapshot(request: NextRequest) {
  try {
    if (!isAuthorizedCron(request)) {
      return apiErrors.unauthorized();
    }

    const url = new URL(request.url);
    const limit = Math.max(
      1,
      Math.min(200, Number(url.searchParams.get("limit") || "50")),
    );
    const days = Math.max(
      7,
      Math.min(90, Number(url.searchParams.get("days") || "14")),
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
    const results: Array<{
      userId: string;
      email: string | null;
      snapshotId?: string;
      allowRate?: number;
      sent?: number;
      failedCount?: number;
      error?: string;
    }> = [];

    for (const owner of owners) {
      try {
        const ctx = await resolveDalContext(owner.id);
        const report = await buildLearningReport(ctx, days);
        const db = getCrmDb(ctx);

        const previous = await db.auditLog.findFirst({
          where: {
            userId: ctx.userId,
            entityType: "NEXREL_AI_BRAIN_LEARNING_SNAPSHOT",
          },
          orderBy: { createdAt: "desc" },
          select: { metadata: true },
        });

        const prevTotals = ((previous?.metadata as any)?.totals || {}) as any;
        const deltas = {
          allowRate:
            report.totals.allowRate - Number(prevTotals?.allowRate || 0),
          sent: report.totals.sent - Number(prevTotals?.sent || 0),
          failed: report.totals.failed - Number(prevTotals?.failed || 0),
          blocked: report.totals.blocked - Number(prevTotals?.blocked || 0),
        };

        const snapshot = await db.auditLog.create({
          data: {
            userId: ctx.userId,
            action: "SETTINGS_MODIFIED",
            severity: "LOW",
            entityType: "NEXREL_AI_BRAIN_LEARNING_SNAPSHOT",
            entityId: crypto.randomUUID(),
            metadata: {
              days,
              totals: report.totals,
              mandate: report.mandate,
              bySurfaceTop: report.bySurface.slice(0, 10),
              deltas,
              createdAt: new Date().toISOString(),
            },
            success: true,
          },
          select: { id: true },
        });

        processed += 1;
        results.push({
          userId: owner.id,
          email: owner.email,
          snapshotId: snapshot.id,
          allowRate: report.totals.allowRate,
          sent: report.totals.sent,
          failedCount: report.totals.failed,
        });
      } catch (error: any) {
        failed += 1;
        results.push({
          userId: owner.id,
          email: owner.email,
          error: error?.message || "Snapshot failed",
        });
      }
    }

    return NextResponse.json({
      success: true,
      days,
      totalOwners: owners.length,
      processed,
      failed,
      results,
    });
  } catch (error: any) {
    console.error("[nexrel-ai-brain] learning snapshot cron error", error);
    return apiErrors.internal(
      error?.message || "Failed learning snapshot cron",
    );
  }
}

export async function GET(request: NextRequest) {
  return runSnapshot(request);
}

export async function POST(request: NextRequest) {
  return runSnapshot(request);
}
