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
    const createTask = Boolean(body?.createTask ?? true);
    const scheduleFollowUp = Boolean(body?.scheduleFollowUp ?? false);
    const followUpDate = body?.followUpDate
      ? new Date(body.followUpDate)
      : null;
    const clinicianNote = body?.clinicianNote
      ? String(body.clinicianNote)
      : null;

    const recommendation = await db.orthoRecommendation.findFirst({
      where: { id, userId: session.user.id },
      include: {
        lead: {
          select: {
            id: true,
            contactPerson: true,
            businessName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!recommendation) return apiErrors.notFound("Recommendation not found");

    const txn = await db.$transaction(async (tx: any) => {
      let linkedTaskId: string | null = null;
      let linkedAppointmentId: string | null = null;

      if (createTask) {
        const task = await tx.task.create({
          data: {
            userId: session.user.id,
            leadId: recommendation.leadId,
            title: `[Ortho Copilot] ${recommendation.title}`,
            description: recommendation.rationale,
            priority:
              recommendation.actionType === "EARLY_VISIT" ? "HIGH" : "MEDIUM",
            status: "TODO",
            category: "ORTHO_COPILOT",
            tags: ["ORTHO_COPILOT", recommendation.actionType],
            dueDate:
              recommendation.actionType === "EARLY_VISIT"
                ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
                : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
        linkedTaskId = task.id;
      }

      if (scheduleFollowUp && followUpDate && !isNaN(followUpDate.getTime())) {
        const apt = await tx.bookingAppointment.create({
          data: {
            userId: session.user.id,
            clinicId: recommendation.clinicId,
            leadId: recommendation.leadId,
            customerName:
              recommendation.lead?.contactPerson ||
              recommendation.lead?.businessName ||
              "Patient",
            customerEmail: recommendation.lead?.email || null,
            customerPhone: recommendation.lead?.phone || "000-000-0000",
            appointmentDate: followUpDate,
            duration: 30,
            status: "SCHEDULED",
            notes: `Follow-up from Ortho Copilot recommendation: ${recommendation.title}`,
            meetingType: "IN_PERSON",
          },
        });
        linkedAppointmentId = apt.id;
      }

      const updated = await tx.orthoRecommendation.update({
        where: { id: recommendation.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
          clinicianNote,
          linkedTaskId,
          linkedAppointmentId,
        },
      });

      return { updated, linkedTaskId, linkedAppointmentId };
    });

    return NextResponse.json({ success: true, ...txn });
  } catch (error) {
    console.error("Error accepting ortho recommendation:", error);
    return apiErrors.internal("Failed to accept recommendation");
  }
}
