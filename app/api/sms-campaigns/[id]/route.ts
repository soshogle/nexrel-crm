import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getCrmDb, leadService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';

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
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const db = getCrmDb(ctx);
    const campaign = await db.smsCampaign.findFirst({
      where: {
        id: params.id,
        userId: ctx.userId,
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
      return apiErrors.notFound('Campaign not found');
    }

    return NextResponse.json({ campaign });
  } catch (error: any) {
    console.error('Error fetching SMS campaign:', error);
    return apiErrors.internal(error.message || 'Failed to fetch SMS campaign');
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
      return apiErrors.unauthorized();
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

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const db = getCrmDb(ctx);
    // Check if campaign exists and belongs to user
    const existingCampaign = await db.smsCampaign.findFirst({
      where: {
        id: params.id,
        userId: ctx.userId,
      },
    });

    if (!existingCampaign) {
      return apiErrors.notFound('Campaign not found');
    }

    // Don't allow editing campaigns that have already been sent
    if (existingCampaign.status === 'SENT' || existingCampaign.status === 'SENDING') {
      return apiErrors.badRequest('Cannot edit a campaign that is sending or has been sent');
    }

    // Update the campaign
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (message !== undefined) {
      if (message.length > 160) {
        return apiErrors.badRequest('Message must be 160 characters or less');
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
      const targetLeads = await leadService.findMany(ctx, {
        where: {
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

    const campaign = await db.smsCampaign.update({
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
    return apiErrors.internal(error.message || 'Failed to update SMS campaign');
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
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const db = getCrmDb(ctx);
    // Check if campaign exists and belongs to user
    const existingCampaign = await db.smsCampaign.findFirst({
      where: {
        id: params.id,
        userId: ctx.userId,
      },
    });

    if (!existingCampaign) {
      return apiErrors.notFound('Campaign not found');
    }

    // Don't allow deleting campaigns that are currently sending
    if (existingCampaign.status === 'SENDING') {
      return apiErrors.badRequest('Cannot delete a campaign that is currently sending');
    }

    // Delete the campaign (this will cascade delete recipients)
    await db.smsCampaign.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Campaign deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting SMS campaign:', error);
    return apiErrors.internal(error.message || 'Failed to delete SMS campaign');
  }
}
