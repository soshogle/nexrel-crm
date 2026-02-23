/**
 * POST /api/admin/twilio-failover/rollback
 * Rollback failover
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { twilioFailoverService } from '@/lib/twilio-failover/failover-service';
import { apiErrors } from '@/lib/api-error';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return apiErrors.unauthorized();
    }

    const { eventId } = await request.json();

    if (!eventId) {
      return apiErrors.badRequest('eventId required');
    }

    await twilioFailoverService.rollbackFailover(eventId, session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Failover rolled back successfully',
    });
  } catch (error: any) {
    console.error('Rollback error:', error);
    return apiErrors.internal(error.message || 'Failed to rollback failover');
  }
}
