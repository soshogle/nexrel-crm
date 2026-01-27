
/**
 * ACH Settlement Detail API
 * GET - Get settlement by ID
 * PATCH - Update settlement
 * DELETE - Cancel settlement
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AchSettlementService } from '@/lib/payments/ach-settlement-service';

export async function GET(
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

    return NextResponse.json(settlement);
  } catch (error) {
    console.error('Error fetching settlement:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settlement' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const cancelled = await AchSettlementService.cancelSettlement(params.id);

    return NextResponse.json(cancelled);
  } catch (error) {
    console.error('Error cancelling settlement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel settlement' },
      { status: 500 }
    );
  }
}
