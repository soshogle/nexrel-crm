
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaign = await prisma.smsCampaign.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        recipients: {
          where: { status: 'PENDING' },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Update campaign status
    await prisma.smsCampaign.update({
      where: { id: params.id },
      data: {
        status: 'SENDING',
        sentAt: new Date(),
      },
    });

    // In a real implementation, this would integrate with Twilio
    // to actually send SMS messages
    // For now, we'll simulate sending by updating recipient statuses

    for (const recipient of campaign.recipients) {
      await prisma.smsCampaignDeal.update({
        where: { id: recipient.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      });
    }

    // Update campaign status
    const sentCount = campaign.recipients.length;
    await prisma.smsCampaign.update({
      where: { id: params.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      sentCount,
      message: 'Campaign sent successfully',
    });
  } catch (error: unknown) {
    console.error('Error sending campaign:', error);
    return NextResponse.json(
      { error: 'Failed to send campaign' },
      { status: 500 }
    );
  }
}
