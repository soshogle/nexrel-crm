
/**
 * ACH Settlement Demo Data API
 * POST - Generate demo settlements
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AchSettlementService } from '@/lib/payments/ach-settlement-service';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const count = body.count || 5;

    const settlements = await AchSettlementService.generateDemoSettlements(
      session.user.id,
      count
    );

    return NextResponse.json({
      message: `Generated ${settlements.length} demo settlements`,
      settlements,
    }, { status: 201 });
  } catch (error) {
    console.error('Error generating demo settlements:', error);
    return apiErrors.internal('Failed to generate demo settlements');
  }
}
