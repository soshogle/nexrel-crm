import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return apiErrors.unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return apiErrors.notFound('User not found');
    }

    const { id } = await params;
    const body = await request.json();
    const { leadIds } = body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return apiErrors.badRequest('leadIds must be a non-empty array');
    }

    // Verify campaign exists and belongs to user
    const campaign = await prisma.smsCampaign.findFirst({
      where: {
        id,
        userId: user.id,
      },
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

    if (!campaign.sequences || campaign.sequences.length === 0) {
      return apiErrors.badRequest('Campaign has no sequences configured');
    }

    const firstSequence = campaign.sequences[0];
    let enrolled = 0;
    let skipped = 0;

    for (const leadId of leadIds) {
      // Check if already enrolled
      const existing = await prisma.smsEnrollment.findUnique({
        where: {
          campaignId_leadId: {
            campaignId: id,
            leadId,
          },
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Calculate next send time
      const nextSendAt = new Date();
      if (firstSequence.delayDays > 0) {
        nextSendAt.setDate(nextSendAt.getDate() + firstSequence.delayDays);
      }
      if (firstSequence.delayHours > 0) {
        nextSendAt.setHours(nextSendAt.getHours() + firstSequence.delayHours);
      }

      await prisma.smsEnrollment.create({
        data: {
          campaignId: id,
          leadId,
          status: 'ACTIVE',
          currentSequenceId: firstSequence.id,
          currentStep: 1,
          nextSendAt,
        },
      });

      enrolled++;
    }

    // Update campaign stats
    await prisma.smsCampaign.update({
      where: { id },
      data: {
        totalEnrolled: { increment: enrolled },
      },
    });

    return NextResponse.json({ enrolled, skipped });
  } catch (error) {
    console.error('Error enrolling leads:', error);
    return apiErrors.internal('Failed to enroll leads');
  }
}
