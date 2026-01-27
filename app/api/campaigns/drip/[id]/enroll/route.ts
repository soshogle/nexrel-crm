import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// POST /api/campaigns/drip/[id]/enroll - Enroll leads in campaign

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { leadIds } = body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: 'Lead IDs are required' },
        { status: 400 }
      );
    }

    // Verify campaign ownership and status
    const campaign = await prisma.emailDripCampaign.findFirst({
      where: { id, userId: session.user.id },
      include: {
        sequences: {
          orderBy: { sequenceOrder: 'asc' },
          take: 1,
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Campaign must be active to enroll leads' },
        { status: 400 }
      );
    }

    if (campaign.sequences.length === 0) {
      return NextResponse.json(
        { error: 'Campaign has no sequences' },
        { status: 400 }
      );
    }

    // Verify leads belong to user and have email
    const leads = await prisma.lead.findMany({
      where: {
        id: { in: leadIds },
        userId: session.user.id,
        email: { not: null },
      },
    });

    if (leads.length === 0) {
      return NextResponse.json(
        { error: 'No valid leads found with email addresses' },
        { status: 400 }
      );
    }

    // Check for already enrolled leads
    const existingEnrollments = await prisma.emailDripEnrollment.findMany({
      where: {
        campaignId: id,
        leadId: { in: leads.map(l => l.id) },
        status: { in: ['ACTIVE', 'PAUSED'] },
      },
    });

    const enrolledLeadIds = new Set(existingEnrollments.map(e => e.leadId));
    const leadsToEnroll = leads.filter(l => !enrolledLeadIds.has(l.id));

    if (leadsToEnroll.length === 0) {
      return NextResponse.json(
        { error: 'All leads are already enrolled in this campaign' },
        { status: 400 }
      );
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
    await prisma.emailDripEnrollment.createMany({
      data: enrollments,
    });

    // Update campaign stats
    await prisma.emailDripCampaign.update({
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
    return NextResponse.json(
      { error: 'Failed to enroll leads' },
      { status: 500 }
    );
  }
}
