/**
 * Cron: Process dental recalls
 * Runs daily. Marks overdue recalls, sends reminder SMS/email for upcoming and overdue.
 */

import { NextRequest, NextResponse } from "next/server";
import { createDalContext } from "@/lib/context/industry-context";
import { getCrmDb } from "@/lib/dal";
import { getMetaDb } from "@/lib/db/meta-db";
import { sendSMS } from "@/lib/sms";
import { sendEmail } from "@/lib/email";
import {
  logJobComplete,
  logJobStart,
  logJobTenant,
} from "@/lib/ops/job-logger";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const job = "cron-dental-recalls";
  const startedAt = Date.now();
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return apiErrors.unauthorized();
  }

  const now = new Date();
  let overdueMarked = 0;
  let remindersSent = 0;
  let errors = 0;

  try {
    const users = await getMetaDb().user.findMany({
      where: { deletedAt: null },
      select: { id: true, industry: true },
      take: 2000,
    });
    logJobStart({
      job,
      mode: "cron-fallback",
      tenants: users.length,
    });

    for (const tenant of users) {
      const ctx = createDalContext(tenant.id, tenant.industry);
      const db = getCrmDb(ctx);
      let tenantOverdueMarked = 0;
      let tenantRemindersSent = 0;
      let tenantErrors = 0;

      const overdue = await db.dentalRecall.updateMany({
        where: {
          userId: tenant.id,
          nextDueDate: { lt: now },
          status: "ACTIVE",
        },
        data: { status: "OVERDUE" },
      });
      overdueMarked += overdue.count;
      tenantOverdueMarked += overdue.count;

      const sevenDaysFromNow = new Date(
        now.getTime() + 7 * 24 * 60 * 60 * 1000,
      );
      const needsReminder = await db.dentalRecall.findMany({
        where: {
          userId: tenant.id,
          OR: [
            {
              status: "ACTIVE",
              nextDueDate: { lte: sevenDaysFromNow, gte: now },
              remindersSent: 0,
            },
            {
              status: "OVERDUE",
              remindersSent: { lt: 3 },
              OR: [
                { lastReminderAt: null },
                {
                  lastReminderAt: {
                    lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
                  },
                },
              ],
            },
          ],
        },
        include: {
          lead: { select: { contactPerson: true, phone: true, email: true } },
          clinic: { select: { name: true, phone: true } },
        },
      });

      for (const recall of needsReminder) {
        const patientName = recall.lead?.contactPerson || "there";
        const clinicName = recall.clinic?.name || "our office";
        const phone = recall.lead?.phone;
        const email = recall.lead?.email;
        const dueDate = recall.nextDueDate.toLocaleDateString("en-CA", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });

        const isOverdue = recall.status === "OVERDUE";
        const message = isOverdue
          ? `Hi ${patientName}, your ${recall.recallType} at ${clinicName} was due on ${dueDate}. Please call ${recall.clinic?.phone || "us"} to schedule your appointment.`
          : `Hi ${patientName}, your ${recall.recallType} at ${clinicName} is due on ${dueDate}. Please call ${recall.clinic?.phone || "us"} to schedule.`;

        try {
          if (phone) {
            await sendSMS({ to: phone, message });
          }
          if (email) {
            await sendEmail({
              to: email,
              subject: isOverdue
                ? `Overdue: ${recall.recallType} Appointment`
                : `Upcoming: ${recall.recallType} Due`,
              html: `
                <div style="font-family:sans-serif;max-width:480px">
                  <h2>${isOverdue ? "Overdue Recall Notice" : "Upcoming Appointment Due"}</h2>
                  <p>${message}</p>
                  <p style="margin-top:16px;color:#666">
                    ${clinicName}${recall.clinic?.phone ? ` — ${recall.clinic.phone}` : ""}
                  </p>
                </div>
              `,
            });
          }

          await db.dentalRecall.update({
            where: { id: recall.id },
            data: {
              remindersSent: recall.remindersSent + 1,
              lastReminderAt: now,
            },
          });
          remindersSent++;
          tenantRemindersSent++;
        } catch (err) {
          console.error(`Recall reminder failed for ${recall.id}:`, err);
          errors++;
          tenantErrors++;
        }
      }

      if (
        tenantOverdueMarked > 0 ||
        tenantRemindersSent > 0 ||
        tenantErrors > 0
      ) {
        logJobTenant({
          job,
          mode: "cron-fallback",
          tenantId: tenant.id,
          overdueMarked: tenantOverdueMarked,
          remindersSent: tenantRemindersSent,
          errors: tenantErrors,
        });
      }
    }

    logJobComplete({
      job,
      mode: "cron-fallback",
      overdueMarked,
      remindersSent,
      errors,
      durationMs: Date.now() - startedAt,
    });
  } catch (err) {
    console.error("Recall cron error:", err);
    return apiErrors.internal("Recall processing failed");
  }

  return NextResponse.json({
    success: true,
    overdueMarked,
    remindersSent,
    errors,
    timestamp: now.toISOString(),
  });
}
