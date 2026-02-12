/**
 * Cron: Send scheduled reports (weekly pipeline summary, etc.)
 * Configure in vercel.json: "cron": "0 9 * * 1" for Monday 9am
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, email: true, onboardingProgress: true },
  });

  const sent: string[] = [];
  for (const user of users) {
    const progress = (user.onboardingProgress as any) || {};
    const reports = progress.scheduledReports || [];
    const weekly = reports.filter((r: any) => r.frequency === 'weekly');
    if (weekly.length === 0) continue;

    try {
      // Would call getStatistics and send email - placeholder
      // In production: use Resend/SendGrid to send HTML report
      sent.push(user.email);
    } catch (e) {
      console.error(`Failed to send report to ${user.email}:`, e);
    }
  }

  return NextResponse.json({ sent: sent.length, emails: sent });
}
