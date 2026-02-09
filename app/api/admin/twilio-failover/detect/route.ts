/**
 * POST /api/admin/twilio-failover/detect
 * Detect if failover is needed
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { twilioHealthMonitor } from '@/lib/twilio-failover/health-monitor';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json({ error: 'accountId required' }, { status: 400 });
    }

    const detection = await twilioHealthMonitor.detectFailoverNeeded(accountId);

    return NextResponse.json({
      success: true,
      detection,
    });
  } catch (error: any) {
    console.error('Detection error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to detect failover need' },
      { status: 500 }
    );
  }
}
