export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    // Check global env key first
    if (process.env.GOOGLE_MAPS_API_KEY) {
      return NextResponse.json({ hasKey: true });
    }

    const apiKey = await db.apiKey.findFirst({
      where: {
        userId: session.user.id,
        service: "google_places",
        isActive: true,
      },
    });

    return NextResponse.json({ hasKey: !!apiKey });
  } catch (error) {
    console.error("Get API key error:", error);
    return apiErrors.internal();
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
    const db = getCrmDb(ctx);

    const { apiKey } = await request.json();

    if (!apiKey) {
      return apiErrors.badRequest("API key is required");
    }

    // Deactivate existing keys
    await db.apiKey.updateMany({
      where: {
        userId: session.user.id,
        service: "google_places",
      },
      data: {
        isActive: false,
      },
    });

    // Create new key
    const newApiKey = await db.apiKey.create({
      data: {
        userId: session.user.id,
        service: "google_places",
        keyName: "api_key",
        keyValue: apiKey,
        isActive: true,
      },
    });

    return NextResponse.json({
      message: "API key saved successfully",
      keyId: newApiKey.id,
    });
  } catch (error) {
    console.error("Save API key error:", error);
    return apiErrors.internal();
  }
}
