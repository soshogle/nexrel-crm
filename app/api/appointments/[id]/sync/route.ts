/**
 * Appointment Sync API
 * Sync a specific appointment to its connected calendar
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { CalendarService } from "@/lib/calendar";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }
    const db = getCrmDb(ctx);

    const appointment = await db.bookingAppointment.findFirst({
      where: {
        id: params.id,
        userId: ctx.userId,
      },
    });

    if (!appointment) {
      return apiErrors.notFound("Appointment not found");
    }

    const result = await CalendarService.syncAppointmentToCalendar(
      appointment.id,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error syncing appointment:", error);
    return apiErrors.internal("Failed to sync appointment");
  }
}
