import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/campaigns/drip/[id]/analytics - Get campaign analytics

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Verify campaign ownership
    const campaign = await prisma.emailDripCampaign.findFirst({
      where: { id, userId: session.user.id },
      include: {
        sequences: {
          orderBy: { sequenceOrder: 'asc' },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Get enrollment stats
    const enrollmentStats = await prisma.emailDripEnrollment.groupBy({
      by: ['status'],
      where: { campaignId: id },
      _count: true,
    });

    // Get message stats
    const messageStats = await prisma.$queryRaw<
      Array<{
        status: string;
        count: bigint;
      }>
    >`
      SELECT 
        status,
        COUNT(*) as count
      FROM "EmailDripMessage" edm
      INNER JOIN "EmailDripEnrollment" ede ON edm."enrollmentId" = ede.id
      WHERE ede."campaignId" = ${id}
      GROUP BY status
    `;

    // Get overall metrics
    const overallMetrics = await prisma.$queryRaw<
      Array<{
        total_sent: bigint;
        total_delivered: bigint;
        total_opened: bigint;
        total_clicked: bigint;
        total_replied: bigint;
        total_bounced: bigint;
        unique_opens: bigint;
        unique_clicks: bigint;
      }>
    >`
      SELECT 
        COUNT(CASE WHEN status = 'SENT' THEN 1 END) as total_sent,
        COUNT(CASE WHEN "deliveredAt" IS NOT NULL THEN 1 END) as total_delivered,
        COUNT(CASE WHEN "openedAt" IS NOT NULL THEN 1 END) as total_opened,
        COUNT(CASE WHEN "clickedAt" IS NOT NULL THEN 1 END) as total_clicked,
        COUNT(CASE WHEN "repliedAt" IS NOT NULL THEN 1 END) as total_replied,
        COUNT(CASE WHEN "bouncedAt" IS NOT NULL THEN 1 END) as total_bounced,
        COUNT(DISTINCT CASE WHEN "firstOpenedAt" IS NOT NULL THEN "enrollmentId" END) as unique_opens,
        COUNT(DISTINCT CASE WHEN "firstClickedAt" IS NOT NULL THEN "enrollmentId" END) as unique_clicks
      FROM "EmailDripMessage" edm
      INNER JOIN "EmailDripEnrollment" ede ON edm."enrollmentId" = ede.id
      WHERE ede."campaignId" = ${id}
    `;

    // Get sequence performance
    const sequencePerformance = await prisma.$queryRaw<
      Array<{
        sequence_id: string;
        sequence_name: string;
        sequence_order: number;
        total_sent: bigint;
        total_opened: bigint;
        total_clicked: bigint;
        open_rate: number;
        click_rate: number;
      }>
    >`
      SELECT 
        eds.id as sequence_id,
        eds.name as sequence_name,
        eds."sequenceOrder" as sequence_order,
        COUNT(*) as total_sent,
        COUNT(CASE WHEN edm."openedAt" IS NOT NULL THEN 1 END) as total_opened,
        COUNT(CASE WHEN edm."clickedAt" IS NOT NULL THEN 1 END) as total_clicked,
        CASE WHEN COUNT(*) > 0 
          THEN (COUNT(CASE WHEN edm."openedAt" IS NOT NULL THEN 1 END)::float / COUNT(*)::float) * 100 
          ELSE 0 
        END as open_rate,
        CASE WHEN COUNT(*) > 0 
          THEN (COUNT(CASE WHEN edm."clickedAt" IS NOT NULL THEN 1 END)::float / COUNT(*)::float) * 100 
          ELSE 0 
        END as click_rate
      FROM "EmailDripSequence" eds
      LEFT JOIN "EmailDripMessage" edm ON eds.id = edm."sequenceId"
      WHERE eds."campaignId" = ${id}
      GROUP BY eds.id, eds.name, eds."sequenceOrder"
      ORDER BY eds."sequenceOrder"
    `;

    // Calculate rates
    const metrics = overallMetrics[0] || {
      total_sent: 0n,
      total_delivered: 0n,
      total_opened: 0n,
      total_clicked: 0n,
      total_replied: 0n,
      total_bounced: 0n,
      unique_opens: 0n,
      unique_clicks: 0n,
    };

    const totalSent = Number(metrics.total_sent);
    const openRate = totalSent > 0 
      ? (Number(metrics.total_opened) / totalSent) * 100 
      : 0;
    const clickRate = totalSent > 0 
      ? (Number(metrics.total_clicked) / totalSent) * 100 
      : 0;
    const replyRate = totalSent > 0 
      ? (Number(metrics.total_replied) / totalSent) * 100 
      : 0;
    const bounceRate = totalSent > 0 
      ? (Number(metrics.total_bounced) / totalSent) * 100 
      : 0;

    // A/B test results if enabled
    let abTestResults = null;
    if (campaign.enableAbTesting) {
      abTestResults = await prisma.$queryRaw<
        Array<{
          ab_test_group: string;
          total_enrolled: bigint;
          total_opened: bigint;
          total_clicked: bigint;
          open_rate: number;
          click_rate: number;
        }>
      >`
        SELECT 
          ede."abTestGroup" as ab_test_group,
          COUNT(DISTINCT ede.id) as total_enrolled,
          COUNT(CASE WHEN edm."openedAt" IS NOT NULL THEN 1 END) as total_opened,
          COUNT(CASE WHEN edm."clickedAt" IS NOT NULL THEN 1 END) as total_clicked,
          CASE WHEN COUNT(*) > 0 
            THEN (COUNT(CASE WHEN edm."openedAt" IS NOT NULL THEN 1 END)::float / COUNT(*)::float) * 100 
            ELSE 0 
          END as open_rate,
          CASE WHEN COUNT(*) > 0 
            THEN (COUNT(CASE WHEN edm."clickedAt" IS NOT NULL THEN 1 END)::float / COUNT(*)::float) * 100 
            ELSE 0 
          END as click_rate
        FROM "EmailDripEnrollment" ede
        LEFT JOIN "EmailDripMessage" edm ON ede.id = edm."enrollmentId"
        WHERE ede."campaignId" = ${id} AND ede."abTestGroup" IS NOT NULL
        GROUP BY ede."abTestGroup"
      `;
    }

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        createdAt: campaign.createdAt,
      },
      enrollments: {
        total: campaign.totalEnrolled,
        byStatus: enrollmentStats.map(s => ({
          status: s.status,
          count: s._count,
        })),
      },
      messages: {
        byStatus: messageStats.map(s => ({
          status: s.status,
          count: Number(s.count),
        })),
      },
      overall: {
        totalSent,
        totalDelivered: Number(metrics.total_delivered),
        totalOpened: Number(metrics.total_opened),
        totalClicked: Number(metrics.total_clicked),
        totalReplied: Number(metrics.total_replied),
        totalBounced: Number(metrics.total_bounced),
        uniqueOpens: Number(metrics.unique_opens),
        uniqueClicks: Number(metrics.unique_clicks),
        openRate: Math.round(openRate * 100) / 100,
        clickRate: Math.round(clickRate * 100) / 100,
        replyRate: Math.round(replyRate * 100) / 100,
        bounceRate: Math.round(bounceRate * 100) / 100,
      },
      sequences: sequencePerformance.map(s => ({
        sequenceId: s.sequence_id,
        name: s.sequence_name,
        order: s.sequence_order,
        totalSent: Number(s.total_sent),
        totalOpened: Number(s.total_opened),
        totalClicked: Number(s.total_clicked),
        openRate: Math.round(s.open_rate * 100) / 100,
        clickRate: Math.round(s.click_rate * 100) / 100,
      })),
      abTest: abTestResults ? {
        enabled: true,
        results: abTestResults.map(r => ({
          group: r.ab_test_group,
          totalEnrolled: Number(r.total_enrolled),
          totalOpened: Number(r.total_opened),
          totalClicked: Number(r.total_clicked),
          openRate: Math.round(r.open_rate * 100) / 100,
          clickRate: Math.round(r.click_rate * 100) / 100,
        })),
      } : { enabled: false },
    });
  } catch (error: unknown) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
