/**
 * Patient Trajectory API
 * Fetches all clinical history for a patient and runs the trajectory engine
 * to produce 6-month and 12-month projections.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRouteDb } from "@/lib/dal/get-route-db";
import { apiErrors } from "@/lib/api-error";
import {
  computeTrajectory,
  type PatientHistoryInput,
  type PerioExam,
  type OdontogramSnapshot,
  type XrayFinding,
  type TreatmentPlan,
  type RecallRecord,
} from "@/lib/dental/trajectory-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized("Unauthorized");
    }
    const db = getRouteDb(session);

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");
    const clinicId = searchParams.get("clinicId");

    if (!leadId) {
      return apiErrors.badRequest("leadId is required");
    }

    // Fetch all data in parallel
    const [perioCharts, odontograms, xrays, treatmentPlans, recalls] =
      await Promise.all([
        // 1. All periodontal exams
        db.dentalPeriodontalChart.findMany({
          where: { leadId, ...(clinicId ? { clinicId } : {}) },
          orderBy: { chartDate: "asc" },
        }),

        // 2. Odontogram snapshots
        db.dentalOdontogram.findMany({
          where: { leadId, ...(clinicId ? { clinicId } : {}) },
          orderBy: { createdAt: "asc" },
        }),

        // 3. X-ray findings with AI analysis
        db.dentalXRay.findMany({
          where: {
            leadId,
            ...(clinicId ? { clinicId } : {}),
            aiAnalysis: { not: { equals: undefined } },
          },
          orderBy: { dateTaken: "asc" },
        }),

        // 4. Treatment plans
        db.dentalTreatmentPlan.findMany({
          where: { leadId, ...(clinicId ? { clinicId } : {}) },
          orderBy: { createdDate: "asc" },
        }),

        // 5. Recall records
        db.dentalRecall
          .findMany({
            where: { leadId, ...(clinicId ? { clinicId } : {}) },
          })
          .catch(() => []), // May not exist yet
      ]);

    // Transform database records into engine input types
    const perioExams: PerioExam[] = perioCharts.map((c: any) => ({
      id: c.id,
      date: (c.chartDate || c.createdAt).toISOString(),
      measurements: (typeof c.measurements === "object"
        ? c.measurements
        : {}) as Record<string, any>,
    }));

    const odontogramSnapshots: OdontogramSnapshot[] = odontograms.map(
      (o: any) => ({
        date: (o.updatedAt || o.createdAt).toISOString(),
        data: (typeof o.toothData === "object" ? o.toothData : {}) as Record<
          string,
          any
        >,
      }),
    );

    const xrayFindings: XrayFinding[] = xrays.map((x: any) => {
      const analysis =
        typeof x.aiAnalysis === "object" ? (x.aiAnalysis as any) : {};
      const findings =
        typeof analysis.findings === "string"
          ? analysis.findings
          : Array.isArray(analysis.findings)
            ? analysis.findings.join(" ")
            : "";
      const recommendations =
        typeof analysis.recommendations === "string"
          ? analysis.recommendations
          : Array.isArray(analysis.recommendations)
            ? analysis.recommendations.join(" ")
            : "";
      return {
        id: x.id,
        date: (x.dateTaken || x.createdAt).toISOString(),
        xrayType: x.xrayType || "UNKNOWN",
        teethIncluded: Array.isArray(x.teethIncluded) ? x.teethIncluded : [],
        findings,
        recommendations,
        confidence: analysis.confidence,
      };
    });

    const plans: TreatmentPlan[] = treatmentPlans.map((tp: any) => ({
      id: tp.id,
      planName: tp.planName || "Treatment Plan",
      status: tp.status || "DRAFT",
      procedures: Array.isArray(tp.procedures) ? tp.procedures : [],
      totalCost: tp.totalCost || 0,
      patientConsent: tp.patientConsent || false,
      createdDate: (tp.createdDate || tp.createdAt).toISOString(),
    }));

    const recallRecords: RecallRecord[] = (recalls as any[]).map((r: any) => ({
      status: r.status || "ACTIVE",
      nextDueDate: (r.nextDueDate || new Date()).toISOString(),
      lastVisitDate: r.lastVisitDate?.toISOString(),
      remindersSent: r.remindersSent || 0,
    }));

    const input: PatientHistoryInput = {
      perioExams,
      odontogramSnapshots,
      xrayFindings,
      treatmentPlans: plans,
      recalls: recallRecords,
    };

    const result = computeTrajectory(input);

    return NextResponse.json({
      success: true,
      trajectory: result,
      dataAvailable: {
        perioExams: perioExams.length,
        odontograms: odontogramSnapshots.length,
        xrays: xrayFindings.length,
        treatmentPlans: plans.length,
        recalls: recallRecords.length,
      },
    });
  } catch (error: any) {
    console.error("[Trajectory API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to compute trajectory",
      },
      { status: 500 },
    );
  }
}
