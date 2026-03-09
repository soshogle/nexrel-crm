/**
 * Debug endpoint: /api/debug/voice-agents
 * Returns session info, user lookup, and agent counts to diagnose why My Voice Agents shows empty.
 * Remove or protect in production.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMetaDb } from "@/lib/db/meta-db";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Debug endpoints are admin-only
    const role = (session.user as any)?.role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const db = getCrmDb(ctx);

    const sessionUserId = session.user.id;
    const sessionEmail = session.user.email;

    const userByEmail = sessionEmail
      ? await getMetaDb().user.findUnique({
          where: { email: sessionEmail },
          select: { id: true, email: true, name: true, industry: true },
        })
      : null;
    const userById =
      sessionUserId && !userByEmail
        ? await getMetaDb().user.findUnique({
            where: { id: sessionUserId },
            select: { id: true, email: true, name: true, industry: true },
          })
        : null;

    const userId = userByEmail?.id ?? userById?.id ?? sessionUserId;

    const [industryCount, industrySample, profCount, reCount, voiceCount] =
      await Promise.all([
        db.industryAIEmployeeAgent.count({
          where: { userId, status: "active" },
        }),
        db.industryAIEmployeeAgent.findMany({
          where: { userId },
          select: {
            id: true,
            name: true,
            industry: true,
            employeeType: true,
            elevenLabsAgentId: true,
            status: true,
          },
          take: 5,
        }),
        db.professionalAIEmployeeAgent.count({
          where: { userId },
        }),
        db.rEAIEmployeeAgent.count({
          where: { userId },
        }),
        db.voiceAgent.count({ where: { userId } }),
      ]);

    return NextResponse.json({
      session: {
        userId: sessionUserId,
        email: sessionEmail,
        industry: (session.user as any).industry,
      },
      userLookup: {
        byEmail: userByEmail,
        byId: userById,
        resolvedUserId: userId,
      },
      agentCounts: {
        industry: industryCount,
        professional: profCount,
        re: reCount,
        voiceAgent: voiceCount,
        total: industryCount + profCount + reCount + voiceCount,
      },
      industrySample,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Debug failed", stack: err?.stack },
      { status: 500 },
    );
  }
}
