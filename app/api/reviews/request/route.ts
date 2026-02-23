import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendReviewRequest } from '@/lib/reviews/review-intelligence-service';
import { apiErrors } from '@/lib/api-error';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { leadId, method, reviewUrl, customMessage } = await request.json();

    if (!leadId || !method) {
      return apiErrors.badRequest('leadId and method are required');
    }

    const result = await sendReviewRequest(
      session.user.id,
      leadId,
      method,
      reviewUrl,
      customMessage
    );

    if (!result.success) {
      return apiErrors.badRequest(result.error!);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Review request error:', error);
    return apiErrors.internal(error.message || 'Failed to send review request');
  }
}
