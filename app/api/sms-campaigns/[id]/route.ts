import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/sms-campaigns/[id] - Get a specific SMS campaign
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaign = await prisma.smsCampaign.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        recipients: {
          include: {
            lead: {
              select: {
                id: true,
                businessName: true,
                contactPerson: true,
                email: true,
                phone: true,
                leadScore: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error: any) {
    console.error('Error fetching SMS campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch SMS campaign' },
      { status: 500 }
    );
  }
}

// PUT /api/sms-campaigns/[id] - Update an SMS campaign
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      message,
      minLeadScore,
      dailyLimit,
      weeklyLimit,
      scheduledFor,
      status,
      targetLeadIds,
    } = body;

    // Check if campaign exists and belongs to user
    const existingCampaign = await prisma.smsCampaign.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Don't allow editing campaigns that have already been sent
    if (existingCampaign.status === 'SENT' || existingCampaign.status === 'SENDING') {
      return NextResponse.json(
        { error: 'Cannot edit a campaign that is sending or has been sent' },
        { status: 400 }
      );
    }

    // Update the campaign
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (message !== undefined) {
      if (message.length > 160) {
        return NextResponse.json(
          { error: 'Message must be 160 characters or less' },
          { status: 400 }
        );
      }
      updateData.message = message;
    }
    if (minLeadScore !== undefined) updateData.minLeadScore = minLeadScore;
    if (dailyLimit !== undefined) updateData.dailyLimit = dailyLimit || null;
    if (weeklyLimit !== undefined) updateData.weeklyLimit = weeklyLimit || null;
    if (scheduledFor !== undefined) {
      updateData.scheduledFor = scheduledFor ? new Date(scheduledFor) : null;
    }
    if (status !== undefined) updateData.status = status;
    if (targetLeadIds !== undefined) updateData.targetLeadIds = targetLeadIds;

    // If minLeadScore or targetLeadIds changed, recalculate totalRecipients
    if (minLeadScore !== undefined || targetLeadIds !== undefined) {
      const targetLeads = await prisma.lead.findMany({
        where: {
          userId: session.user.id,
          leadScore: (minLeadScore || existingCampaign.minLeadScore) ? {
            gte: minLeadScore || existingCampaign.minLeadScore || 75,
          } : undefined,
          id: (targetLeadIds || existingCampaign.targetLeadIds)
            ? { in: targetLeadIds || (existingCampaign.targetLeadIds as any) }
            : undefined,
          phone: { not: null },
        },
        select: { id: true },
      });
      updateData.totalRecipients = targetLeads.length;
    }

    const campaign = await prisma.smsCampaign.update({
      where: { id: params.id },
      data: updateData,
      include: {
        _count: {
          select: {
            recipients: true,
          },
        },
      },
    });

    return NextResponse.json({ campaign });
  } catch (error: any) {
    console.error('Error updating SMS campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update SMS campaign' },
      { status: 500 }
    );
  }
}

// DELETE /api/sms-campaigns/[id] - Delete an SMS campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if campaign exists and belongs to user
    const existingCampaign = await prisma.smsCampaign.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Don't allow deleting campaigns that are currently sending
    if (existingCampaign.status === 'SENDING') {
      return NextResponse.json(
        { error: 'Cannot delete a campaign that is currently sending' },
        { status: 400 }
      );
    }

    // Delete the campaign (this will cascade delete recipients)
    await prisma.smsCampaign.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Campaign deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting SMS campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete SMS campaign' },
      { status: 500 }
    );
  }
}
