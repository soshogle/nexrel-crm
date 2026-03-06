import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRouteDb } from "@/lib/dal/get-route-db";
import { apiErrors } from "@/lib/api-error";
import { buildOrthoCopilotAssessment } from "@/lib/dental/ortho-copilot-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_QUALITY_ISSUE = "INSUFFICIENT_CAPTURE_DATA";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();
    const db = getRouteDb(session) as any;
    const { id } = await params;

    const capture = await db.orthoCaptureSession.findFirst({
      where: { id, userId: session.user.id },
      include: {
        assets: true,
      },
    });

    if (!capture) return apiErrors.notFound("Capture session not found");

    const treatment = capture.orthoTreatmentId
      ? await db.orthoTreatment.findFirst({
          where: { id: capture.orthoTreatmentId, userId: session.user.id },
        })
      : await db.orthoTreatment.findFirst({
          where: { leadId: capture.leadId, userId: session.user.id },
          orderBy: { startDate: "desc" },
        });

    const latestAssessment = await db.orthoProgressAssessment.findFirst({
      where: { leadId: capture.leadId, userId: session.user.id },
      orderBy: { generatedAt: "desc" },
      select: {
        generatedAt: true,
        overallRiskScore: true,
        driftScore: true,
        predictedDelayDays: true,
      },
    });

    const complianceSignals = await db.orthoComplianceSignal.findMany({
      where: {
        leadId: capture.leadId,
        userId: session.user.id,
        recordedAt: {
          gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { recordedAt: "desc" },
      take: 10,
    });

    const avgWearHours = complianceSignals.length
      ? complianceSignals.reduce(
          (sum: number, c: any) => sum + Number(c.wearHours ?? 0),
          0,
        ) / complianceSignals.length
      : null;

    const avgElastics = complianceSignals.length
      ? complianceSignals.reduce(
          (sum: number, c: any) => sum + Number(c.elasticsAdherence ?? 0),
          0,
        ) / complianceSignals.length
      : null;

    const daysSinceLast = latestAssessment?.generatedAt
      ? Math.max(
          0,
          Math.round(
            (Date.now() - new Date(latestAssessment.generatedAt).getTime()) /
              (24 * 60 * 60 * 1000),
          ),
        )
      : null;

    const qualityScore =
      capture.qualityScore ??
      (capture.assets.length >= 5
        ? 85
        : capture.assets.length >= 3
          ? 70
          : capture.assets.length >= 1
            ? 55
            : 40);

    const assessmentResult = buildOrthoCopilotAssessment({
      treatmentType: treatment?.treatmentType,
      wearSchedule: treatment?.wearSchedule,
      averageWearHours: avgWearHours,
      elasticsAdherence: avgElastics,
      qualityScore,
      captureViewsCount: capture.assets.length,
      daysSinceLastCheckIn: daysSinceLast,
      previousAssessment: latestAssessment
        ? {
            overallRiskScore: latestAssessment.overallRiskScore,
            driftScore: latestAssessment.driftScore,
            predictedDelayDays: latestAssessment.predictedDelayDays,
          }
        : null,
    });

    const qualityIssues =
      capture.assets.length === 0
        ? [DEFAULT_QUALITY_ISSUE]
        : capture.qualityIssues || [];

    const result = await db.$transaction(async (tx: any) => {
      const updatedCapture = await tx.orthoCaptureSession.update({
        where: { id: capture.id },
        data: {
          status: "ANALYZED",
          submittedAt: new Date(),
          qualityScore,
          qualityIssues,
          processingError: null,
        },
      });

      const assessment = await tx.orthoProgressAssessment.create({
        data: {
          captureSessionId: capture.id,
          leadId: capture.leadId,
          userId: capture.userId,
          clinicId: capture.clinicId,
          orthoTreatmentId: capture.orthoTreatmentId,
          modelVersion: assessmentResult.modelVersion,
          overallRiskScore: assessmentResult.overallRiskScore,
          driftScore: assessmentResult.driftScore,
          complianceScore: assessmentResult.complianceScore,
          confidenceScore: assessmentResult.confidenceScore,
          urgency: assessmentResult.urgency,
          predictedDelayDays: assessmentResult.predictedDelayDays,
          driverTags: assessmentResult.driverTags,
          findings: assessmentResult.findings,
          recommendedActions: assessmentResult.recommendedActions,
        },
      });

      const recommendations = [];
      for (const recommendation of assessmentResult.recommendedActions) {
        const created = await tx.orthoRecommendation.create({
          data: {
            assessmentId: assessment.id,
            leadId: capture.leadId,
            userId: capture.userId,
            clinicId: capture.clinicId,
            actionType: recommendation.actionType,
            title: recommendation.title,
            rationale: recommendation.rationale,
            expectedImpact: recommendation.expectedImpact || null,
          },
        });
        recommendations.push(created);
      }

      return { updatedCapture, assessment, recommendations };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Error submitting ortho copilot capture:", error);
    return apiErrors.internal("Failed to run ortho copilot analysis");
  }
}
