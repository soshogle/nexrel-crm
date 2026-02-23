import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { aiBrainService } from '@/lib/ai-brain-service';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/ai-brain/predictions
 * Get predictive analytics for business performance
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const predictions = await aiBrainService.generatePredictiveAnalytics(session.user.id);

    return NextResponse.json({
      success: true,
      predictions,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error generating predictions:', error);
    return apiErrors.internal(error.message || 'Failed to generate predictions');
  }
}
