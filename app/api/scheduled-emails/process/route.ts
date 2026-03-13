/**
 * GET /api/scheduled-emails/process
 * Process pending scheduled emails that are due.
 * Call this from a cron job (e.g. every minute).
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDalContextFromSession,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { getCrmDb } from "@/lib/dal";
import { getMetaDb } from "@/lib/db/meta-db";
import { EmailService } from "@/lib/email-service";
import {
  logJobComplete,
  logJobStart,
  logJobTenant,
} from "@/lib/ops/job-logger";
import { apiErrors } from "@/lib/api-error";
import { runMasterConductorOperatorPreflight } from "@/lib/nexrel-ai-brain/master-conductor";
import { logNexrelAIExecutionOutcome } from "@/lib/nexrel-ai-brain/decision-log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const job = "scheduled-emails-process";
    const startedAt = Date.now();
    // Allow cron secret for server-to-server calls
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
    const cronUserId = req.headers.get("x-user-id");
    async function processCtx(
      ctx: Awaited<ReturnType<typeof resolveDalContext>>,
    ) {
      const now = new Date();
      const pending = await getCrmDb(ctx).scheduledEmail.findMany({
        where: {
          status: "PENDING",
          scheduledFor: { lte: now },
        },
        include: { user: true },
      });

      let sent = 0;
      let failed = 0;

      for (const email of pending) {
        try {
          const outboundPreflight = await runMasterConductorOperatorPreflight({
            userId: ctx.userId,
            surface: "cron",
            objective: `scheduled_email_dispatch:${email.id}`,
            requestedActions: [
              {
                type: "MASS_OUTREACH",
                riskTier: "HIGH",
                reason: "Scheduled email dispatch preflight",
                payload: {
                  scheduledEmailId: email.id,
                  toEmail: email.toEmail,
                  subject: email.subject,
                },
              },
            ],
          });

          if (!outboundPreflight.allowed) {
            await getCrmDb(ctx).scheduledEmail.update({
              where: { id: email.id },
              data: { status: "FAILED" },
            });
            failed++;
            continue;
          }

          const emailService = new EmailService();
          const success = await emailService.sendEmail({
            to: email.toEmail,
            subject: email.subject,
            html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><p>${email.body.replace(/\n/g, "<br>")}</p></div>`,
            text: email.body,
            userId: email.userId,
          });

          if (success) {
            await getCrmDb(ctx).scheduledEmail.update({
              where: { id: email.id },
              data: { status: "SENT", sentAt: new Date() },
            });
            sent++;
          } else {
            await getCrmDb(ctx).scheduledEmail.update({
              where: { id: email.id },
              data: { status: "FAILED" },
            });
            failed++;
          }
        } catch (e: any) {
          console.error(`[scheduled-emails] Failed to send ${email.id}:`, e);
          await getCrmDb(ctx).scheduledEmail.update({
            where: { id: email.id },
            data: { status: "FAILED" },
          });
          failed++;
        }
      }

      await logNexrelAIExecutionOutcome({
        userId: ctx.userId,
        surface: "cron",
        objective: "scheduled_emails_process",
        actual: {
          processed: pending.length,
          sent,
          failed,
        },
      });

      return { processed: pending.length, sent, failed };
    }

    if (isCron && !cronUserId) {
      logJobStart({ job, mode: "cron-fallback" });
      const users = await getMetaDb().user.findMany({
        where: { deletedAt: null },
        select: { id: true },
        take: 2000,
      });

      let processed = 0;
      let sent = 0;
      let failed = 0;
      for (const user of users) {
        const ctx = await resolveDalContext(user.id);
        const result = await processCtx(ctx);
        processed += result.processed;
        sent += result.sent;
        failed += result.failed;
        if (result.processed > 0 || result.failed > 0) {
          logJobTenant({
            job,
            mode: "cron-fallback",
            tenantId: user.id,
            processed: result.processed,
            sent: result.sent,
            failed: result.failed,
          });
        }
      }

      logJobComplete({
        job,
        mode: "cron-fallback",
        tenants: users.length,
        processed,
        sent,
        failed,
        durationMs: Date.now() - startedAt,
      });

      return NextResponse.json({ success: true, processed, sent, failed });
    }

    let ctx: Awaited<ReturnType<typeof resolveDalContext>> | null = null;

    if (isCron) {
      if (!cronUserId) return apiErrors.unauthorized();
      logJobStart({
        job,
        mode: "cron-targeted",
        tenantId: cronUserId,
      });
      ctx = await resolveDalContext(cronUserId);
    } else {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return apiErrors.unauthorized();
      }
      ctx = getDalContextFromSession(session);
    }
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const result = await processCtx(ctx);
    logJobComplete({
      job,
      mode: isCron ? "cron-targeted" : "session",
      tenantId: ctx.userId,
      processed: result.processed,
      sent: result.sent,
      failed: result.failed,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      processed: result.processed,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (error: any) {
    console.error("[scheduled-emails] Error:", error);
    return apiErrors.internal(error?.message || "Failed to process");
  }
}
