/**
 * POST /api/admin/twilio-failover/rollback
 * Rollback failover
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

    const { eventId } = await request.json();

    if (!eventId) {
      return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    }

    await twilioFailoverService.rollbackFailover(eventId, session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Failover rolled back successfully',
    });
  } catch (error: any) {
    console.error('Rollback error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to rollback failover' },
      { status: 500 }
    );
  }
}
