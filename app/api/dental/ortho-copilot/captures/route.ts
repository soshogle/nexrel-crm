import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRouteDb } from "@/lib/dal/get-route-db";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REQUIRED_VIEWS = [
  "FRONTAL",
  "LEFT_BUCCAL",
  "RIGHT_BUCCAL",
  "UPPER_OCCLUSAL",
  "LOWER_OCCLUSAL",
];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();
    const db = getRouteDb(session) as any;

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");
    const orthoTreatmentId = searchParams.get("orthoTreatmentId");
    const clinicId = searchParams.get("clinicId");
    const take = Math.min(Number(searchParams.get("take") || "12"), 50);

    const where: Record<string, unknown> = { userId: session.user.id };
    if (leadId) where.leadId = leadId;
    if (orthoTreatmentId) where.orthoTreatmentId = orthoTreatmentId;
    if (clinicId) where.clinicId = clinicId;

    const captures = await db.orthoCaptureSession.findMany({
      where,
      orderBy: { capturedAt: "desc" },
      take,
      include: {
        assets: true,
      },
    });

    return NextResponse.json({ success: true, captures });
  } catch (error) {
    console.error("Error fetching ortho copilot captures:", error);
    return apiErrors.internal("Failed to fetch capture sessions");
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
    const source = body?.source ? String(body.source) : "PATIENT_APP";

    if (!leadId || !clinicId) {
      return apiErrors.badRequest("leadId and clinicId are required");
    }

    const lead = await db.lead.findFirst({
      where: { id: leadId, userId: session.user.id },
      select: { id: true },
    });

    if (!lead) return apiErrors.notFound("Lead not found");

    const capture = await db.orthoCaptureSession.create({
      data: {
        leadId,
        clinicId,
        userId: session.user.id,
        orthoTreatmentId,
        source,
        captureType: "GUIDED_PHOTO_SET",
        status: "PENDING_UPLOAD",
        qualityIssues: [],
      },
    });

    return NextResponse.json(
      {
        success: true,
        capture,
        requiredViews: REQUIRED_VIEWS,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating ortho copilot capture:", error);
    return apiErrors.internal("Failed to create capture session");
  }
}
