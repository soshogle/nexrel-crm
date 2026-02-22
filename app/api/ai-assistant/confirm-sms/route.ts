/**
 * POST /api/ai-assistant/confirm-sms
 * Confirm send or schedule an SMS draft (from chat/voice approval flow)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendSMS } from "@/lib/messaging-service";
import { prisma } from "@/lib/db";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { leadService } from "@/lib/dal/lead-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, draft, scheduledFor } = body;

    if (!action || !draft) {
      return NextResponse.json(
        { error: "action and draft are required" },
        { status: 400 }
      );
    }

    const { contactName, to, message, leadId } = draft;

    if (!contactName || !message) {
      return NextResponse.json(
        { error: "draft must include contactName and message" },
        { status: 400 }
      );
    }

    if (action === "send") {
      const result = await sendSMS({
        userId: session.user.id,
        contactName,
        message,
        phoneNumber: to,
        leadId,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to send SMS" },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: result.message || `SMS sent to ${contactName}`,
      });
    }

    if (action === "schedule") {
      if (!scheduledFor) {
        return NextResponse.json(
          { error: "scheduledFor is required when action is schedule" },
          { status: 400 }
        );
      }

      const scheduledDate = new Date(scheduledFor);
      if (scheduledDate <= new Date()) {
        return NextResponse.json(
          { error: "Scheduled time must be in the future" },
          { status: 400 }
        );
      }

      const ctx = getDalContextFromSession(session);
      if (!ctx) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const lead = leadId
        ? await leadService.findUnique(ctx, leadId)
        : (await leadService.findMany(ctx, {
            where: {
              OR: [
                { contactPerson: { contains: contactName, mode: "insensitive" } },
                { businessName: { contains: contactName, mode: "insensitive" } },
              ],
            },
            take: 1,
            orderBy: { createdAt: "desc" },
          }))[0];

      if (!lead?.phone) {
        return NextResponse.json(
          { error: `Contact "${contactName}" not found or has no phone number` },
          { status: 400 }
        );
      }

      await prisma.scheduledSms.create({
        data: {
          userId: session.user.id,
          leadId: lead.id,
          toPhone: to || lead.phone,
          toName: lead.contactPerson || lead.businessName,
          message,
          scheduledFor: scheduledDate,
          status: "PENDING",
        },
      });

      return NextResponse.json({
        success: true,
        message: `SMS scheduled to ${contactName} for ${scheduledDate.toLocaleString()}`,
      });
    }

    return NextResponse.json(
      { error: "action must be 'send' or 'schedule'" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[confirm-sms] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process request" },
      { status: 500 }
    );
  }
}
