import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRouteDb } from "@/lib/dal/get-route-db";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();
    const db = getRouteDb(session) as any;

    const body = await request.json().catch(() => ({}));
    const assessmentId = String(body?.assessmentId || "").trim();
    const actualDelayDays =
      body?.actualDelayDays === null || body?.actualDelayDays === undefined
        ? null
        : Number(body.actualDelayDays);
    const clinicianOutcome = body?.clinicianOutcome
      ? String(body.clinicianOutcome)
      : "UNSPECIFIED";
    const notes = body?.notes ? String(body.notes) : null;

    if (!assessmentId) return apiErrors.badRequest("assessmentId is required");

    const assessment = await db.orthoProgressAssessment.findFirst({
      where: {
        id: assessmentId,
        userId: session.user.id,
      },
      select: {
        id: true,
        predictedDelayDays: true,
        findings: true,
      },
    });

    if (!assessment) return apiErrors.notFound("Assessment not found");

    const findings = (assessment.findings as any) || {};
    const outcomeLog = Array.isArray(findings?.outcomeLog)
      ? findings.outcomeLog
      : [];

    const baselineDelay = Number(assessment.predictedDelayDays || 0);
    const realizedDelay = Number(actualDelayDays || 0);

    const entry = {
      loggedAt: new Date().toISOString(),
      clinicianOutcome,
      predictedDelayDays: baselineDelay,
      actualDelayDays: actualDelayDays,
      deltaDays:
        actualDelayDays === null || actualDelayDays === undefined
          ? null
          : realizedDelay - baselineDelay,
      notes,
      loggedBy: session.user.id,
    };

    const updated = await db.orthoProgressAssessment.update({
      where: { id: assessment.id },
      data: {
        findings: {
          ...findings,
          outcomeLog: [...outcomeLog, entry].slice(-20),
          learningSignal:
            actualDelayDays === null || actualDelayDays === undefined
              ? findings.learningSignal || "PENDING"
              : Math.abs(realizedDelay - baselineDelay) <= 5
                ? "CALIBRATED"
                : realizedDelay > baselineDelay
                  ? "UNDERPREDICTED"
                  : "OVERPREDICTED",
        },
      },
    });

    return NextResponse.json({ success: true, assessment: updated });
  } catch (error) {
    console.error("Error logging ortho outcome:", error);
    return apiErrors.internal("Failed to log outcome feedback");
  }
}
