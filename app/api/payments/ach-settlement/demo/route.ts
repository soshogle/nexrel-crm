
/**
 * ACH Settlement Demo Data API
 * POST - Generate demo settlements
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AchSettlementService } from '@/lib/payments/ach-settlement-service';


export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    return NextResponse.json(
      { error: 'Failed to generate demo settlements' },
      { status: 500 }
    );
  }
}
