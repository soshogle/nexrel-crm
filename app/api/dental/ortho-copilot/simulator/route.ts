import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRouteDb } from "@/lib/dal/get-route-db";
import { apiErrors } from "@/lib/api-error";
import { simulateInterventions } from "@/lib/dental/ortho-copilot-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();
    const db = getRouteDb(session) as any;

    const body = await request.json().catch(() => ({}));
    const leadId = String(body?.leadId || "").trim();
    const interventions = Array.isArray(body?.interventions)
      ? body.interventions.map((x: any) => String(x))
      : [];

    if (!leadId) return apiErrors.badRequest("leadId is required");
    if (interventions.length === 0)
      return apiErrors.badRequest("interventions must be a non-empty array");

    const latest = await db.orthoProgressAssessment.findFirst({
      where: { userId: session.user.id, leadId },
      orderBy: { generatedAt: "desc" },
      select: {
        id: true,
        overallRiskScore: true,
        confidenceScore: true,
        predictedDelayDays: true,
        generatedAt: true,
      },
    });

    if (!latest) {
      return apiErrors.notFound("No assessments found for this patient");
    }

    const simulation = simulateInterventions(
      {
        overallRiskScore: Number(latest.overallRiskScore || 0),
        confidenceScore: Number(latest.confidenceScore || 0),
        predictedDelayDays: Number(latest.predictedDelayDays || 0),
      },
      interventions,
    );

    return NextResponse.json({
      success: true,
      basedOnAssessmentId: latest.id,
      basedOnGeneratedAt: latest.generatedAt,
      simulation,
    });
  } catch (error) {
    console.error("Error running ortho copilot simulation:", error);
    return apiErrors.internal("Failed to run intervention simulation");
  }
}
