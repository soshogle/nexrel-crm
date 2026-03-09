/**
 * GET /api/scheduled-sms/process
 * Process pending scheduled SMS that are due.
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
import { sendSMS } from "@/lib/messaging-service";
import {
  logJobComplete,
  logJobStart,
  logJobTenant,
} from "@/lib/ops/job-logger";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const job = "scheduled-sms-process";
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
      const pending = await getCrmDb(ctx).scheduledSms.findMany({
        where: {
          status: "PENDING",
          scheduledFor: { lte: now },
        },
        include: { user: true },
      });

      let sent = 0;
      let failed = 0;

      for (const sms of pending) {
        try {
          const result = await sendSMS({
            userId: sms.userId,
            contactName: sms.toName || "Contact",
            message: sms.message,
            phoneNumber: sms.toPhone,
            leadId: sms.leadId,
          });

          if (result.success) {
            await getCrmDb(ctx).scheduledSms.update({
              where: { id: sms.id },
              data: { status: "SENT", sentAt: new Date() },
            });
            sent++;
          } else {
            await getCrmDb(ctx).scheduledSms.update({
              where: { id: sms.id },
              data: { status: "FAILED" },
            });
            failed++;
          }
        } catch (e: any) {
          console.error(`[scheduled-sms] Failed to send ${sms.id}:`, e);
          await getCrmDb(ctx).scheduledSms.update({
            where: { id: sms.id },
            data: { status: "FAILED" },
          });
          failed++;
        }
      }

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
    console.error("[scheduled-sms] Error:", error);
    return apiErrors.internal(error?.message || "Failed to process");
  }
}
