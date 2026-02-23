import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sequenceId: string }> }
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

    const { id, sequenceId } = await params;
    const body = await request.json();
    const { variantA, variantB, splitPercentage } = body;

    // Verify campaign exists and belongs to user
    const campaign = await prisma.emailDripCampaign.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!campaign) {
      return apiErrors.notFound('Campaign not found');
    }

    // Get the original sequence
    const originalSequence = await prisma.emailDripSequence.findUnique({
      where: { id: sequenceId },
    });

    if (!originalSequence || originalSequence.campaignId !== id) {
      return apiErrors.notFound('Sequence not found');
    }

    // Update original sequence to be variant A
    await prisma.emailDripSequence.update({
      where: { id: sequenceId },
      data: {
        ...variantA,
        isAbTestVariant: true,
        abTestGroup: 'A',
      },
    });

    // Check if variant B already exists
    const existingVariantB = await prisma.emailDripSequence.findFirst({
      where: {
        campaignId: id,
        variantOf: sequenceId,
        abTestGroup: 'B',
      },
    });

    if (existingVariantB) {
      // Update existing variant B
      await prisma.emailDripSequence.update({
        where: { id: existingVariantB.id },
        data: variantB,
      });
    } else {
      // Create new variant B
      await prisma.emailDripSequence.create({
        data: {
          campaignId: id,
          sequenceOrder: originalSequence.sequenceOrder,
          name: `${originalSequence.name} (Variant B)`,
          ...variantB,
          delayDays: originalSequence.delayDays,
          delayHours: originalSequence.delayHours,
          sendTime: originalSequence.sendTime,
          isAbTestVariant: true,
          abTestGroup: 'B',
          variantOf: sequenceId,
        },
      });
    }

    // Update campaign A/B test config
    await prisma.emailDripCampaign.update({
      where: { id },
      data: {
        abTestConfig: {
          splitPercentage,
          sequenceId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating A/B test variant:', error);
    return apiErrors.internal('Failed to create A/B test variant');
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sequenceId: string }> }
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

    const { id, sequenceId } = await params;

    // Verify campaign exists and belongs to user
    const campaign = await prisma.emailDripCampaign.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!campaign) {
      return apiErrors.notFound('Campaign not found');
    }

    // Get variant A (original)
    const variantA = await prisma.emailDripSequence.findUnique({
      where: { id: sequenceId },
    });

    if (!variantA) {
      return apiErrors.notFound('Sequence not found');
    }

    // Get variant B
    const variantB = await prisma.emailDripSequence.findFirst({
      where: {
        campaignId: id,
        variantOf: sequenceId,
        abTestGroup: 'B',
      },
    });

    return NextResponse.json({
      variantA,
      variantB,
      abTestConfig: campaign.abTestConfig,
    });
  } catch (error) {
    console.error('Error fetching A/B test variants:', error);
    return apiErrors.internal('Failed to fetch A/B test variants');
  }
}
