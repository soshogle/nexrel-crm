/**
 * POST /api/ai-assistant/confirm-email
 * Confirm send or schedule an email draft (from chat/voice approval flow)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/messaging-service";
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

    const payload = await req.json();
    const { action, draft, scheduledFor } = payload;

    if (!action || !draft) {
      return NextResponse.json(
        { error: "action and draft are required" },
        { status: 400 }
      );
    }

    const { contactName, to, subject, body, leadId } = draft;

    if (!contactName || !subject || !body) {
      return NextResponse.json(
        { error: "draft must include contactName, subject, body" },
        { status: 400 }
      );
    }

    if (action === "send") {
      const result = await sendEmail({
        userId: session.user.id,
        contactName,
        subject,
        body,
        email: to,
        leadId,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to send email" },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: result.message || `Email sent to ${contactName}`,
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

      if (!lead?.email) {
        return NextResponse.json(
          { error: `Contact "${contactName}" not found or has no email` },
          { status: 400 }
        );
      }

      await prisma.scheduledEmail.create({
        data: {
          userId: session.user.id,
          leadId: lead.id,
          toEmail: to || lead.email,
          toName: lead.contactPerson || lead.businessName,
          subject,
          body,
          scheduledFor: scheduledDate,
          status: "PENDING",
        },
      });

      return NextResponse.json({
        success: true,
        message: `Email scheduled to ${contactName} for ${scheduledDate.toLocaleString()}`,
      });
    }

    return NextResponse.json(
      { error: "action must be 'send' or 'schedule'" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[confirm-email] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process request" },
      { status: 500 }
    );
  }
}
