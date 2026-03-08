import { NextRequest, NextResponse } from "next/server";
import { getCrmDb } from "@/lib/dal";
import { resolveDalContext } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

// GET /api/appointments/public/availability - Get available time slots

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const date = searchParams.get("date");
    const duration = parseInt(searchParams.get("duration") || "30"); // minutes

    if (!userId || !date) {
      return apiErrors.badRequest("userId and date are required");
    }

    const ctx = await resolveDalContext(userId);
    const db = getCrmDb(ctx);

    // Verify user exists in canonical tenant DB context
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return apiErrors.notFound("Invalid user ID");
    }

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all appointments for that day
    const appointments = await db.bookingAppointment.findMany({
      where: {
        userId: userId,
        status: {
          notIn: ["CANCELLED", "NO_SHOW"],
        },
        appointmentDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        appointmentDate: "asc",
      },
    });

    // Generate time slots (9 AM to 5 PM by default)
    const businessHours = {
      start: 9, // 9 AM
      end: 17, // 5 PM
    };

    const availableSlots: any[] = [];
    const slotDuration = duration; // minutes

    for (let hour = businessHours.start; hour < businessHours.end; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const slotStart = new Date(targetDate);
        slotStart.setHours(hour, minute, 0, 0);

        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

        // Check if slot overlaps with any existing appointment
        const hasConflict = appointments.some((apt) => {
          const aptStart = new Date(apt.appointmentDate);
          const aptEnd = new Date(
            aptStart.getTime() + apt.duration * 60 * 1000,
          );

          return (
            (slotStart >= aptStart && slotStart < aptEnd) ||
            (slotEnd > aptStart && slotEnd <= aptEnd) ||
            (slotStart <= aptStart && slotEnd >= aptEnd)
          );
        });

        if (!hasConflict && slotStart > new Date()) {
          availableSlots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            available: true,
          });
        }
      }
    }

    return NextResponse.json({
      date: targetDate.toISOString(),
      slots: availableSlots,
    });
  } catch (error) {
    console.error("Error fetching availability:", error);
    return apiErrors.internal("Failed to fetch availability");
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
