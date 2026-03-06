import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRouteDb } from "@/lib/dal/get-route-db";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function buildMessage(
  name: string,
  urgency: string,
  drivers: string[],
): string {
  const base =
    urgency === "URGENT"
      ? `Hi ${name}, we noticed signs your treatment may drift before your next visit. `
      : urgency === "SOON"
        ? `Hi ${name}, your progress check suggests you may benefit from a quick adjustment this week. `
        : `Hi ${name}, your treatment is generally on track. `;

  const wear = drivers.includes("LOW_WEAR_TIME")
    ? "Please keep aligner wear close to your prescribed daily hours. "
    : "";
  const elastics = drivers.includes("ELASTICS_NONCOMPLIANCE")
    ? "Please prioritize elastic wear exactly as directed. "
    : "";
  const capture = drivers.includes("LOW_CAPTURE_QUALITY")
    ? "We also need one clearer photo check-in to confirm your progress. "
    : "";

  return `${base}${wear}${elastics}${capture}Reply if you want us to schedule an earlier check-in.`.trim();
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();
    const db = getRouteDb(session) as any;

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");
    if (!leadId) return apiErrors.badRequest("leadId is required");

    const [lead, latest] = await Promise.all([
      db.lead.findFirst({
        where: { id: leadId, userId: session.user.id },
        select: {
          id: true,
          contactPerson: true,
          businessName: true,
          phone: true,
          email: true,
        },
      }),
      db.orthoProgressAssessment.findFirst({
        where: { userId: session.user.id, leadId },
        orderBy: { generatedAt: "desc" },
        select: {
          id: true,
          urgency: true,
          driverTags: true,
          confidenceScore: true,
          overallRiskScore: true,
          predictedDelayDays: true,
        },
      }),
    ]);

    if (!lead) return apiErrors.notFound("Lead not found");
    if (!latest) return apiErrors.notFound("No assessment available");

    const patientName = String(
      lead.contactPerson || lead.businessName || "Patient",
    )
      .split(" ")
      .slice(0, 1)
      .join(" ");

    const message = buildMessage(
      patientName,
      latest.urgency,
      latest.driverTags || [],
    );

    return NextResponse.json({
      success: true,
      preview: {
        assessmentId: latest.id,
        channel: lead.phone ? "SMS" : "EMAIL",
        audience: "PATIENT",
        message,
        context: {
          urgency: latest.urgency,
          riskScore: latest.overallRiskScore,
          confidenceScore: latest.confidenceScore,
          predictedDelayDays: latest.predictedDelayDays,
          driverTags: latest.driverTags,
        },
      },
    });
  } catch (error) {
    console.error("Error generating coaching preview:", error);
    return apiErrors.internal("Failed to generate coaching preview");
  }
}
