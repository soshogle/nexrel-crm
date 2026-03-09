import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

// GET /api/clubos/communications/settings/[id] - Get specific notification setting

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
    const db = getCrmDb(ctx);

    const setting = await db.clubOSNotificationSetting.findUnique({
      where: { id: params.id },
    });

    if (!setting) {
      return apiErrors.notFound("Setting not found");
    }

    // Verify ownership
    if (setting.userId !== session.user.id) {
      return apiErrors.forbidden("Unauthorized");
    }

    return NextResponse.json({ setting });
  } catch (error: any) {
    console.error("Error fetching notification setting:", error);
    return apiErrors.internal(error.message || "Failed to fetch setting");
  }
}

// PUT /api/clubos/communications/settings/[id] - Update notification setting
export async function PUT(
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

    const body = await request.json();
    const {
      enabled,
      sendEmail,
      sendSMS,
      reminderHoursBefore,
      reminderDaysInterval,
      emailSubject,
      emailBody,
      smsTemplate,
    } = body;

    // Verify ownership
    const existingSetting = await db.clubOSNotificationSetting.findUnique({
      where: { id: params.id },
    });

    if (!existingSetting) {
      return apiErrors.notFound("Setting not found");
    }

    if (existingSetting.userId !== session.user.id) {
      return apiErrors.forbidden("Unauthorized");
    }

    // Update setting
    const setting = await db.clubOSNotificationSetting.update({
      where: { id: params.id },
      data: {
        enabled,
        sendEmail,
        sendSMS,
        reminderHoursBefore,
        reminderDaysInterval,
        emailSubject,
        emailBody,
        smsTemplate,
      },
    });

    return NextResponse.json({ setting });
  } catch (error: any) {
    console.error("Error updating notification setting:", error);
    return apiErrors.internal(error.message || "Failed to update setting");
  }
}
