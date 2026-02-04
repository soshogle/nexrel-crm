import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { reviewFeedbackService, FeedbackResponse } from '@/lib/review-feedback-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/feedback/process
 * Process feedback response from SMS or voice call
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { feedbackId, sentiment, rating, feedbackText } = body;

    if (!feedbackId || !sentiment) {
      return NextResponse.json(
        { error: 'feedbackId and sentiment are required' },
        { status: 400 }
      );
    }

    const feedbackResponse: FeedbackResponse = {
      sentiment: sentiment as 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL',
      rating: rating ? parseInt(rating) : undefined,
      feedbackText,
    };

    await reviewFeedbackService.processFeedbackResponse(feedbackId, feedbackResponse);

    return NextResponse.json({
      success: true,
      message: 'Feedback processed successfully',
    });
  } catch (error: any) {
    console.error('Error processing feedback:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process feedback' },
      { status: 500 }
    );
  }
}
