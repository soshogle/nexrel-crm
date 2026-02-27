/**
 * Cron: Process dental recalls
 * Runs daily. Marks overdue recalls, sends reminder SMS/email for upcoming and overdue.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendSMS } from '@/lib/sms';
import { sendEmail } from '@/lib/email';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return apiErrors.unauthorized();
  }

  const now = new Date();
  let overdueMarked = 0;
  let remindersSent = 0;
  let errors = 0;

  try {
    // 1. Mark overdue recalls
    const overdue = await prisma.dentalRecall.updateMany({
      where: {
        nextDueDate: { lt: now },
        status: 'ACTIVE',
      },
      data: { status: 'OVERDUE' },
    });
    overdueMarked = overdue.count;

    // 2. Find recalls needing reminders (due within 7 days, or overdue with < 3 reminders sent)
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const needsReminder = await prisma.dentalRecall.findMany({
      where: {
        OR: [
          {
            status: 'ACTIVE',
            nextDueDate: { lte: sevenDaysFromNow, gte: now },
            remindersSent: 0,
          },
          {
            status: 'OVERDUE',
            remindersSent: { lt: 3 },
            OR: [
              { lastReminderAt: null },
              { lastReminderAt: { lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
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
      const patientName = recall.lead?.contactPerson || 'there';
      const clinicName = recall.clinic?.name || 'our office';
      const phone = recall.lead?.phone;
      const email = recall.lead?.email;
      const dueDate = recall.nextDueDate.toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' });

      const isOverdue = recall.status === 'OVERDUE';
      const message = isOverdue
        ? `Hi ${patientName}, your ${recall.recallType} at ${clinicName} was due on ${dueDate}. Please call ${recall.clinic?.phone || 'us'} to schedule your appointment.`
        : `Hi ${patientName}, your ${recall.recallType} at ${clinicName} is due on ${dueDate}. Please call ${recall.clinic?.phone || 'us'} to schedule.`;

      try {
        if (phone) {
          await sendSMS({ to: phone, message });
        }
        if (email) {
          await sendEmail({
            to: email,
            subject: isOverdue ? `Overdue: ${recall.recallType} Appointment` : `Upcoming: ${recall.recallType} Due`,
            html: `
              <div style="font-family:sans-serif;max-width:480px">
                <h2>${isOverdue ? 'Overdue Recall Notice' : 'Upcoming Appointment Due'}</h2>
                <p>${message}</p>
                <p style="margin-top:16px;color:#666">
                  ${clinicName}${recall.clinic?.phone ? ` — ${recall.clinic.phone}` : ''}
                </p>
              </div>
            `,
          });
        }

        await prisma.dentalRecall.update({
          where: { id: recall.id },
          data: {
            remindersSent: recall.remindersSent + 1,
            lastReminderAt: now,
          },
        });
        remindersSent++;
      } catch (err) {
        console.error(`Recall reminder failed for ${recall.id}:`, err);
        errors++;
      }
    }
  } catch (err) {
    console.error('Recall cron error:', err);
    return apiErrors.internal('Recall processing failed');
  }

  return NextResponse.json({
    success: true,
    overdueMarked,
    remindersSent,
    errors,
    timestamp: now.toISOString(),
  });
}
