/**
 * GET /api/scheduled-emails/process
 * Process pending scheduled emails that are due.
 * Call this from a cron job (e.g. every minute).
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EmailService } from "@/lib/email-service";

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
    const pending = await prisma.scheduledEmail.findMany({
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
        const emailService = new EmailService();
        const success = await emailService.sendEmail({
          to: email.toEmail,
          subject: email.subject,
          html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><p>${email.body.replace(/\n/g, "<br>")}</p></div>`,
          text: email.body,
          userId: email.userId,
        });

        if (success) {
          await prisma.scheduledEmail.update({
            where: { id: email.id },
            data: { status: "SENT", sentAt: new Date() },
          });
          sent++;
        } else {
          await prisma.scheduledEmail.update({
            where: { id: email.id },
            data: { status: "FAILED" },
          });
          failed++;
        }
      } catch (e: any) {
        console.error(`[scheduled-emails] Failed to send ${email.id}:`, e);
        await prisma.scheduledEmail.update({
          where: { id: email.id },
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
    console.error("[scheduled-emails] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process" },
      { status: 500 }
    );
  }
}
