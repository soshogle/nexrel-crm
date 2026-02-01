import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/tools/health/monitor - Calculate health metrics for all user's tools
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const instances = await prisma.toolInstance.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        actions: {
          where: {
            executedAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
          orderBy: { executedAt: 'desc' },
        },
      },
    });

    const healthMetrics = [];

    for (const instance of instances) {
      if (instance.actions.length === 0) {
        // No recent activity
        const metric = await prisma.toolHealthMetric.create({
          data: {
            userId: session.user.id,
            instanceId: instance.id,
            healthScore: 0,
            availabilityScore: 0,
            performanceScore: 0,
            errorRateScore: 0,
            usageScore: 0,
            hasIssues: true,
            issuesSummary: 'No activity in the last 7 days',
          },
        });
        healthMetrics.push(metric);
        continue;
      }

      // Calculate component scores
      const totalCalls = instance.actions.length;
      const successfulCalls = instance.actions.filter((a: any) => a.success).length;
      const avgResponseTime =
        instance.actions.reduce((sum: number, a: any) => sum + (a.duration || 0), 0) /
        totalCalls;

      const availabilityScore = (successfulCalls / totalCalls) * 100;

      // Performance score based on response time (assuming 1000ms is baseline)
      const performanceScore = Math.max(0, Math.min(100, 100 - (avgResponseTime - 1000) / 50));

      // Error rate score
      const errorRate = 1 - successfulCalls / totalCalls;
      const errorRateScore = Math.max(0, 100 - errorRate * 200);

      // Usage score based on frequency (daily average)
      const usageFrequency = totalCalls / 7; // Per day
      const usageScore = Math.min(100, usageFrequency * 10);

      // Overall health score (weighted average)
      const healthScore =
        availabilityScore * 0.4 +
        performanceScore * 0.3 +
        errorRateScore * 0.2 +
        usageScore * 0.1;

      // Identify issues
      const issues = [];
      if (availabilityScore < 90) issues.push('Low availability');
      if (performanceScore < 70) issues.push('Slow response times');
      if (errorRateScore < 80) issues.push('High error rate');
      if (usageScore < 30) issues.push('Low usage frequency');

      const metric = await prisma.toolHealthMetric.create({
        data: {
          userId: session.user.id,
          instanceId: instance.id,
          healthScore: Math.round(healthScore),
          availabilityScore: Math.round(availabilityScore),
          performanceScore: Math.round(performanceScore),
          errorRateScore: Math.round(errorRateScore),
          usageScore: Math.round(usageScore),
          hasIssues: issues.length > 0,
          issuesSummary: issues.length > 0 ? issues.join(', ') : null,
        },
      });

      healthMetrics.push(metric);

      // Generate recommendations or retirement suggestions
      if (healthScore < 50) {
        // Consider retirement
        const existingRetirement = await prisma.toolRetirement.findFirst({
          where: {
            userId: session.user.id,
            instanceId: instance.id,
            viewed: false,
          },
        });

        if (!existingRetirement) {
          await prisma.toolRetirement.create({
            data: {
              userId: session.user.id,
              instanceId: instance.id,
              reason: `Low health score (${Math.round(healthScore)}/100). Issues: ${issues.join(', ')}`,
              usageStats: {
                last7Days: totalCalls,
                successRate: `${Math.round(availabilityScore)}%`,
                avgResponseTime: `${Math.round(avgResponseTime)}ms`,
              },
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      monitored: instances.length,
      healthMetrics,
    });
  } catch (error: any) {
    console.error('Error monitoring tool health:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to monitor tool health' },
      { status: 500 }
    );
  }
}

// GET /api/tools/health/monitor - Get health metrics for user's tools
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const metrics = await prisma.toolHealthMetric.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        instance: {
          include: {
            definition: {
              select: {
                name: true,
                logoUrl: true,
              },
            },
          },
        },
      },
      orderBy: { recordedAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ success: true, metrics });
  } catch (error: any) {
    console.error('Error fetching health metrics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch health metrics' },
      { status: 500 }
    );
  }
}
