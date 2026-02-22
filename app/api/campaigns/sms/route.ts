import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCrmDb, leadService, dealService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getCrmDb(ctx);
    const campaigns = await db.smsCampaign.findMany({
      where: { userId: ctx.userId },
      include: {
        recipients: {
          select: {
            id: true,
            status: true,
            sentAt: true,
            deliveredAt: true,
            repliedAt: true,
          },
        },
        _count: {
          select: { recipients: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(campaigns);
  } catch (error: unknown) {
    console.error('Error fetching SMS campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      message,
      fromNumber,
      scheduledFor,
      recipientIds,
      recipientType, // 'leads' or 'deals'
    } = body;

    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getCrmDb(ctx);
    // Create campaign
    const campaign = await db.smsCampaign.create({
      data: {
        userId: ctx.userId,
        name,
        message,
        fromNumber,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        status: scheduledFor ? 'SCHEDULED' : 'DRAFT',
      },
    });

    // Add recipients
    if (recipientIds && recipientIds.length > 0) {
      const recipientData = [];

      if (recipientType === 'leads') {
        const leads = await leadService.findMany(ctx, {
          where: {
            id: { in: recipientIds },
            phone: { not: null },
          },
          select: { id: true, phone: true, businessName: true },
        });

        for (const lead of leads) {
          if (lead.phone) {
            recipientData.push({
              campaignId: campaign.id,
              leadId: lead.id,
              recipientPhone: lead.phone,
              recipientName: lead.businessName,
            });
          }
        }
      } else if (recipientType === 'deals') {
        const deals = await dealService.findMany(ctx, {
          where: { id: { in: recipientIds } },
          include: {
            lead: {
              select: { phone: true, businessName: true },
            },
          },
        });

        for (const deal of deals) {
          if (deal.lead?.phone) {
            recipientData.push({
              campaignId: campaign.id,
              dealId: deal.id,
              leadId: deal.leadId,
              recipientPhone: deal.lead.phone,
              recipientName: deal.lead.businessName,
            });
          }
        }
      }

      if (recipientData.length > 0) {
        await db.smsCampaignDeal.createMany({
          data: recipientData,
        });
      }
    }

    return NextResponse.json(campaign, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating SMS campaign:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
