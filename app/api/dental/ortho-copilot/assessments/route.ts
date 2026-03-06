import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRouteDb } from "@/lib/dal/get-route-db";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();
    const db = getRouteDb(session) as any;

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");
    const clinicId = searchParams.get("clinicId");
    const orthoTreatmentId = searchParams.get("orthoTreatmentId");
    const limit = Math.min(Number(searchParams.get("limit") || "20"), 50);

    const where: Record<string, unknown> = { userId: session.user.id };
    if (leadId) where.leadId = leadId;
    if (clinicId) where.clinicId = clinicId;
    if (orthoTreatmentId) where.orthoTreatmentId = orthoTreatmentId;

    const assessments = await db.orthoProgressAssessment.findMany({
      where,
      orderBy: { generatedAt: "desc" },
      take: limit,
      include: {
        recommendations: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({ success: true, assessments });
  } catch (error) {
    console.error("Error fetching ortho assessments:", error);
    return apiErrors.internal("Failed to fetch ortho assessments");
  }
}
