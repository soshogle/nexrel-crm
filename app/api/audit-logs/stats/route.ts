
/**
 * Audit Logs Statistics API
 * Provides aggregated security metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { RateLimiters, getClientIdentifier, createRateLimitResponse } from '@/lib/security/rate-limiter';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimitResult = RateLimiters.standard(request, `audit-stats:${clientId}`);
  
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult.resetIn);
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get statistics for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalLogs,
      criticalAlerts,
      failedAttempts,
      recentActivity,
      actionBreakdown,
      severityBreakdown,
    ] = await Promise.all([
      // Total logs
      prisma.auditLog.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      
      // Critical alerts
      prisma.auditLog.count({
        where: {
          severity: 'CRITICAL',
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      
      // Failed attempts
      prisma.auditLog.count({
        where: {
          success: false,
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      
      // Recent activity (last 24 hours)
      prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      
      // Action breakdown
      prisma.auditLog.groupBy({
        by: ['action'],
        _count: true,
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      
      // Severity breakdown
      prisma.auditLog.groupBy({
        by: ['severity'],
        _count: true,
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),
    ]);

    return NextResponse.json({
      period: '30_days',
      stats: {
        totalLogs,
        criticalAlerts,
        failedAttempts,
        recentActivity,
        successRate: totalLogs > 0 
          ? ((totalLogs - failedAttempts) / totalLogs * 100).toFixed(2)
          : 100,
      },
      breakdown: {
        byAction: actionBreakdown.map(item => ({
          action: item.action,
          count: item._count,
        })),
        bySeverity: severityBreakdown.map(item => ({
          severity: item.severity,
          count: item._count,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching audit log stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
