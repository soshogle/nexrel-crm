/**
 * Individual Calendar Connection API
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
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

    const connection = await getCrmDb(ctx).calendarConnection.findFirst({
      where: {
        id: params.id,
        userId: ctx.userId,
      },
      select: {
        id: true,
        provider: true,
        providerAccountId: true,
        calendarId: true,
        calendarName: true,
        syncEnabled: true,
        lastSyncAt: true,
        syncStatus: true,
        webhookUrl: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!connection) {
      return apiErrors.notFound("Connection not found");
    }

    return NextResponse.json({ connection });
  } catch (error) {
    console.error("Error fetching calendar connection:", error);
    return apiErrors.internal("Failed to fetch calendar connection");
  }
}

export async function PATCH(
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

    const body = await request.json();
    const {
      calendarName,
      syncEnabled,
      webhookUrl,
      apiKey,
      settings,
      calendarId,
    } = body;

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

    const updated = await db.calendarConnection.update({
      where: { id: params.id },
      data: {
        calendarName,
        syncEnabled,
        webhookUrl,
        apiKey,
        settings: settings || connection.settings,
        calendarId,
      },
    });

    return NextResponse.json({ connection: updated });
  } catch (error) {
    console.error("Error updating calendar connection:", error);
    return apiErrors.internal("Failed to update calendar connection");
  }
}

export async function DELETE(
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

    await db.calendarConnection.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting calendar connection:", error);
    return apiErrors.internal("Failed to delete calendar connection");
  }
}
