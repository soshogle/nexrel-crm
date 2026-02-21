import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateBrandInsights } from '@/lib/reviews/review-intelligence-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const report = await generateBrandInsights(session.user.id);
    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Review analytics error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate analytics' }, { status: 500 });
  }
}
