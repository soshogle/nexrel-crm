import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { aiBrainService } from '@/lib/ai-brain-service';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/ai-brain/insights
 * Get general AI insights across all business data
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const insights = await aiBrainService.generateGeneralInsights(session.user.id);

    return NextResponse.json({
      success: true,
      insights,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error generating AI insights:', error);
    return apiErrors.internal(error.message || 'Failed to generate insights');
  }
}
