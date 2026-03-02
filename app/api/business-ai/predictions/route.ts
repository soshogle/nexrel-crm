/**
 * Business AI Predictions API
 * Returns predictive analytics. Uses mock data when CRM has no data.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { leadService, getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    const db = getCrmDb(ctx);
    const [leadCount, dealCount] = await Promise.all([
      leadService.count(ctx),
      db.deal.count({ where: { userId: session.user.id } }),
    ]);

    const isOrthoDemo = String(session.user.email || '').toLowerCase().trim() === 'orthodontist@nexrel.com';
    // Preserve demo behavior only for orthodontist demo account
    if (isOrthoDemo && leadCount === 0 && dealCount === 0) {
      const { MOCK_PREDICTIONS } = await import('@/lib/mock-data');
      return NextResponse.json(MOCK_PREDICTIONS);
    }

    if (leadCount === 0 && dealCount === 0) {
      return NextResponse.json({
        nextWeekForecast: {
          newLeads: { predicted: 0, confidence: 0 },
          dealConversions: { predicted: 0, confidence: 0 },
          revenue: { predicted: 0, confidence: 0, currency: 'USD' },
        },
        nextMonthForecast: {
          newLeads: { predicted: 0, confidence: 0 },
          dealConversions: { predicted: 0, confidence: 0 },
          revenue: { predicted: 0, confidence: 0, currency: 'USD' },
        },
        growthTrend: 'neutral',
        seasonalPatterns: [],
      });
    }

    // Generate predictions based on CRM data
    return NextResponse.json({
      nextWeekForecast: {
        newLeads: { predicted: Math.max(1, Math.floor(leadCount * 0.2)), confidence: 70 },
        dealConversions: { predicted: Math.max(1, Math.floor(dealCount * 0.15)), confidence: 65 },
        revenue: { predicted: 15000, confidence: 68, currency: 'USD' },
      },
      nextMonthForecast: {
        newLeads: { predicted: Math.max(3, Math.floor(leadCount * 0.5)), confidence: 68 },
        dealConversions: { predicted: Math.max(2, Math.floor(dealCount * 0.25)), confidence: 62 },
        revenue: { predicted: 25000, confidence: 65, currency: 'USD' },
      },
      growthTrend: 'steady',
      seasonalPatterns: [],
    });
  } catch (error: any) {
    console.error('Business AI predictions error:', error);
    return apiErrors.internal(error.message || 'Failed to generate predictions');
  }
}
