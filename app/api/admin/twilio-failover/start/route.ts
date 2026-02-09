/**
 * POST /api/admin/twilio-failover/start
 * Start failover process
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { twilioFailoverService } from '@/lib/twilio-failover/failover-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId, triggerType } = await request.json();

    if (!accountId || !triggerType) {
      return NextResponse.json(
        { error: 'accountId and triggerType required' },
        { status: 400 }
      );
    }

    const event = await twilioFailoverService.startFailoverProcess(
      accountId,
      triggerType,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      event,
    });
  } catch (error: any) {
    console.error('Start failover error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start failover' },
      { status: 500 }
    );
  }
}
