import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(
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

    const sequence = await prisma.smsSequence.update({
      where: { id: sequenceId },
      data: body,
    });

    return NextResponse.json({ sequence });
  } catch (error) {
    console.error('Error updating sequence:', error);
    return apiErrors.internal('Failed to update sequence');
  }
}

export async function DELETE(
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
    const campaign = await prisma.smsCampaign.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!campaign) {
      return apiErrors.notFound('Campaign not found');
    }

    await prisma.smsSequence.delete({
      where: { id: sequenceId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sequence:', error);
    return apiErrors.internal('Failed to delete sequence');
  }
}
