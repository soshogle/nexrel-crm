/**
 * POST /api/ai-assistant/confirm-email
 * Confirm send or schedule an email draft (from chat/voice approval flow)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/messaging-service";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { getCrmDb } from "@/lib/dal";
import { leadService } from "@/lib/dal/lead-service";
import { apiErrors } from "@/lib/api-error";
import { runMasterConductorOperatorPreflight } from "@/lib/nexrel-ai-brain/master-conductor";
import { logNexrelAIExecutionOutcome } from "@/lib/nexrel-ai-brain/decision-log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const payload = await req.json();
    const { action, draft, scheduledFor } = payload;

    if (!action || !draft) {
      return apiErrors.badRequest("action and draft are required");
    }

    const { contactName, to, subject, body, leadId } = draft;

    if (!contactName || !subject || !body) {
      return apiErrors.badRequest(
        "draft must include contactName, subject, body",
      );
    }

    if (action === "send") {
      const preflight = await runMasterConductorOperatorPreflight({
        userId: session.user.id,
        surface: "assistant",
        objective: "confirm_email_send",
        requestedActions: [
          {
            type: "MASS_OUTREACH",
            riskTier: "HIGH",
            reason: "Assistant confirm email send preflight",
            payload: { to, leadId, contactName, subject },
          },
        ],
      });
      if (!preflight.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: "Blocked by Nexrel AI master conductor policy",
          },
          { status: 409 },
        );
      }

      const result = await sendEmail({
        userId: session.user.id,
        contactName,
        subject,
        body,
        email: to,
        leadId,
      });

      if (!result.success) {
        return apiErrors.badRequest(result.error || "Failed to send email");
      }

      await logNexrelAIExecutionOutcome({
        userId: session.user.id,
        surface: "assistant",
        objective: "confirm_email_send",
        actual: { processed: 1, sent: 1, failed: 0 },
      });

      return NextResponse.json({
        success: true,
        message: result.message || `Email sent to ${contactName}`,
      });
    }

    if (action === "schedule") {
      if (!scheduledFor) {
        return apiErrors.badRequest(
          "scheduledFor is required when action is schedule",
        );
      }

      const scheduledDate = new Date(scheduledFor);
      if (scheduledDate <= new Date()) {
        return apiErrors.badRequest("Scheduled time must be in the future");
      }

      const ctx = getDalContextFromSession(session);
      if (!ctx) {
        return apiErrors.unauthorized();
      }
      const db = getCrmDb(ctx);
      const lead = leadId
        ? await leadService.findUnique(ctx, leadId)
        : (
            await leadService.findMany(ctx, {
              where: {
                OR: [
                  {
                    contactPerson: {
                      contains: contactName,
                      mode: "insensitive",
                    },
                  },
                  {
                    businessName: {
                      contains: contactName,
                      mode: "insensitive",
                    },
                  },
                ],
              },
              take: 1,
              orderBy: { createdAt: "desc" },
            })
          )[0];

      if (!lead?.email) {
        return NextResponse.json(
          { error: `Contact "${contactName}" not found or has no email` },
          { status: 400 },
        );
      }

      await db.scheduledEmail.create({
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

      await logNexrelAIExecutionOutcome({
        userId: session.user.id,
        surface: "assistant",
        objective: "confirm_email_schedule",
        actual: { processed: 1, sent: 1, failed: 0 },
      });

      return NextResponse.json({
        success: true,
        message: `Email scheduled to ${contactName} for ${scheduledDate.toLocaleString()}`,
      });
    }

    return apiErrors.badRequest("action must be 'send' or 'schedule'");
  } catch (error: any) {
    console.error("[confirm-email] Error:", error);
    return apiErrors.internal(error?.message || "Failed to process request");
  }
}
