/**
 * Calendar Connection Sync API
 * Trigger sync for a specific calendar connection
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
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const connection = await db.calendarConnection.findFirst({
      where: {
        id: params.id,
        userId: ctx.userId,
      },
    });

    if (!connection) {
      return apiErrors.notFound("Connection not found");
    }

    const provider = await CalendarService.getProviderForConnection(
      connection.id,
    );

    if (!provider) {
      return apiErrors.internal("Could not create calendar provider");
    }

    const result = await provider.syncEvents(
      connection.lastSyncAt || undefined,
    );

    if (result.success) {
      await db.calendarConnection.update({
        where: { id: connection.id },
        data: {
          lastSyncAt: new Date(),
          syncStatus: "SYNCED",
        },
      });
    } else {
      await db.calendarConnection.update({
        where: { id: connection.id },
        data: {
          syncStatus: "FAILED",
        },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error syncing calendar connection:", error);
    return apiErrors.internal("Failed to sync calendar connection");
  }
}
