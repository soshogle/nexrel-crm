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
    const take = Math.min(Number(searchParams.get("take") || "20"), 100);

    const where: Record<string, unknown> = { userId: session.user.id };
    if (leadId) where.leadId = leadId;
    if (clinicId) where.clinicId = clinicId;

    const signals = await db.orthoComplianceSignal.findMany({
      where,
      orderBy: { recordedAt: "desc" },
      take,
    });

    return NextResponse.json({ success: true, signals });
  } catch (error) {
    console.error("Error fetching compliance signals:", error);
    return apiErrors.internal("Failed to fetch compliance signals");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();
    const db = getRouteDb(session) as any;

    const body = await request.json();
    const leadId = String(body?.leadId || "").trim();
    const clinicId = String(body?.clinicId || "").trim();
    const orthoTreatmentId = body?.orthoTreatmentId
      ? String(body.orthoTreatmentId)
      : null;
    const source = body?.source ? String(body.source) : "STAFF_ENTRY";

    if (!leadId || !clinicId) {
      return apiErrors.badRequest("leadId and clinicId are required");
    }

    const lead = await db.lead.findFirst({
      where: { id: leadId, userId: session.user.id },
      select: { id: true },
    });
    if (!lead) return apiErrors.notFound("Lead not found");

    const signal = await db.orthoComplianceSignal.create({
      data: {
        leadId,
        clinicId,
        userId: session.user.id,
        orthoTreatmentId,
        source,
        wearHours:
          body?.wearHours === null || body?.wearHours === undefined
            ? null
            : Number(body.wearHours),
        elasticsAdherence:
          body?.elasticsAdherence === null ||
          body?.elasticsAdherence === undefined
            ? null
            : Number(body.elasticsAdherence),
        painScore:
          body?.painScore === null || body?.painScore === undefined
            ? null
            : Number(body.painScore),
        notes: body?.notes ? String(body.notes) : null,
        recordedAt: body?.recordedAt ? new Date(body.recordedAt) : new Date(),
      },
    });

    return NextResponse.json({ success: true, signal }, { status: 201 });
  } catch (error) {
    console.error("Error creating compliance signal:", error);
    return apiErrors.internal("Failed to create compliance signal");
  }
}
