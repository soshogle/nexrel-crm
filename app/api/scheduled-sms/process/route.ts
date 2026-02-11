/**
 * GET /api/scheduled-sms/process
 * Process pending scheduled SMS that are due.
 * Call this from a cron job (e.g. every minute).
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendSMS } from "@/lib/messaging-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    // Allow cron secret for server-to-server calls
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isCron) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const now = new Date();
    const pending = await prisma.scheduledSms.findMany({
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
          await prisma.scheduledSms.update({
            where: { id: sms.id },
            data: { status: "SENT", sentAt: new Date() },
          });
          sent++;
        } else {
          await prisma.scheduledSms.update({
            where: { id: sms.id },
            data: { status: "FAILED" },
          });
          failed++;
        }
      } catch (e: any) {
        console.error(`[scheduled-sms] Failed to send ${sms.id}:`, e);
        await prisma.scheduledSms.update({
          where: { id: sms.id },
          data: { status: "FAILED" },
        });
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      processed: pending.length,
      sent,
      failed,
    });
  } catch (error: any) {
    console.error("[scheduled-sms] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process" },
      { status: 500 }
    );
  }
}
