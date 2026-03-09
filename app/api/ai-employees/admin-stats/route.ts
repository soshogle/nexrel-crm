/**
 * AI Employee Admin Stats - Phase 5
 * Platform-wide stats (ADMIN/SUPER_ADMIN only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    const role = (user?.role || (session.user as any).role) as string;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return apiErrors.forbidden();
    }

    const since = new Date();
    since.setDate(since.getDate() - 1); // Last 24h

    const [scheduleCount, industryExecs, reExecs] = await Promise.all([
      (db as any).aIEmployeeDailySchedule.count({
        where: { enabled: true },
      }),
      (db as any).industryAIEmployeeExecution.count({
        where: { createdAt: { gte: since } },
      }),
      db.rEAIEmployeeExecution.count({ where: { createdAt: { gte: since } } }),
    ]);

    const uniqueUsersWithSchedules = await (
      db as any
    ).aIEmployeeDailySchedule.groupBy({
      by: ["userId"],
      where: { enabled: true },
      _count: { userId: true },
    });

    return NextResponse.json({
      success: true,
      stats: {
        activeSchedules: scheduleCount,
        uniqueUsersWithSchedules: uniqueUsersWithSchedules.length,
        industryExecutions24h: industryExecs,
        reExecutions24h: reExecs,
        totalExecutions24h: industryExecs + reExecs,
      },
    });
  } catch (e: any) {
    console.error("[admin-stats]", e);
    return apiErrors.internal(e?.message || "Failed to fetch stats");
  }
}
