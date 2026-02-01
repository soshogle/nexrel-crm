import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/conversations/analytics
 * Get conversation analytics and insights
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const timeRange = searchParams.get('range') || '7d';

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '24h':
        startDate.setHours(now.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    // Fetch calls in range
    const calls = await prisma.callLog.findMany({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        lead: true,
      },
    });

    // Calculate analytics
    const totalCalls = calls.length;
    const completedCalls = calls.filter(c => c.status === 'COMPLETED').length;
    const avgDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0) / (totalCalls || 1);

    // Sentiment distribution
    const sentimentCounts = calls.reduce((acc, call) => {
      const sentiment = call.sentiment || 'neutral';
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Outcome distribution
    const outcomeCounts = calls.reduce((acc, call) => {
      const outcome = call.callOutcome || 'unknown';
      acc[outcome] = (acc[outcome] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Quality metrics (from conversation analysis)
    const analyzedCalls = calls.filter(c => c.conversationAnalysis);
    const avgQualityScore = analyzedCalls.length > 0
      ? analyzedCalls.reduce((sum, c) => {
          const analysis = c.conversationAnalysis as any;
          return sum + (analysis?.quality?.score || 0);
        }, 0) / analyzedCalls.length
      : 0;

    // Top performing agents (if multi-user)
    const agentStats = calls.reduce((acc, call) => {
      const userId = call.userId;
      if (!acc[userId]) {
        acc[userId] = {
          calls: 0,
          completedCalls: 0,
          avgDuration: 0,
          totalDuration: 0,
        };
      }
      acc[userId].calls += 1;
      if (call.status === 'COMPLETED') acc[userId].completedCalls += 1;
      acc[userId].totalDuration += call.duration || 0;
      return acc;
    }, {} as Record<string, any>);

    // Calculate avg duration for each agent
    Object.keys(agentStats).forEach(userId => {
      agentStats[userId].avgDuration = 
        agentStats[userId].totalDuration / (agentStats[userId].calls || 1);
    });

    // Call volume by day
    const callsByDay = calls.reduce((acc, call) => {
      const date = new Date(call.createdAt).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Key insights
    const insights = [];
    
    if (sentimentCounts['positive'] > sentimentCounts['negative']) {
      insights.push('Positive sentiment is trending well');
    } else if (sentimentCounts['negative'] > sentimentCounts['positive']) {
      insights.push('Negative sentiment detected - review call quality');
    }

    if (avgDuration < 60000) {
      insights.push('Average call duration is low - consider engagement strategies');
    }

    if (completedCalls / (totalCalls || 1) < 0.5) {
      insights.push('Low call completion rate - investigate technical issues');
    }

    if (outcomeCounts['sale'] > (totalCalls * 0.2)) {
      insights.push('Strong sales performance!');
    }

    return NextResponse.json({
      success: true,
      timeRange,
      summary: {
        totalCalls,
        completedCalls,
        avgDuration: Math.round(avgDuration / 1000), // seconds
        avgQualityScore: Math.round(avgQualityScore),
        analyzedCalls: analyzedCalls.length,
      },
      sentimentDistribution: sentimentCounts,
      outcomeDistribution: outcomeCounts,
      callVolumeByDay: callsByDay,
      agentStats,
      insights,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
