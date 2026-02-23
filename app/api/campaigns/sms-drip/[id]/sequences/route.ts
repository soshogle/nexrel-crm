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
    const {
      sequenceOrder,
      name,
      message,
      delayDays,
      delayHours,
      sendTime,
      skipIfReplied,
      sendConditions,
    } = body;

    // Verify campaign exists and belongs to user
    const campaign = await prisma.smsCampaign.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!campaign) {
      return apiErrors.notFound('Campaign not found');
    }

    const sequence = await prisma.smsSequence.create({
      data: {
        campaignId: id,
        sequenceOrder,
        name,
        message,
        delayDays: delayDays || 0,
        delayHours: delayHours || 0,
        sendTime,
        skipIfReplied: skipIfReplied || false,
        sendConditions: sendConditions ?? undefined,
      },
    });

    return NextResponse.json({ sequence });
  } catch (error) {
    console.error('Error creating sequence:', error);
    return apiErrors.internal('Failed to create sequence');
  }
}
