import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/campaigns/[id] - Get campaign details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        _count: {
          select: {
            messages: true,
            campaignLeads: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ campaign });
  } catch (error: any) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}

// PUT /api/campaigns/[id] - Update campaign
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Can't edit running campaigns
    if (campaign.status === 'RUNNING') {
      return NextResponse.json(
        { error: 'Cannot edit a running campaign. Pause it first.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      type,
      status,
      emailSubject,
      emailBody,
      emailHtml,
      smsTemplate,
      targetAudience,
      scheduledFor,
      frequency,
      recurringDays,
    } = body;

    const updatedCampaign = await prisma.campaign.update({
      where: { id: params.id },
      data: {
        name,
        description,
        type,
        status,
        emailSubject,
        emailBody,
        emailHtml,
        smsTemplate,
        targetAudience,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : campaign.scheduledFor,
        frequency,
        recurringDays,
      },
      include: {
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    return NextResponse.json({ campaign: updatedCampaign });
  } catch (error: any) {
    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns/[id] - Delete campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Can't delete running campaigns
    if (campaign.status === 'RUNNING') {
      return NextResponse.json(
        { error: 'Cannot delete a running campaign. Pause it first.' },
        { status: 400 }
      );
    }

    await prisma.campaign.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}
