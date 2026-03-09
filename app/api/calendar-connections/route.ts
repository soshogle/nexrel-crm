/**
 * Calendar Connections API
 * Manage user calendar connections across multiple providers
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const connections = await getCrmDb(ctx).calendarConnection.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
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
        // Don't expose tokens
      },
    });

    return NextResponse.json({ connections });
  } catch (error) {
    console.error("Error fetching calendar connections:", error);
    return apiErrors.internal("Failed to fetch calendar connections");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const body = await request.json();
    const {
      provider,
      providerAccountId,
      accessToken,
      refreshToken,
      expiresAt,
      calendarId,
      calendarName,
      webhookUrl,
      apiKey,
      settings,
    } = body;

    if (!provider) {
      return apiErrors.badRequest("Provider is required");
    }

    // Create or update connection
    const connection = await getCrmDb(ctx).calendarConnection.upsert({
      where: {
        userId_provider: {
          userId: ctx.userId,
          provider,
        },
      },
      create: {
        userId: ctx.userId,
        provider,
        providerAccountId,
        accessToken,
        refreshToken,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        calendarId,
        calendarName,
        webhookUrl,
        apiKey,
        settings: settings || {},
        syncEnabled: true,
        syncStatus: "PENDING",
      },
      update: {
        providerAccountId,
        accessToken,
        refreshToken,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        calendarId,
        calendarName,
        webhookUrl,
        apiKey,
        settings: settings || {},
      },
    });

    return NextResponse.json({ connection });
  } catch (error) {
    console.error("Error creating calendar connection:", error);
    return apiErrors.internal("Failed to create calendar connection");
  }
}
