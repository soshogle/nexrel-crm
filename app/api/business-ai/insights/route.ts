/**
 * Business AI Insights API
 * Returns AI-generated insights. Uses mock data when CRM has no data.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { leadService, getCrmDb } from '@/lib/dal';
import { createDalContext } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = createDalContext(session.user.id);
    const db = getCrmDb(ctx);
    const [leadCount, dealCount] = await Promise.all([
      leadService.count(ctx),
      db.deal.count({ where: { userId: session.user.id } }),
    ]);

    const isOrthoDemo = String(session.user.email || '').toLowerCase().trim() === 'orthodontist@nexrel.com';
    // Preserve demo behavior only for orthodontist demo account
    if (isOrthoDemo && leadCount === 0 && dealCount === 0) {
      const { MOCK_INSIGHTS } = await import('@/lib/mock-data');
      return NextResponse.json({
        success: true,
        insights: MOCK_INSIGHTS,
        generatedAt: new Date().toISOString(),
      });
    }

    if (leadCount === 0 && dealCount === 0) {
      return NextResponse.json({
        success: true,
        insights: [],
        generatedAt: new Date().toISOString(),
      });
    }

    // Use ai-brain insights when we have data
    const { aiBrainService } = await import('@/lib/ai-brain-service');
    const insights = await aiBrainService.generateGeneralInsights(session.user.id);

    return NextResponse.json({
      success: true,
      insights: Array.isArray(insights) ? insights : [],
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Business AI insights error:', error);
    return apiErrors.internal(error.message || 'Failed to generate insights');
  }
}
