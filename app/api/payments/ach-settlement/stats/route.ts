
/**
 * ACH Settlement Statistics API
 * GET - Get settlement statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AchSettlementService } from '@/lib/payments/ach-settlement-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await AchSettlementService.getSettlementStats(session.user.id);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching settlement stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settlement statistics' },
      { status: 500 }
    );
  }
}
