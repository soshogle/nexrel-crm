import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRouteDb } from "@/lib/dal/get-route-db";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
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
      include: { assets: true },
    });

    if (!capture) return apiErrors.notFound("Capture session not found");

    return NextResponse.json({ success: true, assets: capture.assets });
  } catch (error) {
    console.error("Error fetching capture assets:", error);
    return apiErrors.internal("Failed to fetch capture assets");
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();
    const db = getRouteDb(session) as any;
    const { id } = await params;

    const body = await request.json();
    const documentId = String(body?.documentId || "").trim();
    const viewType = String(body?.viewType || "").trim();
    const isPrimary = Boolean(body?.isPrimary ?? true);

    if (!documentId || !viewType) {
      return apiErrors.badRequest("documentId and viewType are required");
    }

    const capture = await db.orthoCaptureSession.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true, leadId: true },
    });

    if (!capture) return apiErrors.notFound("Capture session not found");

    const doc = await db.patientDocument.findFirst({
      where: {
        id: documentId,
        userId: session.user.id,
        leadId: capture.leadId,
      },
      select: { id: true },
    });

    if (!doc) {
      return apiErrors.notFound("Document not found for this patient");
    }

    const asset = await db.orthoCaptureAsset.upsert({
      where: {
        captureSessionId_viewType: {
          captureSessionId: id,
          viewType,
        },
      },
      update: {
        documentId,
        isPrimary,
      },
      create: {
        captureSessionId: id,
        documentId,
        viewType,
        isPrimary,
      },
    });

    return NextResponse.json({ success: true, asset });
  } catch (error) {
    console.error("Error attaching capture asset:", error);
    return apiErrors.internal("Failed to attach capture asset");
  }
}
