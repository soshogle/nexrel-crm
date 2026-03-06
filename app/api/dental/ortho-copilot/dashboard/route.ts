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
    const clinicId = searchParams.get("clinicId");
    const leadId = searchParams.get("leadId");

    const where: Record<string, unknown> = {
      userId: session.user.id,
      generatedAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    };
    if (clinicId) where.clinicId = clinicId;
    if (leadId) where.leadId = leadId;

    const assessments = await db.orthoProgressAssessment.findMany({
      where,
      orderBy: { generatedAt: "desc" },
      include: {
        lead: {
          select: {
            id: true,
            contactPerson: true,
            businessName: true,
          },
        },
      },
      take: 200,
    });

    const latestByLead = new Map<string, any>();
    for (const item of assessments) {
      if (!latestByLead.has(item.leadId)) {
        latestByLead.set(item.leadId, item);
      }
    }

    const latest = Array.from(latestByLead.values());
    const byUrgency = {
      urgent: latest.filter((x) => x.urgency === "URGENT").length,
      soon: latest.filter((x) => x.urgency === "SOON").length,
      routine: latest.filter((x) => x.urgency === "ROUTINE").length,
    };

    const avgRisk = latest.length
      ? latest.reduce((sum, x) => sum + Number(x.overallRiskScore || 0), 0) /
        latest.length
      : 0;

    return NextResponse.json({
      success: true,
      summary: {
        patientsTracked: latest.length,
        avgRiskScore: avgRisk,
        byUrgency,
      },
      patients: latest,
    });
  } catch (error) {
    console.error("Error fetching ortho copilot dashboard:", error);
    return apiErrors.internal("Failed to fetch ortho copilot dashboard");
  }
}
