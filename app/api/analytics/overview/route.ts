
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get date range from query params (default to last 30 days)
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch all data in parallel
    const [
      totalLeads,
      newLeads,
      totalDeals,
      totalDealValue,
      wonDeals,
      wonDealValue,
      totalCallLogs,
      totalAppointments,
      emailCampaigns,
      smsCampaigns,
      workflows,
      leadsByStatus,
      dealsByStage,
      revenueByMonth,
    ] = await Promise.all([
      // Total leads
      prisma.lead.count({ where: { userId } }),
      // New leads in period
      prisma.lead.count({
        where: { userId, createdAt: { gte: startDate } },
      }),
      // Total deals
      prisma.deal.count({ where: { userId } }),
      // Total deal value
      prisma.deal.aggregate({
        where: { userId },
        _sum: { value: true },
      }),
      // Won deals
      prisma.deal.count({
        where: {
          userId,
          stage: { name: { contains: 'won', mode: 'insensitive' } },
        },
      }),
      // Won deal value
      prisma.deal.aggregate({
        where: {
          userId,
          stage: { name: { contains: 'won', mode: 'insensitive' } },
        },
        _sum: { value: true },
      }),
      // Total calls
      prisma.callLog.count({ where: { userId } }),
      // Total appointments
      prisma.bookingAppointment.count({ where: { userId } }),
      // Email campaigns
      prisma.emailCampaign.findMany({
        where: { userId },
        select: {
          id: true,
          recipients: {
            select: {
              status: true,
            },
          },
        },
      }),
      // SMS campaigns
      prisma.smsCampaign.findMany({
        where: { userId },
        select: {
          id: true,
          recipients: {
            select: {
              status: true,
            },
          },
        },
      }),
      // Workflows
      prisma.workflow.findMany({
        where: { userId },
        select: {
          id: true,
          enrollments: {
            select: {
              status: true,
            },
          },
        },
      }),
      // Leads by status
      prisma.lead.groupBy({
        by: ['status'],
        where: { userId },
        _count: true,
      }),
      // Deals by stage
      prisma.deal.groupBy({
        by: ['stageId'],
        where: { userId },
        _count: true,
        _sum: { value: true },
      }),
      // Revenue by month (last 6 months)
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "actualCloseDate") as month,
          COUNT(*) as count,
          SUM(value) as revenue
        FROM "Deal"
        WHERE "userId" = ${userId}
          AND "actualCloseDate" IS NOT NULL
          AND "actualCloseDate" >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', "actualCloseDate")
        ORDER BY month DESC
      `,
    ]);

    // Calculate email metrics
    const emailStats = emailCampaigns.reduce(
      (acc: { sent: number; opened: number; clicked: number; delivered: number }, campaign: any) => {
        const recipients = campaign.recipients || [];
        return {
          sent: acc.sent + recipients.filter((r: any) => ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'].includes(r.status)).length,
          opened: acc.opened + recipients.filter((r: any) => ['OPENED', 'CLICKED'].includes(r.status)).length,
          clicked: acc.clicked + recipients.filter((r: any) => r.status === 'CLICKED').length,
          delivered: acc.delivered + recipients.filter((r: any) => ['DELIVERED', 'OPENED', 'CLICKED'].includes(r.status)).length,
        };
      },
      { sent: 0, opened: 0, clicked: 0, delivered: 0 }
    );

    // Calculate SMS metrics
    const smsStats = smsCampaigns.reduce(
      (acc: { sent: number; delivered: number; replied: number }, campaign: any) => {
        const recipients = campaign.recipients || [];
        return {
          sent: acc.sent + recipients.filter((r: any) => ['SENT', 'DELIVERED', 'CLICKED', 'REPLIED'].includes(r.status)).length,
          delivered: acc.delivered + recipients.filter((r: any) => ['DELIVERED', 'CLICKED', 'REPLIED'].includes(r.status)).length,
          replied: acc.replied + recipients.filter((r: any) => r.status === 'REPLIED').length,
        };
      },
      { sent: 0, delivered: 0, replied: 0 }
    );

    // Calculate workflow metrics
    const workflowStats = workflows.reduce(
      (acc: { enrolled: number; completed: number }, workflow: any) => {
        const enrollments = workflow.enrollments || [];
        return {
          enrolled: acc.enrolled + enrollments.length,
          completed: acc.completed + enrollments.filter((e: any) => e.status === 'COMPLETED').length,
        };
      },
      { enrolled: 0, completed: 0 }
    );

    // Calculate conversion rates
    const leadConversionRate = totalLeads > 0 ? (totalDeals / totalLeads) * 100 : 0;
    const dealWinRate = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0;
    const emailOpenRate = emailStats.delivered > 0 ? (emailStats.opened / emailStats.delivered) * 100 : 0;
    const emailClickRate = emailStats.opened > 0 ? (emailStats.clicked / emailStats.opened) * 100 : 0;
    const smsReplyRate = smsStats.delivered > 0 ? (smsStats.replied / smsStats.delivered) * 100 : 0;
    const workflowCompletionRate = workflowStats.enrolled > 0 ? (workflowStats.completed / workflowStats.enrolled) * 100 : 0;

    const analytics = {
      overview: {
        totalLeads,
        newLeads,
        totalDeals,
        totalDealValue: totalDealValue._sum.value || 0,
        wonDeals,
        wonDealValue: wonDealValue._sum.value || 0,
        totalCalls: totalCallLogs,
        totalAppointments,
      },
      conversions: {
        leadConversionRate: Math.round(leadConversionRate * 10) / 10,
        dealWinRate: Math.round(dealWinRate * 10) / 10,
      },
      campaigns: {
        email: {
          ...emailStats,
          openRate: Math.round(emailOpenRate * 10) / 10,
          clickRate: Math.round(emailClickRate * 10) / 10,
        },
        sms: {
          ...smsStats,
          replyRate: Math.round(smsReplyRate * 10) / 10,
        },
      },
      workflows: {
        ...workflowStats,
        completionRate: Math.round(workflowCompletionRate * 10) / 10,
      },
      distribution: {
        leadsByStatus,
        dealsByStage,
      },
      revenue: revenueByMonth,
    };

    return NextResponse.json(analytics);
  } catch (error: unknown) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
