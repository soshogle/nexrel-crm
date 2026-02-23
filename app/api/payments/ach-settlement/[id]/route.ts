
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
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const settlement = await AchSettlementService.getSettlement(params.id);

    if (!settlement) {
      return apiErrors.notFound('Settlement not found');
    }

    if (settlement.userId !== session.user.id) {
      return apiErrors.forbidden();
    }

    return NextResponse.json(settlement);
  } catch (error) {
    console.error('Error fetching settlement:', error);
    return apiErrors.internal('Failed to fetch settlement');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const settlement = await AchSettlementService.getSettlement(params.id);

    if (!settlement) {
      return apiErrors.notFound('Settlement not found');
    }

    if (settlement.userId !== session.user.id) {
      return apiErrors.forbidden();
    }

    const cancelled = await AchSettlementService.cancelSettlement(params.id);

    return NextResponse.json(cancelled);
  } catch (error) {
    console.error('Error cancelling settlement:', error);
    return apiErrors.internal(error instanceof Error ? error.message : 'Failed to cancel settlement');
  }
}
