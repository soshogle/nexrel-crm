/**
 * GET /api/admin/twilio-failover/health-check
 * Run health check for Twilio account
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { twilioHealthMonitor } from '@/lib/twilio-failover/health-monitor';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'accountId required' }, { status: 400 });
    }

    const healthCheck = await twilioHealthMonitor.runHealthCheck(accountId);

    return NextResponse.json({
      success: true,
      healthCheck,
    });
  } catch (error: any) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to run health check' },
      { status: 500 }
    );
  }
}
