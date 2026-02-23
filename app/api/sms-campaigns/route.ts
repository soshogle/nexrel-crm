import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getCrmDb, leadService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';
import { parsePagination, paginatedResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/sms-campaigns - List all SMS campaigns for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const db = getCrmDb(ctx);
    const where: any = {
      userId: ctx.userId,
    };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const pagination = parsePagination(request);

    const campaigns = await db.smsCampaign.findMany({
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
      take: pagination.take,
      skip: pagination.skip,
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

    const total = await db.smsCampaign.count({ where });
    return paginatedResponse(campaignsWithMetrics, total, pagination, 'campaigns');
  } catch (error: any) {
    console.error('Error fetching SMS campaigns:', error);
    return apiErrors.internal(error.message || 'Failed to fetch SMS campaigns');
  }
}

// POST /api/sms-campaigns - Create a new SMS campaign
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
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
      return apiErrors.badRequest('Name and message are required');
    }

    if (message.length > 160) {
      return apiErrors.badRequest('Message must be 160 characters or less for a single SMS');
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const db = getCrmDb(ctx);
    // Get user's SMS provider (Twilio) phone number
    const user = await db.user.findUnique({
      where: { id: ctx.userId },
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
    const targetLeads = await leadService.findMany(ctx, {
      where: {
        leadScore: minLeadScore ? { gte: minLeadScore } : undefined,
        id: targetLeadIds ? { in: targetLeadIds } : undefined,
        phone: { not: null },
      },
      select: {
        id: true,
      },
    });

    // Create the campaign
    const campaign = await db.smsCampaign.create({
      data: {
        userId: ctx.userId,
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
    return apiErrors.internal(error.message || 'Failed to create SMS campaign');
  }
}
