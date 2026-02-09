/**
 * Business AI Query API
 * Handles natural language queries about business metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { businessDataPipeline } from '@/lib/business-ai/data-pipeline';
import { businessAnalyticsEngine } from '@/lib/business-ai/analytics-engine';
import { businessNLUService } from '@/lib/business-ai/nlu-service';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, period = 'month' } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

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

    // Parse query intent
    const intent = await businessNLUService.parseQuery(query, businessData);

    // Generate response
    const response = businessNLUService.generateResponse(
      intent,
      businessData,
      healthScore,
      predictions,
      insights
    );

    // Prepare visualization data based on intent
    let visualizationData: any = null;
    if (intent.visualization) {
      visualizationData = prepareVisualizationData(intent, businessData, healthScore, predictions);
    }

    return NextResponse.json({
      success: true,
      query,
      intent,
      response,
      data: {
        businessData,
        healthScore,
        predictions,
        insights,
      },
      visualization: visualizationData,
    });
  } catch (error: any) {
    console.error('Business AI query error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process query' },
      { status: 500 }
    );
  }
}

/**
 * Prepare visualization data based on intent
 */
function prepareVisualizationData(
  intent: any,
  businessData: any,
  healthScore: any,
  predictions: any[]
): any {
  if (!intent.visualization) return null;

  switch (intent.visualization.type) {
    case 'score':
      return {
        type: 'score',
        value: healthScore.overall,
        breakdown: {
          revenue: healthScore.revenue,
          pipeline: healthScore.pipeline,
          customers: healthScore.customers,
          operations: healthScore.operations,
        },
        alerts: healthScore.alerts,
      };

    case 'chart':
      return prepareChartData(intent, businessData);

    case 'list':
      return {
        type: 'list',
        items: predictions.slice(0, 5),
      };

    default:
      return null;
  }
}

/**
 * Prepare chart data
 */
function prepareChartData(intent: any, businessData: any): any {
  const chartType = intent.visualization.chartType || 'line';
  const metric = intent.metric || 'revenue';

  switch (metric) {
    case 'revenue':
      return {
        type: 'chart',
        chartType,
        data: {
          labels: businessData.revenue.byPeriod.map((p: any) => p.period),
          datasets: [{
            label: 'Revenue',
            data: businessData.revenue.byPeriod.map((p: any) => p.revenue),
            borderColor: 'rgb(139, 92, 246)',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
          }],
        },
        current: businessData.revenue.thisMonth,
        growth: businessData.revenue.growthRate,
      };

    case 'leads':
      return {
        type: 'chart',
        chartType: 'bar',
        data: {
          labels: businessData.leads.byStatus.map((s: any) => s.status),
          datasets: [{
            label: 'Leads',
            data: businessData.leads.byStatus.map((s: any) => s.count),
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
          }],
        },
        total: businessData.leads.total,
        conversionRate: businessData.leads.conversionRate,
      };

    case 'deals':
      return {
        type: 'chart',
        chartType: 'bar',
        data: {
          labels: businessData.deals.byStage.map((s: any) => s.stageName),
          datasets: [{
            label: 'Deals',
            data: businessData.deals.byStage.map((s: any) => s.count),
            backgroundColor: 'rgba(34, 197, 94, 0.5)',
          }],
        },
        total: businessData.deals.total,
        winRate: businessData.deals.winRate,
      };

    case 'products':
      return {
        type: 'chart',
        chartType: 'pie',
        data: {
          labels: businessData.products.topSelling.map((p: any) => p.productName),
          datasets: [{
            data: businessData.products.topSelling.map((p: any) => p.revenue),
            backgroundColor: [
              'rgba(139, 92, 246, 0.8)',
              'rgba(59, 130, 246, 0.8)',
              'rgba(34, 197, 94, 0.8)',
              'rgba(251, 191, 36, 0.8)',
              'rgba(239, 68, 68, 0.8)',
            ],
          }],
        },
        topSelling: businessData.products.topSelling.slice(0, 5),
      };

    default:
      return null;
  }
}
