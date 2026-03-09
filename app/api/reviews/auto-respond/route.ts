import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { getCrmDb } from '@/lib/dal';
import { generateAutoResponse } from '@/lib/reviews/review-intelligence-service';
import { apiErrors } from '@/lib/api-error';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const { reviewId, config } = await request.json();

    if (!reviewId) {
      return apiErrors.badRequest('reviewId is required');
    }

    const review = await getCrmDb(ctx).review.findFirst({
      where: { id: reviewId, userId: session.user.id },
    });

    if (!review) {
      return apiErrors.notFound('Review not found');
    }

    const user = await getCrmDb(ctx).user.findUnique({
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

    await getCrmDb(ctx).review.update({
      where: { id: reviewId },
      data: {
        aiResponseDraft: responseDraft,
        aiResponseStatus: 'PENDING',
      },
    });

    return NextResponse.json({ draft: responseDraft });
  } catch (error: any) {
    console.error('Auto-respond error:', error);
    return apiErrors.internal(error.message || 'Failed to generate response');
  }
}
