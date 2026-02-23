import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { campaignService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/campaigns/[id] - Get campaign details
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

    const campaign = await campaignService.findUnique(ctx, params.id, {
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
    });

    if (!campaign) {
      return apiErrors.notFound('Campaign not found');
    }

    return NextResponse.json({ campaign });
  } catch (error: any) {
    console.error('Error fetching campaign:', error);
    return apiErrors.internal(error.message || 'Failed to fetch campaign');
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
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const campaign = await campaignService.findUnique(ctx, params.id);

    if (!campaign) {
      return apiErrors.notFound('Campaign not found');
    }

    // Can't edit running campaigns
    if (campaign.status === 'RUNNING') {
      return apiErrors.badRequest('Cannot edit a running campaign. Pause it first.');
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

    const updatedCampaign = await campaignService.update(ctx, params.id, {
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
    }, {
      _count: {
        select: {
          messages: true,
        },
      },
    });

    return NextResponse.json({ campaign: updatedCampaign });
  } catch (error: any) {
    console.error('Error updating campaign:', error);
    return apiErrors.internal(error.message || 'Failed to update campaign');
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
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const campaign = await campaignService.findUnique(ctx, params.id);

    if (!campaign) {
      return apiErrors.notFound('Campaign not found');
    }

    // Can't delete running campaigns
    if (campaign.status === 'RUNNING') {
      return apiErrors.badRequest('Cannot delete a running campaign. Pause it first.');
    }

    await campaignService.delete(ctx, params.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting campaign:', error);
    return apiErrors.internal(error.message || 'Failed to delete campaign');
  }
}
