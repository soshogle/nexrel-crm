
/**
 * BNPL Statistics API
 * GET - Get BNPL statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BnplService } from '@/lib/payments/bnpl-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await BnplService.getBnplStats(session.user.id);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching BNPL stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch BNPL statistics' },
      { status: 500 }
    );
  }
}
