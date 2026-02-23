import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCrmDb, leadService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// POST /api/campaigns/drip/[id]/enroll - Enroll leads in campaign

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const { id } = await context.params;
    const body = await req.json();
    const { leadIds } = body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return apiErrors.badRequest('Lead IDs are required');
    }

    const db = getCrmDb(ctx);
    // Verify campaign ownership and status
    const campaign = await db.emailDripCampaign.findFirst({
      where: { id, userId: ctx.userId },
      include: {
        sequences: {
          orderBy: { sequenceOrder: 'asc' },
          take: 1,
        },
      },
    });

    if (!campaign) {
      return apiErrors.notFound('Campaign not found');
    }

    if (campaign.status !== 'ACTIVE') {
      return apiErrors.badRequest('Campaign must be active to enroll leads');
    }

    if (campaign.sequences.length === 0) {
      return apiErrors.badRequest('Campaign has no sequences');
    }

    // Verify leads belong to user and have email
    const leads = await leadService.findMany(ctx, {
      where: {
        id: { in: leadIds },
        email: { not: null },
      },
    });

    if (leads.length === 0) {
      return apiErrors.badRequest('No valid leads found with email addresses');
    }

    // Check for already enrolled leads
    const existingEnrollments = await db.emailDripEnrollment.findMany({
      where: {
        campaignId: id,
        leadId: { in: leads.map(l => l.id) },
        status: { in: ['ACTIVE', 'PAUSED'] },
      },
    });

    const enrolledLeadIds = new Set(existingEnrollments.map(e => e.leadId));
    const leadsToEnroll = leads.filter(l => !enrolledLeadIds.has(l.id));

    if (leadsToEnroll.length === 0) {
      return apiErrors.badRequest('All leads are already enrolled in this campaign');
    }

    // Assign A/B test groups if enabled
    const enrollments: any[] = [];
    for (let i = 0; i < leadsToEnroll.length; i++) {
      const lead = leadsToEnroll[i];
      const abTestGroup = campaign.enableAbTesting 
        ? (i % 2 === 0 ? 'A' : 'B') 
        : null;

      // Calculate next send time based on first sequence delay
      const firstSequence = campaign.sequences[0];
      const nextSendAt = new Date();
      nextSendAt.setDate(nextSendAt.getDate() + (firstSequence?.delayDays || 0));
      nextSendAt.setHours(nextSendAt.getHours() + (firstSequence?.delayHours || 0));

      enrollments.push({
        campaignId: id,
        leadId: lead.id,
        status: 'ACTIVE' as const,
        currentSequenceId: firstSequence?.id,
        currentStep: 1,
        nextSendAt,
        abTestGroup,
      });
    }

    // Create enrollments
    await db.emailDripEnrollment.createMany({
      data: enrollments,
    });

    // Update campaign stats
    await db.emailDripCampaign.update({
      where: { id },
      data: {
        totalEnrolled: { increment: enrollments.length },
      },
    });

    return NextResponse.json({
      success: true,
      enrolled: enrollments.length,
      skipped: leads.length - enrollments.length,
      message: `Successfully enrolled ${enrollments.length} lead(s)`,
    });
  } catch (error: unknown) {
    console.error('Error enrolling leads:', error);
    return apiErrors.internal('Failed to enroll leads');
  }
}
