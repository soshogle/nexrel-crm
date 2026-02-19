/**
 * Business Health Score API
 * Returns current business health score and metrics
 * Uses CRM data (leads, deals, campaigns) with fallback when full pipeline fails
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { businessDataPipeline } from '@/lib/business-ai/data-pipeline';
import { businessAnalyticsEngine } from '@/lib/business-ai/analytics-engine';
import { addExplanations } from '@/lib/business-ai/prediction-explainer';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';

    let healthScore: any;
    let predictions: any[] = [];
    let insights: any[] = [];

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { industry: true },
      });

      const businessData = await businessDataPipeline.getBusinessSnapshot(
        userId,
        user?.industry || undefined,
        period as any
      );

      healthScore = businessAnalyticsEngine.calculateHealthScore(businessData);
      predictions = businessAnalyticsEngine.generatePredictions(businessData);
      predictions = await addExplanations(predictions as any, businessData);
      insights = businessAnalyticsEngine.generateInsights(businessData);

      // If pipeline returned zeros but we have CRM data (leads/deals), use fallback for meaningful scores
      const hasCrmData = businessData.leads.total > 0 || businessData.deals.total > 0;
      if (healthScore.overall === 0 && hasCrmData) {
        const fallback = await getCrmFallbackHealth(userId);
        healthScore = fallback.healthScore;
        predictions = fallback.predictions;
        insights = fallback.insights;
      }
    } catch (pipelineError: any) {
      console.warn('Business pipeline failed, using CRM fallback:', pipelineError?.message);
      const fallback = await getCrmFallbackHealth(userId);
      healthScore = fallback.healthScore;
      predictions = fallback.predictions;
      insights = fallback.insights;
    }

    return NextResponse.json({
      success: true,
      healthScore,
      predictions,
      insights,
    });
  } catch (error: any) {
    console.error('Business health API error:', error);
    return NextResponse.json({
      success: true,
      healthScore: {
        overall: 0,
        revenue: 0,
        pipeline: 0,
        customers: 0,
        operations: 0,
        alerts: [],
      },
      predictions: [],
      insights: [],
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

async function getCrmFallbackHealth(userId: string) {
  const [leads, deals, campaigns] = await Promise.all([
    prisma.lead.count({ where: { userId } }),
    prisma.deal.findMany({ where: { userId }, select: { value: true, actualCloseDate: true, lostReason: true } }),
    prisma.campaign.count({ where: { userId } }),
  ]);

  const openDeals = deals.filter(d => !d.actualCloseDate);
  const wonDeals = deals.filter(d => d.actualCloseDate && !d.lostReason);
  const totalRevenue = wonDeals.reduce((s, d) => s + (d.value || 0), 0);
  const pipelineValue = openDeals.reduce((s, d) => s + (d.value || 0), 0);
  const winRate = deals.filter(d => d.actualCloseDate).length > 0
    ? (wonDeals.length / deals.filter(d => d.actualCloseDate).length) * 100
    : 0;

  const revenueScore = totalRevenue > 0 ? Math.min(25, 12 + Math.floor(Math.log10(totalRevenue + 1) * 4)) : 12;
  const pipelineScore = pipelineValue > 0 || openDeals.length > 0 ? Math.min(25, 12 + Math.min(openDeals.length, 5) * 2) : 12;
  const customerScore = leads > 0 ? Math.min(25, 12 + Math.min(leads, 10)) : 12;
  const opsScore = campaigns > 0 ? 15 : 12;
  const overall = Math.min(100, Math.max(0, revenueScore + pipelineScore + customerScore + opsScore));

  const alerts: any[] = [];
  if (leads === 0) alerts.push({ type: 'info', message: 'Add leads to get started', metric: 'leads', value: 0 });
  if (openDeals.length > 0 && winRate < 30) alerts.push({ type: 'warning', message: `Win rate is ${winRate.toFixed(0)}%`, metric: 'winRate', value: winRate });

  const healthScore = {
    overall,
    revenue: Math.round(revenueScore * 4),
    pipeline: Math.round(pipelineScore * 4),
    customers: Math.round(customerScore * 4),
    operations: Math.round(opsScore * 4),
    alerts,
  };

  const predictions = [
    { metric: 'revenue', currentValue: totalRevenue, predictedValue: totalRevenue * 1.1, confidence: 70, timeframe: 'next month', factors: ['Based on current pipeline'] },
    { metric: 'leadConversions', currentValue: leads, predictedValue: Math.max(0, Math.floor(leads * 0.2)), confidence: 65, timeframe: 'next 30 days', factors: ['Based on lead count'] },
    { metric: 'dealValue', currentValue: pipelineValue, predictedValue: Math.floor(pipelineValue * (winRate / 100)), confidence: 70, timeframe: 'next month', factors: [`Win rate: ${winRate.toFixed(0)}%`] },
  ];

  const insights: any[] = [];
  if (leads > 0) insights.push({ type: 'opportunity', title: 'Active leads', description: `You have ${leads} leads in your pipeline. Focus on follow-up to convert more.`, impact: 'medium', actionItems: ['Schedule follow-up calls', 'Send nurture emails'] });
  if (openDeals.length > 0) insights.push({ type: 'trend', title: 'Pipeline value', description: `$${pipelineValue.toLocaleString()} in open deals. ${winRate.toFixed(0)}% historical win rate.`, impact: 'high' });
  if (leads === 0 && deals.length === 0) insights.push({ type: 'recommendation', title: 'Get started', description: 'Add your first leads and deals to see predictions and insights.', impact: 'high', actionItems: ['Import contacts', 'Create a deal'] });

  return { healthScore, predictions, insights };
}
