import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

// GET auto-reply settings

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
    const db = getCrmDb(ctx);

    let settings = await db.autoReplySettings.findUnique({
      where: { userId: ctx.userId },
    });

    // Create default settings if none exist
    if (!settings) {
      settings = await db.autoReplySettings.create({
        data: {
          userId: ctx.userId,
          isEnabled: false,
          responseTone: "professional",
          responseLanguage: "en",
          businessHoursEnabled: true,
          businessHoursStart: "09:00",
          businessHoursEnd: "17:00",
          businessDays: JSON.stringify([
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
          ]),
          timezone: "America/New_York",
          maxResponseLength: 500,
          confidenceThreshold: 0.7,
          useConversationHistory: true,
          historyDepth: 10,
          notifyOnEscalation: true,
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Failed to fetch auto-reply settings:", error);
    return apiErrors.internal("Failed to fetch auto-reply settings");
  }
}

// PATCH update auto-reply settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const body = await request.json();

    // Ensure settings exist
    let settings = await db.autoReplySettings.findUnique({
      where: { userId: ctx.userId },
    });

    if (!settings) {
      // Create with defaults
      settings = await db.autoReplySettings.create({
        data: {
          userId: ctx.userId,
          ...body,
          businessDays: body.businessDays
            ? JSON.stringify(body.businessDays)
            : undefined,
          escalationKeywords: body.escalationKeywords
            ? JSON.stringify(body.escalationKeywords)
            : undefined,
          escalationTopics: body.escalationTopics
            ? JSON.stringify(body.escalationTopics)
            : undefined,
          channelSettings: body.channelSettings || undefined,
        },
      });
    } else {
      // Update existing
      settings = await db.autoReplySettings.update({
        where: { userId: ctx.userId },
        data: {
          ...body,
          businessDays: body.businessDays
            ? JSON.stringify(body.businessDays)
            : undefined,
          escalationKeywords: body.escalationKeywords
            ? JSON.stringify(body.escalationKeywords)
            : undefined,
          escalationTopics: body.escalationTopics
            ? JSON.stringify(body.escalationTopics)
            : undefined,
          channelSettings: body.channelSettings || undefined,
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Failed to update auto-reply settings:", error);
    return apiErrors.internal("Failed to update auto-reply settings");
  }
}
