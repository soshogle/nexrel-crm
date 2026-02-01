import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;

    // Verify campaign exists and belongs to user
    const campaign = await prisma.smsCampaign.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        sequences: {
          orderBy: { sequenceOrder: 'asc' },
        },
        enrollments: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Calculate analytics
    const totalEnrolled = campaign.enrollments.length;
    const activeEnrollments = campaign.enrollments.filter(
      (e: any) => e.status === 'ACTIVE'
    ).length;
    const completedEnrollments = campaign.enrollments.filter(
      (e: any) => e.status === 'COMPLETED'
    ).length;

    const totalSent = campaign.sequences.reduce(
      (sum: number, seq: any) => sum + seq.totalSent,
      0
    );
    const totalDelivered = campaign.sequences.reduce(
      (sum: number, seq: any) => sum + seq.totalDelivered,
      0
    );
    const totalReplied = campaign.sequences.reduce(
      (sum: number, seq: any) => sum + seq.totalReplied,
      0
    );
    const totalFailed = campaign.sequences.reduce(
      (sum: number, seq: any) => sum + seq.totalFailed,
      0
    );

    const deliveryRate =
      totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
    const replyRate =
      totalDelivered > 0 ? (totalReplied / totalDelivered) * 100 : 0;
    const failureRate = totalSent > 0 ? (totalFailed / totalSent) * 100 : 0;

    // Sequence performance
    const sequencePerformance = campaign.sequences.map((seq: any) => {
      const seqReplyRate =
        seq.totalDelivered > 0
          ? (seq.totalReplied / seq.totalDelivered) * 100
          : 0;
      const seqDeliveryRate =
        seq.totalSent > 0 ? (seq.totalDelivered / seq.totalSent) * 100 : 0;

      return {
        sequenceOrder: seq.sequenceOrder,
        name: seq.name,
        message: seq.message.substring(0, 100) + (seq.message.length > 100 ? '...' : ''),
        totalSent: seq.totalSent,
        totalDelivered: seq.totalDelivered,
        totalReplied: seq.totalReplied,
        totalFailed: seq.totalFailed,
        deliveryRate: seqDeliveryRate,
        replyRate: seqReplyRate,
      };
    });

    const analytics = {
      totalEnrolled,
      activeEnrollments,
      completedEnrollments,
      totalSent,
      totalDelivered,
      totalReplied,
      totalFailed,
      deliveryRate,
      replyRate,
      failureRate,
      sequencePerformance,
    };

    return NextResponse.json({ analytics });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
