
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { getCrmDb } from '@/lib/dal';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const isOrthoDemo = String(session.user.email || '').toLowerCase().trim() === 'orthodontist@nexrel.com';

    if (isOrthoDemo) {
      const demoAlerts = [
        {
          id: 'alert_1',
          transactionId: 'txn_demo_001',
          customerId: session.user.id,
          riskScore: 85,
          riskLevel: 'HIGH' as const,
          reason: 'Unusual transaction amount for this customer',
          amount: 150000,
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          status: 'PENDING' as const,
        },
      ];
      return NextResponse.json({
        success: true,
        alerts: demoAlerts,
        stats: {
          totalTransactions: 1247,
          flaggedTransactions: 28,
          blockedTransactions: 5,
          averageRiskScore: 32.4,
          highRiskPercentage: 2.2,
        },
      });
    }

    const [transactionsCount, fraudAlerts, riskScoreAgg, highRiskCount] = await Promise.all([
      getCrmDb(ctx).soshogleTransaction.count({
        where: { customer: { userId: session.user.id } },
      }),
      getCrmDb(ctx).fraudAlert.findMany({
        where: { userId: session.user.id },
        include: {
          transaction: {
            select: {
              id: true,
              amount: true,
              customerId: true,
              createdAt: true,
            },
          },
        },
        orderBy: { detectedAt: 'desc' },
        take: 200,
      }),
      getCrmDb(ctx).fraudAlert.aggregate({
        where: { userId: session.user.id },
        _avg: { riskScore: true },
      }),
      getCrmDb(ctx).fraudAlert.count({
        where: {
          userId: session.user.id,
          riskLevel: { in: ['HIGH', 'CRITICAL'] },
        },
      }),
    ]);

    const mapRiskLevel = (level: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' => {
      if (level === 'VERY_LOW') return 'LOW';
      if (level === 'LOW' || level === 'MEDIUM' || level === 'HIGH' || level === 'CRITICAL') return level;
      return 'MEDIUM';
    };
    const mapStatus = (status: string): 'PENDING' | 'REVIEWED' | 'BLOCKED' | 'APPROVED' => {
      if (status === 'APPROVED') return 'APPROVED';
      if (status === 'DECLINED') return 'BLOCKED';
      if (status === 'PENDING') return 'PENDING';
      return 'REVIEWED';
    };

    const alerts = fraudAlerts.map((alert) => ({
      id: alert.id,
      transactionId: alert.transactionId || alert.transaction?.id || 'n/a',
      customerId: alert.transaction?.customerId || session.user.id,
      riskScore: Number(alert.riskScore || 0),
      riskLevel: mapRiskLevel(String(alert.riskLevel)),
      reason: alert.reason,
      amount: alert.transaction?.amount || 0,
      timestamp: (alert.detectedAt || alert.createdAt).toISOString(),
      status: mapStatus(String(alert.status)),
    }));

    const blockedTransactions = fraudAlerts.filter((a) => a.status === 'DECLINED').length;
    const flaggedTransactions = fraudAlerts.length;
    const averageRiskScore = Number(riskScoreAgg._avg.riskScore || 0);
    const highRiskPercentage = transactionsCount > 0 ? (highRiskCount / transactionsCount) * 100 : 0;

    return NextResponse.json({
      success: true,
      alerts,
      stats: {
        totalTransactions: transactionsCount,
        flaggedTransactions,
        blockedTransactions,
        averageRiskScore,
        highRiskPercentage,
      },
    });
  } catch (error) {
    console.error('Error fetching fraud detection data:', error);
    return apiErrors.internal('Failed to fetch fraud detection data');
  }
}
