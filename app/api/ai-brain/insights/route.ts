import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { aiBrainService } from '@/lib/ai-brain-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ai-brain/insights
 * Get general AI insights across all business data
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const insights = await aiBrainService.generateGeneralInsights(session.user.id);

    return NextResponse.json({
      success: true,
      insights,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error generating AI insights:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate insights' },
      { status: 500 }
    );
  }
}
