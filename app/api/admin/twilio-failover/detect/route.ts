/**
 * POST /api/admin/twilio-failover/detect
 * Detect if failover is needed
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { twilioHealthMonitor } from '@/lib/twilio-failover/health-monitor';
import { apiErrors } from '@/lib/api-error';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return apiErrors.unauthorized();
    }

    const { accountId } = await request.json();

    if (!accountId) {
      return apiErrors.badRequest('accountId required');
    }

    const detection = await twilioHealthMonitor.detectFailoverNeeded(accountId);

    return NextResponse.json({
      success: true,
      detection,
    });
  } catch (error: any) {
    console.error('Detection error:', error);
    return apiErrors.internal(error.message || 'Failed to detect failover need');
  }
}
