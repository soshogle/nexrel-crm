/**
 * Cron: Send SMS appointment reminders
 * Runs every 15 minutes. Finds upcoming appointments within configurable
 * reminder windows (24h and 2h before) and sends SMS + optional email.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendSMS } from '@/lib/sms';
import { sendEmail } from '@/lib/email';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const REMINDER_WINDOWS = [
  { label: '24h', hoursBeforeMin: 23.5, hoursBeforeMax: 24.5 },
  { label: '2h', hoursBeforeMin: 1.5, hoursBeforeMax: 2.5 },
];

function formatDate(d: Date, tz: string): string {
  return d.toLocaleDateString('en-CA', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric' });
}

function formatTime(d: Date, tz: string): string {
  return d.toLocaleTimeString('en-CA', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return apiErrors.unauthorized();
  }

  const now = new Date();
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const window of REMINDER_WINDOWS) {
    const fromTime = new Date(now.getTime() + window.hoursBeforeMin * 60 * 60 * 1000);
    const toTime = new Date(now.getTime() + window.hoursBeforeMax * 60 * 60 * 1000);

    const appointments = await prisma.bookingAppointment.findMany({
      where: {
        appointmentDate: { gte: fromTime, lte: toTime },
        status: 'SCHEDULED',
        reminderSent: window.label === '24h' ? false : undefined,
      },
      include: {
        lead: { select: { contactPerson: true, phone: true, email: true } },
        clinic: { select: { name: true, phone: true, timezone: true } },
        appointmentType: { select: { name: true } },
        user: { select: { id: true, name: true } },
      },
    });

    const sentIds: string[] = [];
    const errorIds: string[] = [];

    for (const appt of appointments) {
      const phone = appt.customerPhone || appt.lead?.phone;
      const email = appt.customerEmail || appt.lead?.email;
      const patientName = appt.customerName || appt.lead?.contactPerson || 'there';
      const clinicName = appt.clinic?.name || 'our office';
      const tz = appt.customerTimezone || appt.clinic?.timezone || 'America/Toronto';
      const apptTypeName = appt.appointmentType?.name || 'your appointment';

      const dateStr = formatDate(appt.appointmentDate, tz);
      const timeStr = formatTime(appt.appointmentDate, tz);

      const smsBody = window.label === '24h'
        ? `Hi ${patientName}, reminder: ${apptTypeName} at ${clinicName} tomorrow (${dateStr}) at ${timeStr}. Reply CONFIRM to confirm or call ${appt.clinic?.phone || 'us'} to reschedule.`
        : `Hi ${patientName}, your ${apptTypeName} at ${clinicName} is in 2 hours (${timeStr}). See you soon!`;

      try {
        if (phone) {
          await sendSMS({ to: phone, message: smsBody });
        }

        if (email && window.label === '24h') {
          await sendEmail({
            to: email,
            subject: `Appointment Reminder — ${dateStr}`,
            html: `
              <div style="font-family:sans-serif;max-width:480px">
                <h2>Appointment Reminder</h2>
                <p>Hi ${patientName},</p>
                <p>This is a reminder for your upcoming appointment:</p>
                <table style="border-collapse:collapse;margin:16px 0">
                  <tr><td style="padding:4px 12px 4px 0;font-weight:600">Date</td><td>${dateStr}</td></tr>
                  <tr><td style="padding:4px 12px 4px 0;font-weight:600">Time</td><td>${timeStr}</td></tr>
                  <tr><td style="padding:4px 12px 4px 0;font-weight:600">Type</td><td>${apptTypeName}</td></tr>
                  <tr><td style="padding:4px 12px 4px 0;font-weight:600">Location</td><td>${clinicName}</td></tr>
                </table>
                <p>If you need to reschedule, please contact us${appt.clinic?.phone ? ` at ${appt.clinic.phone}` : ''}.</p>
              </div>
            `,
          });
        }

        sentIds.push(appt.id);
      } catch (err) {
        console.error(`Failed to send reminder for appointment ${appt.id}:`, err);
        errorIds.push(appt.id);
      }
    }

    // Batch-update all successfully-sent appointments in one query instead of N individual updates
    if (sentIds.length > 0) {
      await prisma.bookingAppointment.updateMany({
        where: { id: { in: sentIds } },
        data: { reminderSent: true, reminderSentAt: new Date() },
      });
    }

    sent += sentIds.length;
    errors += errorIds.length;
    skipped += appointments.filter(a => !a.customerPhone && !a.lead?.phone).length;
  }

  return NextResponse.json({
    success: true,
    sent,
    skipped,
    errors,
    timestamp: now.toISOString(),
  });
}
