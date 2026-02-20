/**
 * Cron: Send scheduled reports (weekly pipeline summary, etc.)
 * Runs every Monday at 9am UTC.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { emailService } from '@/lib/email-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { accountStatus: 'APPROVED' },
    select: { id: true, email: true, name: true, onboardingProgress: true },
  });

  const sent: string[] = [];
  const errors: string[] = [];

  for (const user of users) {
    try {
      // Gather stats for this user
      const [
        leadCount,
        newLeadsThisWeek,
        activeDealCount,
        totalDealValue,
        callsThisWeek,
        campaignsActive,
        upcomingAppointments,
      ] = await Promise.all([
        prisma.lead.count({ where: { userId: user.id } }),
        prisma.lead.count({
          where: {
            userId: user.id,
            createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) },
          },
        }),
        prisma.deal.count({ where: { userId: user.id, status: { in: ['IN_PROGRESS', 'NEGOTIATION'] } } }),
        prisma.deal.aggregate({
          where: { userId: user.id, status: { in: ['IN_PROGRESS', 'NEGOTIATION'] } },
          _sum: { value: true },
        }),
        prisma.callLog.count({
          where: {
            userId: user.id,
            createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) },
          },
        }),
        prisma.campaign.count({ where: { userId: user.id, status: 'ACTIVE' } }),
        prisma.bookingAppointment.count({
          where: {
            userId: user.id,
            appointmentDate: { gte: new Date(), lte: new Date(Date.now() + 7 * 86_400_000) },
            status: 'SCHEDULED',
          },
        }),
      ]);

      const pipelineValue = totalDealValue._sum.value || 0;
      const formattedValue = pipelineValue >= 1000
        ? `$${(pipelineValue / 1000).toFixed(0)}K`
        : `$${pipelineValue.toFixed(0)}`;

      const weekStart = new Date(Date.now() - 7 * 86_400_000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const weekEnd = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      await emailService.sendEmail({
        to: user.email,
        subject: `Weekly Pipeline Report — ${weekStart} to ${weekEnd}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:30px;border-radius:8px 8px 0 0;text-align:center;">
              <h1 style="margin:0;font-size:22px;">Weekly Pipeline Report</h1>
              <p style="margin:8px 0 0;opacity:0.9;font-size:14px;">${weekStart} — ${weekEnd}</p>
            </div>
            <div style="padding:24px 30px;background:#fff;border:1px solid #e5e7eb;border-top:none;">
              <p>Hi ${user.name || 'there'},</p>
              <p>Here's your weekly activity summary:</p>

              <table style="width:100%;border-collapse:collapse;margin:20px 0;">
                <tr style="background:#f9fafb;">
                  <td style="padding:12px 16px;font-weight:600;border-bottom:1px solid #e5e7eb;">Total Contacts</td>
                  <td style="padding:12px 16px;text-align:right;font-size:18px;font-weight:700;border-bottom:1px solid #e5e7eb;">${leadCount.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;font-weight:600;border-bottom:1px solid #e5e7eb;">New Leads This Week</td>
                  <td style="padding:12px 16px;text-align:right;font-size:18px;font-weight:700;color:#22c55e;border-bottom:1px solid #e5e7eb;">+${newLeadsThisWeek}</td>
                </tr>
                <tr style="background:#f9fafb;">
                  <td style="padding:12px 16px;font-weight:600;border-bottom:1px solid #e5e7eb;">Active Deals</td>
                  <td style="padding:12px 16px;text-align:right;font-size:18px;font-weight:700;border-bottom:1px solid #e5e7eb;">${activeDealCount}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;font-weight:600;border-bottom:1px solid #e5e7eb;">Pipeline Value</td>
                  <td style="padding:12px 16px;text-align:right;font-size:18px;font-weight:700;color:#667eea;border-bottom:1px solid #e5e7eb;">${formattedValue}</td>
                </tr>
                <tr style="background:#f9fafb;">
                  <td style="padding:12px 16px;font-weight:600;border-bottom:1px solid #e5e7eb;">Calls This Week</td>
                  <td style="padding:12px 16px;text-align:right;font-size:18px;font-weight:700;border-bottom:1px solid #e5e7eb;">${callsThisWeek}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;font-weight:600;border-bottom:1px solid #e5e7eb;">Active Campaigns</td>
                  <td style="padding:12px 16px;text-align:right;font-size:18px;font-weight:700;border-bottom:1px solid #e5e7eb;">${campaignsActive}</td>
                </tr>
                <tr style="background:#f9fafb;">
                  <td style="padding:12px 16px;font-weight:600;">Upcoming Appointments</td>
                  <td style="padding:12px 16px;text-align:right;font-size:18px;font-weight:700;">${upcomingAppointments}</td>
                </tr>
              </table>

              <p style="margin-top:20px;text-align:center;">
                <a href="${process.env.NEXTAUTH_URL || ''}/dashboard" style="background:#667eea;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;">Open Dashboard</a>
              </p>
            </div>
            <div style="padding:16px 30px;background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;text-align:center;color:#888;font-size:12px;">
              <p style="margin:0;">This is an automated weekly report from your CRM.</p>
            </div>
          </div>
        `,
        userId: user.id,
      });

      sent.push(user.email);
    } catch (e) {
      console.error(`[scheduled-reports] Failed for ${user.email}:`, e);
      errors.push(user.email);
    }
  }

  console.log(`[scheduled-reports] Sent ${sent.length} reports, ${errors.length} errors`);

  return NextResponse.json({ sent: sent.length, errors: errors.length, emails: sent });
}
