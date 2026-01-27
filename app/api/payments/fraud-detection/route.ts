
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate demo fraud alerts and stats
    // In production, this would query actual fraud detection data
    const demoAlerts = [
      {
        id: 'alert_1',
        transactionId: 'txn_demo_001',
        customerId: session.user.id,
        riskScore: 85,
        riskLevel: 'HIGH' as const,
        reason: 'Unusual transaction amount for this customer',
        amount: 150000, // $1,500.00
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
        status: 'PENDING' as const,
      },
      {
        id: 'alert_2',
        transactionId: 'txn_demo_002',
        customerId: session.user.id,
        riskScore: 95,
        riskLevel: 'CRITICAL' as const,
        reason: 'Multiple failed payment attempts detected',
        amount: 50000, // $500.00
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
        status: 'PENDING' as const,
      },
      {
        id: 'alert_3',
        transactionId: 'txn_demo_003',
        customerId: session.user.id,
        riskScore: 45,
        riskLevel: 'MEDIUM' as const,
        reason: 'Transaction from new geographic location',
        amount: 25000, // $250.00
        timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(), // 90 min ago
        status: 'REVIEWED' as const,
      },
      {
        id: 'alert_4',
        transactionId: 'txn_demo_004',
        customerId: session.user.id,
        riskScore: 20,
        riskLevel: 'LOW' as const,
        reason: 'Slightly unusual purchase pattern',
        amount: 10000, // $100.00
        timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
        status: 'APPROVED' as const,
      },
      {
        id: 'alert_5',
        transactionId: 'txn_demo_005',
        customerId: session.user.id,
        riskScore: 78,
        riskLevel: 'HIGH' as const,
        reason: 'Velocity check failed - too many transactions in short time',
        amount: 75000, // $750.00
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 min ago
        status: 'PENDING' as const,
      },
    ];

    const stats = {
      totalTransactions: 1247,
      flaggedTransactions: 28,
      blockedTransactions: 5,
      averageRiskScore: 32.4,
      highRiskPercentage: 2.2,
    };

    return NextResponse.json({
      success: true,
      alerts: demoAlerts,
      stats,
    });
  } catch (error) {
    console.error('Error fetching fraud detection data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fraud detection data' },
      { status: 500 }
    );
  }
}
