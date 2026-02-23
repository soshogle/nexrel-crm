import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateBrandInsights } from '@/lib/reviews/review-intelligence-service';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const report = await generateBrandInsights(session.user.id);
    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Review analytics error:', error);
    return apiErrors.internal(error.message || 'Failed to generate analytics');
  }
}
