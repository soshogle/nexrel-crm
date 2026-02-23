import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const review = await (prisma as any).review.findFirst({
      where: { id: params.id, userId: session.user.id },
      include: {
        lead: { select: { id: true, name: true, businessName: true, contactPerson: true, email: true, phone: true } },
        campaign: { select: { id: true, name: true } },
      },
    });

    if (!review) {
      return apiErrors.notFound('Review not found');
    }

    return NextResponse.json({ review });
  } catch (error) {
    console.error('Error fetching review:', error);
    return apiErrors.internal('Failed to fetch review');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const review = await (prisma as any).review.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!review) {
      return apiErrors.notFound('Review not found');
    }

    const body = await request.json();
    const allowedFields = [
      'ownerResponse', 'ownerScore', 'ownerNotes', 'isFlagged',
      'aiResponseStatus', 'isPublic',
    ];

    const data: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) data[field] = body[field];
    }

    // If approving an AI response, copy draft to ownerResponse
    if (body.aiResponseStatus === 'APPROVED' && review.aiResponseDraft) {
      data.ownerResponse = body.ownerResponse || review.aiResponseDraft;
      data.respondedAt = new Date();
    }

    // If publishing, mark responded
    if (body.aiResponseStatus === 'PUBLISHED') {
      data.respondedAt = data.respondedAt || new Date();
    }

    const updated = await (prisma as any).review.update({
      where: { id: params.id },
      data,
      include: {
        lead: { select: { id: true, name: true, businessName: true, contactPerson: true } },
        campaign: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ review: updated });
  } catch (error) {
    console.error('Error updating review:', error);
    return apiErrors.internal('Failed to update review');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const review = await (prisma as any).review.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!review) {
      return apiErrors.notFound('Review not found');
    }

    await (prisma as any).review.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting review:', error);
    return apiErrors.internal('Failed to delete review');
  }
}
