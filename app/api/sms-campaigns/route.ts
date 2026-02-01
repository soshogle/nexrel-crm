import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/sms-campaigns - List all SMS campaigns for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = {
      userId: session.user.id,
    };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const campaigns = await prisma.smsCampaign.findMany({
      where,
      include: {
        recipients: {
          select: {
            id: true,
            status: true,
            recipientPhone: true,
            recipientName: true,
            sentAt: true,
            deliveredAt: true,
            repliedAt: true,
          },
        },
        _count: {
          select: {
            recipients: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate metrics for each campaign
    const campaignsWithMetrics = campaigns.map((campaign) => ({
      ...campaign,
      metrics: {
        totalRecipients: campaign.totalRecipients,
        sent: campaign.totalSent,
        delivered: campaign.totalDelivered,
        replied: campaign.totalReplied,
        failed: campaign.totalFailed,
        deliveryRate: campaign.totalSent > 0 ? ((campaign.totalDelivered / campaign.totalSent) * 100).toFixed(1) : '0',
        replyRate: campaign.totalDelivered > 0 ? ((campaign.totalReplied / campaign.totalDelivered) * 100).toFixed(1) : '0',
      },
    }));

    return NextResponse.json({ campaigns: campaignsWithMetrics });
  } catch (error: any) {
    console.error('Error fetching SMS campaigns:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch SMS campaigns' },
      { status: 500 }
    );
  }
}

// POST /api/sms-campaigns - Create a new SMS campaign
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      message,
      minLeadScore = 75,
      dailyLimit,
      weeklyLimit,
      scheduledFor,
      targetLeadIds,
    } = body;

    // Validation
    if (!name || !message) {
      return NextResponse.json(
        { error: 'Name and message are required' },
        { status: 400 }
      );
    }

    if (message.length > 160) {
      return NextResponse.json(
        { error: 'Message must be 160 characters or less for a single SMS' },
        { status: 400 }
      );
    }

    // Get user's SMS provider (Twilio) phone number
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { smsProviderConfig: true },
    });

    let fromNumber = null;
    if (user?.smsProviderConfig) {
      try {
        const config = JSON.parse(user.smsProviderConfig);
        fromNumber = config.phoneNumber || null;
      } catch (e) {
        console.error('Failed to parse SMS provider config:', e);
      }
    }

    // Count target leads based on filters
    const targetLeads = await prisma.lead.findMany({
      where: {
        userId: session.user.id,
        leadScore: minLeadScore ? { gte: minLeadScore } : undefined,
        id: targetLeadIds ? { in: targetLeadIds } : undefined,
        phone: { not: null },
      },
      select: {
        id: true,
      },
    });

    // Create the campaign
    const campaign = await prisma.smsCampaign.create({
      data: {
        userId: session.user.id,
        name,
        message,
        minLeadScore,
        dailyLimit: dailyLimit || null,
        weeklyLimit: weeklyLimit || null,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        fromNumber,
        totalRecipients: targetLeads.length,
        targetLeadIds: targetLeadIds || null,
        status: scheduledFor ? 'SCHEDULED' : 'DRAFT',
      },
      include: {
        _count: {
          select: {
            recipients: true,
          },
        },
      },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating SMS campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create SMS campaign' },
      { status: 500 }
    );
  }
}
