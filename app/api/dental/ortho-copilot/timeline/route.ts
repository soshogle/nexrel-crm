import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRouteDb } from "@/lib/dal/get-route-db";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function trendFromDelta(delta: number): "IMPROVING" | "STABLE" | "WORSENING" {
  if (delta <= -0.04) return "IMPROVING";
  if (delta >= 0.04) return "WORSENING";
  return "STABLE";
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();
    const db = getRouteDb(session) as any;

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");
    const clinicId = searchParams.get("clinicId");
    const limit = Math.min(Number(searchParams.get("limit") || "12"), 24);

    if (!leadId) return apiErrors.badRequest("leadId is required");

    const where: Record<string, unknown> = {
      userId: session.user.id,
      leadId,
    };
    if (clinicId) where.clinicId = clinicId;

    const assessments = await db.orthoProgressAssessment.findMany({
      where,
      orderBy: { generatedAt: "asc" },
      take: limit,
      select: {
        id: true,
        generatedAt: true,
        overallRiskScore: true,
        driftScore: true,
        complianceScore: true,
        confidenceScore: true,
        urgency: true,
        predictedDelayDays: true,
        driverTags: true,
        findings: true,
      },
    });

    const timeline = assessments.map((current: any, idx: number) => {
      const prev = idx > 0 ? assessments[idx - 1] : null;
      const riskDelta = prev
        ? Number(
            (
              Number(current.overallRiskScore) - Number(prev.overallRiskScore)
            ).toFixed(3),
          )
        : 0;
      const driftDelta = prev
        ? Number(
            (Number(current.driftScore) - Number(prev.driftScore)).toFixed(3),
          )
        : 0;

      return {
        ...current,
        trend: trendFromDelta(riskDelta),
        riskDelta,
        driftDelta,
        segments: (current.findings as any)?.segments || {
          upperArch: {
            trend: trendFromDelta(riskDelta),
            projectedRisk: current.overallRiskScore,
          },
          lowerArch: {
            trend: trendFromDelta(riskDelta - 0.01),
            projectedRisk: Math.max(0, current.overallRiskScore - 0.02),
          },
          anterior: {
            trend: trendFromDelta(driftDelta),
            projectedRisk: current.driftScore,
          },
          posterior: {
            trend: trendFromDelta(driftDelta + 0.01),
            projectedRisk: Math.min(1, current.driftScore + 0.05),
          },
        },
      };
    });

    const latest = timeline[timeline.length - 1] || null;
    const first = timeline[0] || null;
    const netRiskDelta =
      latest && first
        ? Number((latest.overallRiskScore - first.overallRiskScore).toFixed(3))
        : 0;

    return NextResponse.json({
      success: true,
      timeline,
      summary: {
        points: timeline.length,
        netRiskDelta,
        longTrend: trendFromDelta(netRiskDelta),
      },
    });
  } catch (error) {
    console.error("Error fetching ortho copilot timeline:", error);
    return apiErrors.internal("Failed to fetch timeline");
  }
}
