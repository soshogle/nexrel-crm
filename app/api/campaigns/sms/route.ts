
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';


export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaigns = await prisma.smsCampaign.findMany({
      where: { userId: session.user.id },
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

    // Create campaign
    const campaign = await prisma.smsCampaign.create({
      data: {
        userId: session.user.id,
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
        const leads = await prisma.lead.findMany({
          where: {
            id: { in: recipientIds },
            userId: session.user.id,
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
        const deals = await prisma.deal.findMany({
          where: {
            id: { in: recipientIds },
            userId: session.user.id,
          },
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
        await prisma.smsCampaignDeal.createMany({
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
