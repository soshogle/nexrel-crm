import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCrmDb, leadService, dealService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

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
    } as any);

    return NextResponse.json(campaigns);
  } catch (error: unknown) {
    console.error('Error fetching SMS campaigns:', error);
    return apiErrors.internal('Failed to fetch campaigns');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
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
    if (!ctx) return apiErrors.unauthorized();

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
        const deals: any[] = await dealService.findMany(ctx, {
          where: { id: { in: recipientIds } },
          include: {
            lead: {
              select: { phone: true, businessName: true },
            },
          },
        } as any);

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
        await (db as any).smsCampaignDeal.createMany({
          data: recipientData,
        });
      }
    }

    return NextResponse.json(campaign, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating SMS campaign:', error);
    return apiErrors.internal('Failed to create campaign');
  }
}
