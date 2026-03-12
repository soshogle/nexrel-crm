import { NextRequest, NextResponse } from "next/server";
import { getMetaDb } from "@/lib/db/meta-db";
import { apiErrors } from "@/lib/api-error";
import { resolveDalContext } from "@/lib/context/industry-context";
import { runAgentCommandCenterCycle } from "@/lib/agent-command-center-runner";

function isAuthorizedCron(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  return !!cronSecret && authHeader === `Bearer ${cronSecret}`;
}

async function runCron(request: NextRequest) {
  try {
    if (!isAuthorizedCron(request)) {
      return apiErrors.unauthorized();
    }

    const url = new URL(request.url);
    const limit = Math.max(
      1,
      Math.min(200, Number(url.searchParams.get("limit") || "50")),
    );
    const enableExternal = url.searchParams.get("external") === "1";
    const allowPaidLaunch = url.searchParams.get("paid") === "1";
    const singleUserId = url.searchParams.get("userId") || null;

    const owners = singleUserId
      ? await getMetaDb().user.findMany({
          where: { id: singleUserId, deletedAt: null },
          select: { id: true, email: true },
          take: 1,
        })
      : await getMetaDb().user.findMany({
          where: {
            role: "BUSINESS_OWNER",
            deletedAt: null,
            accountStatus: "ACTIVE",
          },
          select: { id: true, email: true },
          take: limit,
          orderBy: { createdAt: "desc" },
        });

    let executed = 0;
    let failed = 0;
    let blocked = 0;
    const results: Array<{
      userId: string;
      email: string | null;
      success: boolean;
      blockedByOwnerControl?: boolean;
      message?: string;
      error?: string;
    }> = [];

    for (const owner of owners) {
      try {
        const ctx = await resolveDalContext(owner.id);
        const result = await runAgentCommandCenterCycle(ctx, {
          enableExternal,
          allowPaidLaunch,
          source: "cron",
        });

        if (result.success) executed += 1;
        else if ((result as any).blockedByOwnerControl) blocked += 1;
        else failed += 1;

        results.push({
          userId: owner.id,
          email: owner.email,
          success: Boolean(result.success),
          blockedByOwnerControl: Boolean((result as any).blockedByOwnerControl),
          message: (result as any).message,
          error: (result as any).error,
        });
      } catch (error: any) {
        failed += 1;
        results.push({
          userId: owner.id,
          email: owner.email,
          success: false,
          error: error?.message || "Failed cycle run",
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalOwners: owners.length,
      executed,
      blocked,
      failed,
      results,
    });
  } catch (error: any) {
    console.error("[agent-command-center] cron cycle error", error);
    return apiErrors.internal(error?.message || "Failed cron cycle");
  }
}

export async function GET(request: NextRequest) {
  return runCron(request);
}

export async function POST(request: NextRequest) {
  return runCron(request);
}
