import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateAutoResponse } from '@/lib/reviews/review-intelligence-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reviewId, config } = await request.json();

    if (!reviewId) {
      return NextResponse.json({ error: 'reviewId is required' }, { status: 400 });
    }

    const review = await prisma.review.findFirst({
      where: { id: reviewId, userId: session.user.id },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, legalEntityName: true },
    });

    const responseDraft = await generateAutoResponse(
      {
        reviewText: review.reviewText || '',
        rating: review.rating,
        reviewerName: review.reviewerName || undefined,
        source: review.source,
      },
      {
        tone: config?.tone || 'professional',
        brandVoice: config?.brandVoice,
        includeOwnerName: true,
        ownerName: user?.name || user?.legalEntityName || undefined,
        alwaysThank: config?.alwaysThank !== false,
        addressNegativeConcerns: config?.addressNegativeConcerns !== false,
        maxLength: config?.maxLength,
        customInstructions: config?.customInstructions,
      }
    );

    await prisma.review.update({
      where: { id: reviewId },
      data: {
        aiResponseDraft: responseDraft,
        aiResponseStatus: 'PENDING',
      },
    });

    return NextResponse.json({ draft: responseDraft });
  } catch (error: any) {
    console.error('Auto-respond error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate response' }, { status: 500 });
  }
}
