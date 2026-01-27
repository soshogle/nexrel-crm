
/**
 * ACH Settlement Process API
 * POST - Process settlement batch
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AchSettlementService } from '@/lib/payments/ach-settlement-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settlement = await AchSettlementService.getSettlement(params.id);

    if (!settlement) {
      return NextResponse.json({ error: 'Settlement not found' }, { status: 404 });
    }

    if (settlement.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await AchSettlementService.processSettlement(params.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing settlement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process settlement' },
      { status: 500 }
    );
  }
}
