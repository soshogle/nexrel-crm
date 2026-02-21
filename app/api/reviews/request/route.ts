import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendReviewRequest } from '@/lib/reviews/review-intelligence-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leadId, method, reviewUrl, customMessage } = await request.json();

    if (!leadId || !method) {
      return NextResponse.json({ error: 'leadId and method are required' }, { status: 400 });
    }

    const result = await sendReviewRequest(
      session.user.id,
      leadId,
      method,
      reviewUrl,
      customMessage
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Review request error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send review request' }, { status: 500 });
  }
}
