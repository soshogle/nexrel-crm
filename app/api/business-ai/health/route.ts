/**
 * Business Health Score API
 * Returns current business health score and metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { businessDataPipeline } from '@/lib/business-ai/data-pipeline';
import { businessAnalyticsEngine } from '@/lib/business-ai/analytics-engine';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';

    // Get user's industry
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { industry: true },
    });

    // Get business data snapshot
    const businessData = await businessDataPipeline.getBusinessSnapshot(
      session.user.id,
      user?.industry || undefined,
      period as any
    );

    // Calculate health score
    const healthScore = businessAnalyticsEngine.calculateHealthScore(businessData);

    // Generate predictions
    const predictions = businessAnalyticsEngine.generatePredictions(businessData);

    // Generate insights
    const insights = businessAnalyticsEngine.generateInsights(businessData);

    return NextResponse.json({
      success: true,
      healthScore,
      predictions,
      insights,
      snapshot: {
        revenue: businessData.revenue.thisMonth,
        leads: businessData.leads.total,
        deals: businessData.deals.open,
        customers: businessData.customers.total,
        timestamp: businessData.snapshotAt,
      },
    });
  } catch (error: any) {
    console.error('Business health API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get business health' },
      { status: 500 }
    );
  }
}
