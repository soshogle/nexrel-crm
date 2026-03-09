/**
 * Global Calendar Sync API
 * Sync all calendar connections for the current user
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { CalendarService } from "@/lib/calendar";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const result = await CalendarService.syncFromCalendar(ctx.userId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error syncing calendars:", error);
    return apiErrors.internal("Failed to sync calendars");
  }
}
