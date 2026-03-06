import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRouteDb } from "@/lib/dal/get-route-db";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();
    const db = getRouteDb(session) as any;
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const clinicianNote = body?.clinicianNote
      ? String(body.clinicianNote)
      : null;

    const recommendation = await db.orthoRecommendation.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    });

    if (!recommendation) return apiErrors.notFound("Recommendation not found");

    const updated = await db.orthoRecommendation.update({
      where: { id: recommendation.id },
      data: {
        status: "DISMISSED",
        dismissedAt: new Date(),
        clinicianNote,
      },
    });

    return NextResponse.json({ success: true, recommendation: updated });
  } catch (error) {
    console.error("Error dismissing ortho recommendation:", error);
    return apiErrors.internal("Failed to dismiss recommendation");
  }
}
