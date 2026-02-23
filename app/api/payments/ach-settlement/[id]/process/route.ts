
/**
 * ACH Settlement Process API
 * POST - Process settlement batch
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AchSettlementService } from '@/lib/payments/ach-settlement-service';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
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

    const result = await AchSettlementService.processSettlement(params.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing settlement:', error);
    return apiErrors.internal(error instanceof Error ? error.message : 'Failed to process settlement');
  }
}
