
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaigns = await prisma.emailCampaign.findMany({
      where: { userId: session.user.id },
      include: {
        recipients: {
          select: {
            id: true,
            status: true,
            openedAt: true,
            clickedAt: true,
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
    console.error('Error fetching email campaigns:', error);
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
      subject,
      previewText,
      htmlContent,
      textContent,
      fromName,
      fromEmail,
      replyTo,
      scheduledFor,
      recipientIds,
      recipientType, // 'leads' or 'deals'
    } = body;

    // Create campaign
    const campaign = await prisma.emailCampaign.create({
      data: {
        userId: session.user.id,
        name,
        subject,
        previewText,
        htmlContent,
        textContent,
        fromName,
        fromEmail,
        replyTo,
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
            email: { not: null },
          },
          select: { id: true, email: true, businessName: true },
        });

        for (const lead of leads) {
          if (lead.email) {
            recipientData.push({
              campaignId: campaign.id,
              leadId: lead.id,
              recipientEmail: lead.email,
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
              select: { email: true, businessName: true },
            },
          },
        });

        for (const deal of deals) {
          if (deal.lead?.email) {
            recipientData.push({
              campaignId: campaign.id,
              dealId: deal.id,
              leadId: deal.leadId,
              recipientEmail: deal.lead.email,
              recipientName: deal.lead.businessName,
            });
          }
        }
      }

      if (recipientData.length > 0) {
        await prisma.emailCampaignDeal.createMany({
          data: recipientData,
        });
      }
    }

    return NextResponse.json(campaign, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating email campaign:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
